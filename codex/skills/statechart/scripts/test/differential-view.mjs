import view from "./view.json" with { type: "json" };

const { vars, actions, labels, regions, steps, groups, title } = view;
const palette = ["blue", "orange", "purple", "yellow"];
const stepLabels = new Map(
  actions.map((action, k) => [action, steps && k < steps.length ? steps[k] : action]),
);

function pick(value, salt, choices = labels) {
  let hash = salt;
  for (const char of JSON.stringify(value) ?? "") hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return choices[hash % choices.length];
}

export function state(v) {
  switch (view.form) {
    case "string":
      return pick(vars.map((name) => v[name]), 0);
    case "parents":
      return [pick(v[vars[0]], 1), pick(vars.map((name) => v[name]), 2)];
    case "regions":
      return Object.fromEntries(
        regions.map((region, k) => [region, pick(v[vars[k % vars.length]], k)]),
      );
  }
}

export const step = (action) => stepLabels.get(action);
export const colors = Object.fromEntries((groups ?? []).map((group, k) => [group, palette[k]]));
export const group = (v) => pick(v[vars[0]], 3, groups);
export { title };
