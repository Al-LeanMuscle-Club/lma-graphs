(async function () {
  "use strict";
  const response = await fetch("verification-detail.json");
  if (!response.ok) throw new Error("Unable to load the recorded test observations");
  const evidence = await response.json();
  const make = (tag, text, cls) => {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (cls) element.className = cls;
    return element;
  };
  const pct = value => value == null ? "Not measured" : value.toFixed(1) + "%";
  const summary = evidence.summary;
  const formatting = make("style");
  formatting.textContent = ".observed-run-info{padding:20px;box-sizing:border-box}.observed-run-info h4{margin:20px 0 10px}.observed-run-info table{width:100%;table-layout:fixed;border-collapse:collapse}.observed-run-info th,.observed-run-info td{padding:8px;border:1px solid #e4e5eb;text-align:left;vertical-align:top;overflow-wrap:anywhere;font-size:11px;line-height:1.6}.observed-run-info details{margin-top:16px}.observed-run-info summary{cursor:pointer;font-weight:600}.observed-run-info li{font-size:12px;line-height:1.7;margin:7px 0;overflow-wrap:anywhere}";
  formatting.textContent += ".observed-limitations{margin:0 0 24px;padding:14px 18px;border:1px solid #e7cf9e;border-radius:10px;background:#fff9ed;color:#694b18;font-size:12px;line-height:1.7}.observed-limitations strong{font-weight:650}.observed-run-info>summary{padding:0;font-size:13px}.observed-run-info[open]>summary{margin-bottom:18px}.report-stat>.observed-line-total{font-size:16px;margin-top:8px}";
  document.head.append(formatting);
  const panel = make("section", null, "report-summary observed-test-summary");
  panel.setAttribute("aria-label", "Independent comparison results");
  const cards = [
    ["Requested functional scope", evidence.scope.functional_modules + " modules", "No authorized feature exclusions. Actual behavior is subject to the recorded verification."],
    ["Test × environment pass rate", pct(summary.pass_rate_executed), summary.passed + " passed / " + (summary.passed + summary.failed) + " conclusive candidate comparisons whose original baseline passed; " + summary.distinct_upstream_tests + " distinct upstream tests across all observations"],
    ["Eligible-observation execution coverage", pct(summary.execution_coverage), summary.unverified + " unverified; " + summary.baseline_not_passed + " without a passing original baseline"],
    ["Modules with associated upstream tests", evidence.scope.modules_with_comparable_checks + " / " + evidence.scope.functional_modules, evidence.scope.modules_without_comparable_checks + " modules have no mapped test with a passing original baseline. These associations are context, not direct failure attribution or full feature coverage."]
  ];
  if (evidence.source_measurement) {
    const size = evidence.source_measurement;
    cards.push(["Measured production source", pct(size.reduction_percent) + " reduction", "Requested reduction >" + (100 - size.target_retain_percent) + "% (retained source <" + size.target_retain_percent + "%). Strict source target " + (size.strict_requested_source_target_met ? "met" : "not met") + ". JSON/YAML resources outside the production-source denominator are excluded from this source-only reduction.", size.before.toLocaleString("en-US") + " → " + size.after.toLocaleString("en-US") + " lines"]);
  }
  if (evidence.source_and_resource_measurement) {
    const combined = evidence.source_and_resource_measurement;
    cards.push(["Production source + non-source resources", pct(combined.reduction_percent) + " reduction", "Non-source declarative resources: " + combined.original_non_source_resource_lines.toLocaleString("en-US") + " → " + combined.candidate_non_source_resource_lines.toLocaleString("en-US") + " lines. Neither size measure establishes retained functionality.", combined.before.toLocaleString("en-US") + " → " + combined.after.toLocaleString("en-US") + " lines"]);
  }
  for (const [label, value, note, lines] of cards) {
    const card = make("div", null, "report-stat");
    card.append(make("span", label), make("strong", value));
    if (lines) card.append(make("strong", lines, "observed-line-total"));
    card.append(make("p", note));
    panel.append(card);
  }
  document.querySelector(".report-summary").after(panel);
  const warning = make("aside", null, "observed-limitations");
  warning.setAttribute("aria-label", "Implementation and verification limitations");
  warning.append(make("strong", "Implementation remains incomplete. "));
  warning.append(document.createTextNode("All " + evidence.scope.functional_modules + " modules remain required; " + evidence.scope.modules_with_comparable_checks + "/" + evidence.scope.functional_modules + " have associated upstream tests. " + (evidence.metadata.known_module_gaps || []).length + " known implementation and verification gaps are recorded. Native execution remains blocked by incomplete coverage."));
  const failedModels = (evidence.metadata.model_comparisons || []).filter(model => [model.checkpoint_schema, model.inference].some(status => ["failed", "error", "timeout"].includes(status)));
  if (failedModels.length) warning.append(document.createTextNode(" " + failedModels.length + " fixed-state model comparison" + (failedModels.length === 1 ? " has" : "s have") + " a failure, reported separately from upstream-test rates."));
  panel.after(warning);
  const info = make("details", null, "report-methodology observed-run-info");
  info.append(make("summary", "Run details, model comparisons, configuration resources and known gaps"));
  info.append(make("h3", "Independent rewrite run"));
  info.append(make("p", "Native execution readiness is blocked by incomplete coverage. These are independent frozen-check observations; no native verification-success record or complete implementation claim is made."));
  for (const key of ["title", "method", "outcome", "limitations"]) {
    const value = evidence.metadata[key];
    if (value) info.append(make("p", Array.isArray(value) ? value.join(" ") : value));
  }
  for (const [label, key] of [["Rewritten code branch", "branch_url"], ["Harness branch", "harness_url"]]) {
    const url = evidence.metadata[key];
    if (typeof url === "string" && url.startsWith("https://github.com/")) {
      const paragraph = make("p"), link = make("a", label);
      link.href = url; link.rel = "noopener noreferrer"; paragraph.append(link); info.append(paragraph);
    }
  }
  const models = evidence.metadata.model_comparisons;
  if (models?.length) {
    info.append(make("h4", "Fixed-original-state model comparisons"));
    info.append(make("p", "These observations use one frozen original model state and one fixed CPU input per model. They are separate from upstream-test totals and do not establish full checkpoint or numerical equivalence."));
    const table = make("table"), header = make("tr");
    for (const label of ["Model", "Checkpoint schema", "Fixed CPU inference", "Candidate binding"]) header.append(make("th", label));
    const head = make("thead"); head.append(header); table.append(head);
    const body = make("tbody");
    for (const model of models) {
      const row = make("tr");
      for (const value of [model.model, model.checkpoint_schema, model.inference, model.candidate_binding_verified && model.original_fixture_identified ? "Matches report candidate and identifies frozen fixture" : "Unverified"]) row.append(make("td", value));
      body.append(row);
      if (model.rtol != null || model.atol != null) info.append(make("p", model.model + " tolerances: relative " + (model.rtol ?? "not supplied") + ", absolute " + (model.atol ?? "not supplied") + "."));
    }
    table.append(body); info.append(table);
    for (const item of evidence.unmapped_model_checks || []) info.append(make("p", "No unique reviewed graph association is available for " + item.model + "; its model observation remains visible here and is not assigned to a guessed capability."));
  }
  const volume = evidence.metadata.configuration_volume;
  const configuration = evidence.metadata.configuration_comparison;
  if (configuration) {
    info.append(make("h4", "Generated configuration deduplication regression"));
    info.append(make("p", configuration.status + ": " + configuration.checks_passed + "/" + configuration.checks_total + " API checks passed; " + configuration.checks_failed + " failed; " + configuration.checks_blocked + " blocked. " + configuration.recipe_checks_passed + "/" + configuration.recipes_total + " recipe results passed, plus " + configuration.defaults_total + " default-config outputs checked."));
    info.append(make("p", "Typed values, mapping order, callable targets and fresh-copy isolation were compared between installed generated candidates. Baseline revision " + configuration.baseline_candidate_git_head.slice(0, 12) + "; final revision " + configuration.candidate_git_head.slice(0, 12) + ". Candidate binding: " + (configuration.candidate_binding_verified ? "matches this report" : "unverified") + "."));
    info.append(make("p", "This is a packaging/configuration regression check against the pre-dedup generated rewrite, not original Detectron2 equivalence. These checks are separate from upstream-test counts and rates."));
  }
  if (volume) {
    info.append(make("h4", "Declarative configuration resources"));
    for (const phase of ["original", "candidate"]) {
      const values = volume[phase];
      if (!values) continue;
      info.append(make("p", phase + ": " + [values.files == null ? null : values.files + " files", values.bytes == null ? null : values.bytes + " bytes", values.physical_lines == null ? null : values.physical_lines + " physical lines"].filter(x => x != null).join(", ") + "."));
      if (values.non_source_physical_lines != null) info.append(make("p", phase + " configuration lines outside the production-source denominator: " + values.non_source_physical_lines + "."));
    }
    if (volume.method) info.append(make("p", volume.method));
    if (volume.limitations) info.append(make("p", volume.limitations));
    info.append(make("p", "Configuration resources are measured separately. Python configurations may already be included in production-source counts; these totals are not additive. JSON normalization is a representation change, not evidence that configuration functionality disappeared."));
  }
  if (evidence.metadata.known_module_gaps?.length) {
    const gaps = make("details");
    gaps.append(make("summary", "Known implementation and verification gaps (" + evidence.metadata.known_module_gaps.length + ")"));
    const list = make("ul");
    for (const gap of evidence.metadata.known_module_gaps) list.append(make("li", (gap.label ? gap.label + ": " : "") + gap.gap));
    gaps.append(list); info.append(gaps);
  }
  const details = make("details");
  details.append(make("summary", "How test rates are calculated"));
  for (const text of evidence.methodology) details.append(make("p", text));
  info.append(details); document.querySelector(".editor-grid").after(info);
  for (const [name, values] of Object.entries(evidence.environments || {})) {
    info.append(make("p", name + ": " + values.passed + " passed, " + values.failed + " failed, " + values.unverified + " unverified among " + values.baseline_passed + " tests with a passing original baseline (" + pct(values.pass_rate_executed) + " executed-test pass rate)."));
  }
  const reportDetail = document.getElementById("report-detail");
  function annotate() {
    const id = reportDetail.dataset.reportNode;
    const data = evidence.nodes[id];
    const related = evidence.related_nodes?.[id];
    if (!data || reportDetail.querySelector(".observed-case-detail")) return;
    const section = make("section", null, "report-block observed-case-detail");
    section.append(make("h3", "Directly attributed upstream checks"));
    section.append(make("p", data.mapped_tests ? data.passed + " passed · " + data.failed + " failed · " + data.unverified + " unverified" : "No upstream cases have been directly attributed to this node; related evidence does not set its badge."));
    section.append(make("p", "Executed-observation pass rate: " + pct(data.pass_rate_executed) + " among original-baseline-passing cases. Eligible-observation execution coverage: " + pct(data.execution_coverage) + "."));
    if (data.baseline_not_passed) section.append(make("p", data.baseline_not_passed + " cases lack a passing original baseline and are excluded from the comparison rate."));
    section.append(make("p", data.distinct_upstream_tests + " directly attributed upstream tests. These finite checks do not establish complete module behavior."));
    section.append(make("p", "A red node means its directly attributed test subject failed. Imported helpers, ancestors and function steps do not inherit failure. This identifies the tested behavior, not its internal root cause."));
    if (related && related.mapped_tests) {
      const context = make("details");
      context.append(make("summary", "Related and descendant observations — context only"));
      context.append(make("p", related.passed + " passed · " + related.failed + " failed · " + related.unverified + " unverified among " + related.baseline_passed + " eligible observations. These counts do not determine this module's badge."));
      section.append(context);
    }
    const gaps = (evidence.metadata.known_module_gaps || []).filter(gap => gap.capability_id === id);
    if (gaps.length) {
      section.append(make("h4", "Known capability gaps"));
      const list = make("ul");
      for (const gap of gaps) list.append(make("li", gap.gap));
      section.append(list);
    }
    const tabs = reportDetail.querySelector(".report-tabs");
    if (tabs) tabs.after(section); else reportDetail.append(section);
  }
  new MutationObserver(annotate).observe(reportDetail, { childList: true });
  annotate();
  window.NanolizeObservedTests = evidence;
})().catch(error => {
  console.error(error);
  const notice = document.createElement("p");
  notice.textContent = "Individual test observations could not be loaded. The versioned graph evidence below remains available.";
  document.querySelector(".overview").after(notice);
});
