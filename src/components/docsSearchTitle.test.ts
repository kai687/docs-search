import { describe, expect, test } from "vitest";
import {
  getFullMatchTitleAttribute,
  getPreferredTitleText,
  type DocsSearchTitleHit,
} from "./docsSearchTitle";

const createHit = (overrides: Partial<DocsSearchTitleHit> = {}): DocsSearchTitleHit => ({
  ...overrides,
});

describe("docsSearchTitle", () => {
  test("first full hierarchy match wins", () => {
    const hit = createHit({
      hierarchy: {
        lvl1: "Guide",
        lvl2: "Filtering",
      },
      _highlightResult: {
        hierarchy: {
          lvl2: { matchLevel: "full" },
        },
      },
    });

    expect(getFullMatchTitleAttribute(hit)).toBe("lvl2");
    expect(getPreferredTitleText(hit)).toBe("Filtering");
  });

  test("earlier full hierarchy level beats deeper full match", () => {
    const hit = createHit({
      hierarchy: {
        lvl2: "Filtering",
        lvl4: "Advanced filters",
      },
      _highlightResult: {
        hierarchy: {
          lvl2: { matchLevel: "full" },
          lvl4: { matchLevel: "full" },
        },
      },
    });

    expect(getFullMatchTitleAttribute(hit)).toBe("lvl2");
    expect(getPreferredTitleText(hit)).toBe("Filtering");
  });

  test("partial hierarchy match does not win", () => {
    const hit = createHit({
      hierarchy: {
        lvl2: "Filtering",
        lvl4: "Facet scoring",
      },
      _highlightResult: {
        hierarchy: {
          lvl2: { matchLevel: "partial" },
        },
      },
    });

    expect(getFullMatchTitleAttribute(hit)).toBeNull();
    expect(getPreferredTitleText(hit)).toBe("Facet scoring");
  });

  test("no full match falls back to deepest hierarchy", () => {
    const hit = createHit({
      hierarchy: {
        lvl1: "API",
        lvl5: "Rate limits",
      },
    });

    expect(getFullMatchTitleAttribute(hit)).toBeNull();
    expect(getPreferredTitleText(hit)).toBe("Rate limits");
  });

  test("no hierarchy falls back to empty string", () => {
    const hit = createHit();

    expect(getFullMatchTitleAttribute(hit)).toBeNull();
    expect(getPreferredTitleText(hit)).toBe("");
  });
});
