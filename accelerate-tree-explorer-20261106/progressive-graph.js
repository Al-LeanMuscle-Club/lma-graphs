/* Presentation levels and explicit group choices over the complete frozen graph. */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NanolizeAnythingProgressiveGraph = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  const asSet = values => values instanceof Set ? values : new Set(values || []);
  const intersects = (left, right) => [...left].some(id => right.has(id));
  const ordered = values => [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  function createIndex(displayNodes) {
    const byId = new Map(), children = new Map([[null, []]]), depth = new Map();
    for (const node of displayNodes) {
      if (!node || typeof node.id !== "string" || !node.id || byId.has(node.id))
        throw new Error("Display nodes need unique capability identifiers");
      byId.set(node.id, node);
      children.set(node.id, []);
    }
    for (const node of displayNodes) {
      const parent = node.parent ?? null;
      if (parent !== null && !byId.has(parent)) throw new Error("Unknown capability parent: " + parent);
      if (node.detail && (!byId.has(node.owner) || byId.get(node.owner).detail))
        throw new Error("Function details need a capability owner");
      children.get(parent).push(node.id);
    }
    // Validate the containment backbone iteratively, including very deep trees.
    for (const node of displayNodes) {
      let cursor = node.id;
      const chain = [], seen = new Set();
      while (cursor !== null && !depth.has(cursor)) {
        if (seen.has(cursor)) throw new Error("Capability containment must not contain a cycle");
        seen.add(cursor); chain.push(cursor); cursor = byId.get(cursor).parent ?? null;
      }
      let level = cursor === null ? -1 : depth.get(cursor);
      for (const id of chain.reverse()) depth.set(id, ++level);
    }
    function requireNode(id) {
      const node = byId.get(id);
      if (!node) throw new Error("Unknown capability: " + id);
      return node;
    }
    function descendants(id, {includeSelf = true, details = true} = {}) {
      requireNode(id);
      const result = [], pending = includeSelf ? [id] : [...children.get(id)].reverse();
      while (pending.length) {
        const next = pending.pop(), node = byId.get(next);
        if (details || !node.detail) result.push(next);
        pending.push(...[...children.get(next)].reverse());
      }
      return result;
    }
    function ancestors(id) {
      let cursor = requireNode(id).parent ?? null;
      const result = [];
      while (cursor !== null) {
        result.push(cursor); cursor = byId.get(cursor).parent ?? null;
      }
      return result.reverse();
    }
    const owner = id => requireNode(id).owner || id;
    function members(id) {
      if (requireNode(id).detail) return [owner(id)];
      return descendants(id, {details: false}).filter(next =>
        (byId.get(next).files || []).length || !children.get(next).some(child => !byId.get(child).detail));
    }
    return {byId, children, roots: [...children.get(null)], depth, descendants, ancestors, owner, members};
  }

  function frame(index, {focusId = "", includeDetails = false, page = 0, pageSize = 12,
                          search = "", filter = "all", kept = []} = {}) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw new Error("A graph page must contain between 1 and 100 items");
    if (!Number.isInteger(page) || page < 0) page = 0;
    if (focusId && !index.byId.has(focusId)) throw new Error("Unknown capability focus: " + focusId);
    const selected = asSet(kept), query = String(search).trim().toLowerCase();
    const singleRoot = index.roots.length === 1 ? index.roots[0] : null;
    const contextId = query ? null : focusId || (singleRoot && index.children.get(singleRoot).length ? singleRoot : null);
    const inLevel = contextId ? index.children.get(contextId) : index.roots;
    let candidates = query
      ? [...index.byId.keys()]
      : inLevel.filter(id => includeDetails || !index.byId.get(id).detail);
    candidates = candidates.filter(id => {
      const node = index.byId.get(id);
      if (filter !== "all") {
        const members = index.members(id), selectedCount = members.filter(member => selected.has(member)).length;
        if (filter === "kept" && !selectedCount || filter === "removed" && selectedCount === members.length) return false;
      }
      // Generated function IDs contain their owner's ID, but that alone should
      // not make every function detail a search match for the module's name.
      const searchable = [node.label, node.description, ...(!node.detail ? [id] : [])];
      return !query || searchable.some(text => String(text || "").toLowerCase().includes(query));
    });
    const total = candidates.length, pages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(page, pages - 1);
    const levelIds = candidates.slice(page * pageSize, (page + 1) * pageSize);
    return {contextId, ids: contextId ? [contextId, ...levelIds] : [...levelIds], levelIds, candidateIds: candidates,
      focusId, breadcrumbs: focusId ? [...index.ancestors(focusId), focusId] : [],
      page, pages, total, start: total ? page * pageSize + 1 : 0,
      end: Math.min(total, (page + 1) * pageSize), searching: Boolean(query)};
  }

  function protectedClosure(plan, locked) {
    const byId = new Map(plan.capabilities.map(node => [node.id, node]));
    const protectedIds = new Set(), pending = [...locked, ...plan.capabilities.filter(node => node.required).map(node => node.id)];
    while (pending.length) {
      const id = pending.pop(), node = byId.get(id);
      if (!node || protectedIds.has(id)) continue;
      protectedIds.add(id);
      if (node.parent != null) pending.push(node.parent);
      pending.push(...(node.depends_on || []));
    }
    return protectedIds;
  }

  function summarize(plan, index, id, kept, locked = []) {
    const selected = asSet(kept), members = index.members(id);
    const subtree = index.descendants(id, {details: false});
    const target = new Set(subtree);
    const protectedIds = protectedClosure(plan, [...locked, ...[...selected].filter(next => !target.has(next))]);
    const files = new Set(subtree.flatMap(next => index.byId.get(next).files || []));
    const keptCount = members.filter(member => selected.has(member)).length;
    let lines = 0, unknownFiles = 0, tokens = 0, unknownTokens = 0;
    for (const path of files) {
      const value = plan.inventory?.[path]?.lines;
      if (Number.isFinite(value) && value >= 0) lines += value; else unknownFiles++;
      const tokenValue = plan.size_measurement?.inventory?.[path]?.tokens;
      if (Number.isSafeInteger(tokenValue) && tokenValue >= 0) tokens += tokenValue; else unknownTokens++;
    }
    return {state: keptCount === members.length ? "all" : keptCount ? "some" : "none",
      checked: keptCount === members.length, indeterminate: keptCount > 0 && keptCount < members.length,
      kept: keptCount, total: members.length, protectedCount: members.filter(member => protectedIds.has(member)).length,
      protectedIds: subtree.filter(next => protectedIds.has(next)),
      descendantCount: subtree.filter(next => next !== id).length,
      ...(plan.size_measurement?.metric === "tokens" ? {tokens: unknownTokens ? null : tokens} : {}),
      lines: unknownFiles ? null : lines, knownLines: lines, files: ordered(files), unknownFiles};
  }

  function selectGroup(plan, index, requested, id, keep, engine = root.NanolizeAnythingPlanner) {
    if ((requested.scopePolicy ?? plan.scope_policy) !== "explicit" || (requested.mode ?? plan.mode) !== "rewrite")
      throw new Error("Historical plans cannot change their selected scope");
    if (typeof keep !== "boolean") throw new Error("A group choice must be keep or remove");
    if (index.byId.get(id)?.detail) throw new Error("Function details follow their owning module");
    const target = new Set(index.descendants(id, {details: false}));
    if (!engine) throw new Error("The complete capability planner is required for a group choice");
    const before = engine.planCapabilities(plan, requested), graph = engine.graph(plan);
    const locked = [...(requested.locked ?? plan.locked ?? [])];
    const originalExcluded = [...(requested.excluded ?? plan.excluded ?? [])];
    const protectedIds = graph.keepClosure([...locked, ...plan.capabilities.filter(node => node.required).map(node => node.id),
      ...(!keep ? before.selection.kept.filter(next => !target.has(next)) : [])]);
    const byDepth = ids => [...ids].sort((a, b) => index.depth.get(a) - index.depth.get(b) || engine.compare(a, b));
    const excluded = new Set(originalExcluded);
    if (keep) {
      const needed = graph.keepClosure(target);
      for (const exclusion of excluded) if (intersects(graph.removeClosure([exclusion]), needed)) excluded.delete(exclusion);
      // Preserve explicit choices and the containment scopes they represented.
      // Automatically removed reverse dependents are not user exclusions: once
      // their dependency returns, they must be allowed to return naturally.
      const preserveRemoved = new Set(originalExcluded.flatMap(exclusion =>
        index.descendants(exclusion, {details: false})).filter(next => !needed.has(next)));
      const mustKeep = new Set([...protectedIds, ...needed]);
      let removed = graph.removeClosure(excluded);
      // If an ancestor was excluded, keep its unrelated branches excluded while
      // reopening only this group's required scope. Existing pins stay intact.
      for (const other of byDepth(preserveRemoved)) {
        if (removed.has(other)) continue;
        const closure = graph.removeClosure([other]);
        if (!intersects(closure, mustKeep)) {
          excluded.add(other);
          removed = new Set([...removed, ...closure]);
        }
      }
    } else {
      let removed = graph.removeClosure(excluded);
      for (const next of byDepth(target)) {
        if (removed.has(next)) continue;
        const closure = graph.removeClosure([next]);
        if (!intersects(closure, protectedIds)) {
          excluded.add(next);
          removed = new Set([...removed, ...closure]);
        }
      }
    }
    const choices = {locked: ordered(new Set(locked)), excluded: ordered(excluded)};
    // Recompute the full graph, including cross-group dependents and shared files.
    const after = engine.planCapabilities(plan, {...requested, ...choices});
    const beforeKept = new Set(before.selection.kept), afterKept = new Set(after.selection.kept);
    const changedIds = plan.capabilities.map(node => node.id).filter(next => beforeKept.has(next) !== afterKept.has(next));
    return {...choices, protectedIds: ordered([...target].filter(next => protectedIds.has(next))),
      protectedCount: index.members(id).filter(next => protectedIds.has(next)).length,
      changedIds, affectedOutside: changedIds.filter(next => !target.has(next))};
  }

  function projectRelations(index, visibleIds, edges) {
    const visible = asSet(visibleIds), projected = new Map();
    function representative(id) {
      let cursor = id;
      while (index.byId.has(cursor)) {
        if (visible.has(cursor)) return cursor;
        cursor = index.byId.get(cursor).parent;
      }
      return null;
    }
    for (const edge of edges) {
      const source = representative(edge.source), target = representative(edge.target);
      if (!source || !target || source === target) continue;
      const key = JSON.stringify([source, target, edge.kind, Boolean(edge.advisory)]);
      if (!projected.has(key)) projected.set(key, {...edge, source, target, count: 0,
        aggregated: false, evidenceTags: [], members: [], identities: new Set()});
      const result = projected.get(key), identity = JSON.stringify([edge.source, edge.target, edge.kind, Boolean(edge.advisory)]);
      if (result.identities.has(identity)) continue;
      result.identities.add(identity); result.count++;
      result.members.push({source: edge.source, target: edge.target});
      result.aggregated ||= source !== edge.source || target !== edge.target || result.count > 1;
      result.evidenceTags = ordered(new Set([...result.evidenceTags, ...(edge.evidenceTags || [edge.evidence]).filter(Boolean)]));
    }
    return [...projected.values()].map(({identities, ...edge}) => edge);
  }

  return {createIndex, frame, summarize, selectGroup, projectRelations};
});
