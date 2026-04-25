export type ContentType = "guide" | "api" | "tutorial" | "concept" | "changelog";

export type SearchHit = {
  objectID: string;
  title: string;
  url: string;
  content: string;
  methodName?: string;
  contentType: ContentType;
  section: string;
  headings: string[];
  iconLabel?: string;
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  guide: "Guides",
  api: "API reference",
  tutorial: "Tutorials",
  concept: "Concepts",
  changelog: "Changelog",
};

export const CONTENT_TYPE_ORDER: ContentType[] = [
  "guide",
  "api",
  "tutorial",
  "concept",
  "changelog",
];

export const SEARCH_INDEX_NAME = "docs_demo";

export const searchRecords: SearchHit[] = [
  {
    objectID: "guide-filtering-attribute",
    title: "Filtering by attribute",
    url: "https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/how-to/filter-by-attributes/",
    content:
      "To filter on an attribute, declare it under attributesForFaceting in your index settings, then pass the facet expression to the filters parameter at query time.",
    contentType: "guide",
    section: "Searching",
    headings: ["Filtering", "Attributes"],
    iconLabel: "G",
  },
  {
    objectID: "guide-working-with-filters",
    title: "Working with filters",
    url: "https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/in-depth/filters-and-facetfilters/",
    content:
      "Filters narrow your results to records matching specific criteria. Use them when search alone returns too many hits to stay useful for users.",
    contentType: "guide",
    section: "Searching",
    headings: ["Filtering"],
    iconLabel: "G",
  },
  {
    objectID: "guide-attributes-for-faceting",
    title: "Configuring attributes for faceting",
    url: "https://www.algolia.com/doc/guides/managing-results/refine-results/faceting/how-to/declaring-attributes-for-faceting/",
    content:
      "Each attribute you want to filter on must be added to attributesForFaceting before queries can reference it in filters, facetFilters, or hierarchical menus.",
    contentType: "guide",
    section: "Indexing",
    headings: ["Settings"],
    iconLabel: "G",
  },
  {
    objectID: "guide-filter-scoring",
    title: "Filter scoring and ranking",
    url: "https://www.algolia.com/doc/guides/managing-results/rules/merchandising-and-promoting/in-depth/filter-scoring/",
    content:
      "Filter scoring helps you prefer records that match important filters without excluding other records entirely, which is useful when blending personalization and strict refinements.",
    contentType: "guide",
    section: "Ranking",
    headings: ["Filters", "Scoring"],
    iconLabel: "G",
  },
  {
    objectID: "api-filters",
    title: "filters",
    url: "https://www.algolia.com/doc/api-reference/api-parameters/filters/",
    content:
      "String. Filter the query with numeric, facet, or tag filters. Supports AND, OR, NOT, ranges, and parentheses for grouping complex filter expressions.",
    methodName: "index.search",
    contentType: "api",
    section: "Search",
    headings: ["Parameters"],
    iconLabel: "A",
  },
  {
    objectID: "api-attributes-for-faceting",
    title: "attributesForFaceting",
    url: "https://www.algolia.com/doc/api-reference/api-parameters/attributesForFaceting/",
    content:
      "Array of strings. Lists attributes you want to use for faceting and filtering. The engine returns matching counts per facet value by default.",
    methodName: "index.setSettings",
    contentType: "api",
    section: "Indexing",
    headings: ["Settings"],
    iconLabel: "A",
  },
  {
    objectID: "api-facetfilters",
    title: "facetFilters",
    url: "https://www.algolia.com/doc/api-reference/api-parameters/facetFilters/",
    content:
      "Array. Narrows results through facet-based filters and supports nesting for OR groups. Prefer filters when you need a single combined string expression.",
    methodName: "index.search",
    contentType: "api",
    section: "Search",
    headings: ["Parameters"],
    iconLabel: "A",
  },
  {
    objectID: "api-optionalfilters",
    title: "optionalFilters",
    url: "https://www.algolia.com/doc/api-reference/api-parameters/optionalFilters/",
    content:
      "Array. Boost records that match a filter without excluding non-matching records. Useful for soft preferences and personalization strategies.",
    contentType: "api",
    section: "Search",
    headings: ["Ranking"],
    iconLabel: "A",
  },
  {
    objectID: "tutorial-build-doc-search",
    title: "Build a docs search modal",
    url: "https://www.algolia.com/doc/guides/building-search-ui/getting-started/react/",
    content:
      "Start from an InstantSearch root, add a custom search box, connect hits, and layer keyboard navigation to build a documentation search experience.",
    contentType: "tutorial",
    section: "React InstantSearch",
    headings: ["Custom UI"],
    iconLabel: "T",
  },
  {
    objectID: "tutorial-query-suggestions",
    title: "Add query suggestions to search",
    url: "https://www.algolia.com/doc/guides/building-search-ui/ui-and-ux-patterns/query-suggestions/react/",
    content:
      "Pair query suggestions with documentation results to help users refine a search before they drill into filters, facets, and API pages.",
    contentType: "tutorial",
    section: "UI patterns",
    headings: ["Suggestions"],
    iconLabel: "T",
  },
  {
    objectID: "concept-filtering-vs-faceting",
    title: "Filtering versus faceting",
    url: "https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/in-depth/filtering-vs-faceting/",
    content:
      "Filtering restricts which records are eligible to match, while faceting exposes grouped metadata counts so users can explore and narrow a result set interactively.",
    contentType: "concept",
    section: "Search concepts",
    headings: ["Filtering", "Faceting"],
    iconLabel: "C",
  },
  {
    objectID: "concept-index-attributes",
    title: "Choosing searchable attributes",
    url: "https://www.algolia.com/doc/guides/sending-and-managing-data/prepare-your-data/how-to/choosing-searchable-attributes/",
    content:
      "Searchable attributes drive relevance, while faceting attributes drive structured refinement. Balancing both is key when designing a docs index.",
    contentType: "concept",
    section: "Index design",
    headings: ["Relevance"],
    iconLabel: "C",
  },
  {
    objectID: "changelog-react-v7",
    title: "React InstantSearch v7 migration notes",
    url: "https://www.algolia.com/doc/guides/building-search-ui/upgrade-guides/react/",
    content:
      "React InstantSearch v7 unifies widgets and hooks, making it easier to build custom search interfaces while keeping the same search state model.",
    contentType: "changelog",
    section: "Releases",
    headings: ["React InstantSearch v7"],
    iconLabel: "R",
  },
  {
    objectID: "changelog-docs-index",
    title: "Documentation index field changes",
    url: "https://www.algolia.com/doc/changelog/",
    content:
      "The docs demo index now stores headings and content type separately to support grouped modal results, future breadcrumbs, and richer facet chips.",
    contentType: "changelog",
    section: "Docs search",
    headings: ["Index fields"],
    iconLabel: "R",
  },
];
