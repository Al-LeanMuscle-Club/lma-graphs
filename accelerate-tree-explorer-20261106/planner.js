/* Deterministic planning on the backend's frozen inventory; no source execution. */
(function (root) {
  "use strict";
  function compare(a, b) {
    const aa = Array.from(a), bb = Array.from(b);
    for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
      const delta = aa[i].codePointAt(0) - bb[i].codePointAt(0);
      if (delta) return delta;
    }
    return aa.length - bb.length;
  }
  const ordered = values => Array.from(values).sort(compare);

  // Token counts are frozen by Python. The browser never tokenizes code.
  const usesTokens = plan => plan.size_measurement?.metric === "tokens";
  const budgetValue = (plan, value) => usesTokens(plan) ? value.total_tokens : value.source_lines;
  const fileCost = (plan, path) => usesTokens(plan)
    ? (plan.size_measurement.inventory[path]?.tokens || 0) : plan.inventory[path].lines;
  const sizeUnit = plan => usesTokens(plan) ? "tokens" : "lines";

  function graph(plan) {
    const nodes = new Map(plan.capabilities.map(node => [node.id, node]));
    const prerequisites = node => [...(node.depends_on || []),
      ...(node.parent !== null && node.parent !== undefined ? [node.parent] : [])];
    const children = new Map(), reverse = new Map(Array.from(nodes.keys(), id => [id, []]));
    for (const node of nodes.values()) {
      if (!children.has(node.parent)) children.set(node.parent, []);
      children.get(node.parent).push(node.id);
      for (const dependency of prerequisites(node)) reverse.get(dependency).push(node.id);
    }
    // Iterative SCC discovery makes mutually dependent capabilities atomic.
    const visited = new Set(), order = [];
    for (const id of nodes.keys()) {
      if (visited.has(id)) continue;
      const pending = [[id, false]];
      while (pending.length) {
        const [next, finished] = pending.pop();
        if (finished) { order.push(next); continue; }
        if (visited.has(next)) continue;
        visited.add(next); pending.push([next, true]);
        for (const dep of prerequisites(nodes.get(next))) if (!visited.has(dep)) pending.push([dep, false]);
      }
    }
    const components = new Map(), assigned = new Set();
    for (const id of order.reverse()) {
      if (assigned.has(id)) continue;
      const component = [], pending = [id];
      while (pending.length) {
        const next = pending.pop();
        if (assigned.has(next)) continue;
        assigned.add(next); component.push(next); pending.push(...reverse.get(next));
      }
      for (const member of component) components.set(member, component);
    }
    const groupCache = new Map();
    function removalGroup(id) {
      if (groupCache.has(id)) return groupCache.get(id);
      const removed = new Set(), pending = [id];
      while (pending.length) {
        const next = pending.pop();
        if (removed.has(next)) continue;
        removed.add(next);
        pending.push(...(children.get(next) || []), ...components.get(next));
      }
      groupCache.set(id, removed);
      return removed;
    }
    return {
      nodes,
      keepClosure(seeds) {
        const found = new Set(), pending = Array.from(seeds);
        while (pending.length) {
          const id = pending.pop(), node = nodes.get(id);
          if (!node) throw new Error("Unknown capability: " + id);
          if (found.has(id)) continue;
          found.add(id);
          if (node.parent !== null && node.parent !== undefined) pending.push(node.parent);
          pending.push(...(node.depends_on || []));
        }
        return found;
      },
      removeClosure(seeds, within = new Set(nodes.keys())) {
        const removed = new Set(seeds);
        let changed = true;
        while (changed) {
          changed = false;
          for (const node of nodes.values()) {
            if (!within.has(node.id) || removed.has(node.id)) continue;
            if (removed.has(node.parent) || (node.depends_on || []).some(id => removed.has(id))) {
              removed.add(node.id);
              changed = true;
            }
          }
        }
        return new Set(Array.from(removed).filter(id => within.has(id)));
      },
      automaticRemoval(id, within) {
        const removed = new Set(Array.from(removalGroup(id)).filter(next => within.has(next)));
        // An automatic choice may remove its subtree, but must not consume
        // independent features merely because they share a dependency.
        for (const next of removed) {
          for (const consumer of reverse.get(next)) {
            if (within.has(consumer) && !removed.has(consumer)) return null;
          }
        }
        return removed;
      }
    };
  }

  function scopePreset(plan, preset) {
    if (!["core", "all"].includes(preset)) throw new Error("Scope preset must be core or all");
    const core = graph(plan).keepClosure(plan.capabilities.filter(node => node.required).map(node => node.id));
    return {locked: [], excluded: preset === "all" ? [] : ordered(plan.capabilities.map(node => node.id).filter(id => !core.has(id)))};
  }

  function classifyChecks(checks, kept) {
    const selected = new Set(kept), groups = {retained: [], retired: [], needs_adaptation: []};
    for (const check of checks || []) {
      const ids = check.capabilities || [];
      const count = ids.filter(id => selected.has(id)).length;
      const group = count === ids.length ? "retained" : count === 0 ? "retired" : "needs_adaptation";
      groups[group].push(check);
    }
    return groups;
  }

  function buildStages(plan, locked = [], excluded = [], mode = plan.mode || "prune", scopePolicy = plan.scope_policy || null) {
    if (!["prune", "rewrite"].includes(mode)) throw new Error("Mode must be prune or rewrite");
    if (![null, "explicit"].includes(scopePolicy)) throw new Error("Unknown scope policy");
    const explicitScope = scopePolicy === "explicit";
    if (explicitScope && mode !== "rewrite") throw new Error("Explicit graph scope requires rewrite mode");
    if (mode === "rewrite" && !explicitScope && excluded.length) throw new Error("Rewrite mode retains all capabilities; exclusions are not allowed");
    const relationships = graph(plan), {nodes} = relationships;
    for (const id of [...locked, ...excluded]) {
      if (!nodes.has(id)) throw new Error("Unknown capability: " + id);
    }
    const protectedNodes = relationships.keepClosure([
      ...Array.from(nodes.values()).filter(node => node.required).map(node => node.id), ...locked
    ]);
    if (mode === "rewrite" && !explicitScope) for (const id of nodes.keys()) protectedNodes.add(id);
    const removed = relationships.removeClosure(excluded);
    const conflicts = ordered(Array.from(removed).filter(id => protectedNodes.has(id)));
    if (conflicts.length) {
      throw new Error("Exclusion conflicts with core or pinned capabilities: " + conflicts.join(", "));
    }
    const kept = new Set(Array.from(nodes.keys()).filter(id => !removed.has(id)));
    const understanding = plan.understanding || plan.manifest.understanding;
    const importedGroups = new Set((understanding?.nodes || [])
      .filter(item => ["community", "group"].includes(item.kind) && !(nodes.get(item.capability_id).files || []).length)
      .map(item => item.capability_id));
    function retireEmptyGroups() {
      const retired = new Set();
      if (mode === "rewrite" && !explicitScope) return retired;
      let changed = true;
      while (changed) {
        changed = false;
        for (const id of ordered(importedGroups)) {
          if (!kept.has(id) || protectedNodes.has(id)) continue;
          const consumed = Array.from(kept).some(other => {
            const node = nodes.get(other);
            return node.parent === id || (node.depends_on || []).includes(id);
          });
          if (!consumed) { kept.delete(id); retired.add(id); changed = true; }
        }
      }
      return retired;
    }
    for (const id of retireEmptyGroups()) removed.add(id);
    const protectedFiles = new Set(plan.protected_files || []), owners = new Map();
    for (const id of kept) for (const path of nodes.get(id).files || []) owners.set(path, (owners.get(path) || 0) + 1);
    function stage(selection, removedNow, reason) {
      const retainedFiles = new Set(plan.protected_files || []);
      for (const id of selection) for (const path of nodes.get(id).files || []) retainedFiles.add(path);
      const sourceLines = Array.from(retainedFiles).reduce((n, path) => n + plan.inventory[path].lines, 0);
      const tokenCounts = usesTokens(plan) ? {
        source_tokens: Array.from(retainedFiles).reduce((n, path) => n + fileCost(plan, path), 0),
        configuration_tokens: plan.size_measurement.configuration_tokens
      } : null;
      if (tokenCounts) tokenCounts.total_tokens = tokenCounts.source_tokens + tokenCounts.configuration_tokens;
      return {
        ...(tokenCounts || {}),
        ...(tokenCounts ? {source_retained_percent: plan.baseline.source_lines ? sourceLines * 100 / plan.baseline.source_lines : 100} : {}),
        kept: ordered(selection), removed: ordered(Array.from(nodes.keys()).filter(id => !selection.has(id))),
        retained_files: ordered(retainedFiles), source_lines: sourceLines, source_files: retainedFiles.size,
        retained_percent: tokenCounts ? (plan.baseline.total_tokens ? tokenCounts.total_tokens * 100 / plan.baseline.total_tokens : 100)
          : plan.baseline.source_lines ? sourceLines * 100 / plan.baseline.source_lines : 100,
        removed_now: ordered(removedNow), reason
      };
    }
    const steps = [stage(kept, removed, explicitScope
      ? "Selected capabilities are fixed; the source target applies only to their new implementation"
      : mode === "rewrite"
      ? "All capabilities remain required; the source target applies to the new implementation"
      : "Initial selection; unmapped source remains protected")];
    while (!explicitScope && kept.size > protectedNodes.size) {
      let best = null;
      for (const id of kept) {
        if (protectedNodes.has(id)) continue;
        const removal = relationships.automaticRemoval(id, kept);
        if (removal === null) continue;
        if (Array.from(removal).some(item => protectedNodes.has(item))) continue;
        const removedOwners = new Map();
        for (const member of removal) {
          for (const path of nodes.get(member).files || []) removedOwners.set(path, (removedOwners.get(path) || 0) + 1);
        }
        let freed = 0;
        for (const [path, amount] of removedOwners) {
          if (!protectedFiles.has(path) && owners.get(path) === amount) freed += fileCost(plan, path);
        }
        const depth = nodes.get(id).depth;
        if (best === null || depth > best.depth || (depth === best.depth &&
          (freed > best.freed || (freed === best.freed && compare(id, best.id) < 0)))) {
          best = {id, depth, freed, removal};
        }
      }
      if (best === null) break;
      for (const id of best.removal) {
        kept.delete(id);
        for (const path of nodes.get(id).files || []) owners.set(path, owners.get(path) - 1);
      }
      for (const id of retireEmptyGroups()) best.removal.add(id);
      steps.push(stage(kept, best.removal, "Remove optional capability " + best.id));
    }
    return {steps, protected: ordered(protectedNodes)};
  }

  function planCapabilities(plan, options = {}, preparedStages = null) {
    const mode = options.mode === undefined ? plan.mode || "prune" : options.mode;
    const scopePolicy = options.scopePolicy === undefined ? plan.scope_policy || null : options.scopePolicy;
    const explicitScope = scopePolicy === "explicit";
    if (!["prune", "rewrite"].includes(mode)) throw new Error("Mode must be prune or rewrite");
    if (![null, "explicit"].includes(scopePolicy)) throw new Error("Unknown scope policy");
    if (explicitScope && mode !== "rewrite") throw new Error("Explicit graph scope requires rewrite mode");
    const retainPercent = options.retainPercent === undefined ? plan.retain_percent : options.retainPercent;
    if (typeof retainPercent !== "number" || !Number.isFinite(retainPercent) || retainPercent < 0 || retainPercent > 100) {
      throw new Error("Retention must be between 0 and 100 percent");
    }
    if (mode === "rewrite" && retainPercent === 0) throw new Error("Rewrite source target must be greater than 0 percent");
    const locked = ordered(new Set(options.locked === undefined ? plan.locked || [] : options.locked));
    const excluded = ordered(new Set(options.excluded === undefined ? plan.excluded || [] : options.excluded));
    if (mode === "rewrite" && !explicitScope && excluded.length) throw new Error("Rewrite mode retains all capabilities; exclusions are not allowed");
    const stages = mode === "rewrite" ? buildStages(plan, locked, excluded, mode, scopePolicy)
      : preparedStages || buildStages(plan, locked, excluded, mode, scopePolicy);
    const rawBudget = budgetValue(plan, plan.baseline) * retainPercent / 100;
    const budget = usesTokens(plan) ? Math.floor(rawBudget) : rawBudget;
    const found = stages.steps.findIndex(step => budgetValue(plan, step) <= budget);
    const step = explicitScope ? 0 : found < 0 ? stages.steps.length - 1 : found;
    const selection = {...stages.steps[step], step};
    const minimum = stages.steps[stages.steps.length - 1];
    const checks = classifyChecks(plan.manifest.checks || [], selection.kept);
    const covered = new Set(checks.retained.flatMap(check => check.capabilities || []));
    return {
      status: mode === "rewrite" ? "rewrite_planned" : found < 0 ? "budget_unreachable" : "planned",
      mode, retain_percent: retainPercent, locked, excluded,
      ...(explicitScope ? {scope_policy: "explicit"} : {}),
      ...((mode === "rewrite" || usesTokens(plan)) ? {source_budget: {kind: mode === "rewrite" ? "rewrite_target" : "selection_estimate", target_percent: retainPercent,
        ...(mode === "rewrite" ? {target_lines: plan.baseline.source_lines * retainPercent / 100, actual_lines: null} : {}),
        ...(usesTokens(plan) ? {metric: "tokens", tokenizer: plan.baseline.tokenizer, baseline_tokens: plan.baseline.total_tokens,
          target_tokens: budget, estimate_only: true} : {})}} : {}),
      steps: stages.steps, selection, protected: stages.protected,
      minimum: {...(usesTokens(plan) ? {source_tokens: minimum.source_tokens, configuration_tokens: minimum.configuration_tokens,
        total_tokens: minimum.total_tokens, source_retained_percent: minimum.source_retained_percent} : {}),
        source_lines: minimum.source_lines, retained_percent: minimum.retained_percent, kept: minimum.kept},
      checks,
      unverified_capabilities: selection.kept.filter(id => {
        const node = plan.capabilities.find(item => item.id === id);
        return (node.files || []).length > 0 && !covered.has(id);
      })
    };
  }

  const api = {scopePreset, usesTokens, budgetValue, fileCost, sizeUnit, compare, graph, classifyChecks, buildStages, planCapabilities};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NanolizeAnythingPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
