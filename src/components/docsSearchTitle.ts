export type MatchLevel = "full" | "partial" | "none";

export const HIERARCHY_LEVELS_DEEPEST_FIRST = [
  "lvl6",
  "lvl5",
  "lvl4",
  "lvl3",
  "lvl2",
  "lvl1",
] as const;
export const HIERARCHY_LEVELS_EARLIEST_FIRST = [
  "lvl1",
  "lvl2",
  "lvl3",
  "lvl4",
  "lvl5",
  "lvl6",
] as const;

export type HierarchyLevel = (typeof HIERARCHY_LEVELS_EARLIEST_FIRST)[number];

type HighlightEntry = {
  matchLevel?: MatchLevel;
};

export type DocsSearchTitleHit = {
  hierarchy?: Partial<Record<HierarchyLevel, string>>;
  _highlightResult?: {
    hierarchy?: Partial<Record<HierarchyLevel, HighlightEntry>>;
  };
};

export const getDeepestHierarchyLevel = (hit: DocsSearchTitleHit) => {
  return HIERARCHY_LEVELS_DEEPEST_FIRST.find((level) => Boolean(hit.hierarchy?.[level])) ?? null;
};

export const getFullMatchTitleAttribute = (hit: DocsSearchTitleHit) => {
  return (
    HIERARCHY_LEVELS_EARLIEST_FIRST.find(
      (level) => hit._highlightResult?.hierarchy?.[level]?.matchLevel === "full",
    ) ?? null
  );
};

export const getPreferredTitleText = (hit: DocsSearchTitleHit) => {
  const fullMatchAttribute = getFullMatchTitleAttribute(hit);

  if (fullMatchAttribute) {
    return hit.hierarchy?.[fullMatchAttribute] ?? "";
  }

  const deepestHierarchyLevel = getDeepestHierarchyLevel(hit);

  if (deepestHierarchyLevel) {
    return hit.hierarchy?.[deepestHierarchyLevel] ?? "";
  }

  return "";
};
