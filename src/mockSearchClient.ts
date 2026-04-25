import { CONTENT_TYPE_ORDER, type ContentType, searchRecords, type SearchHit } from "./searchData";

type SearchParams = {
  query?: string;
  page?: number;
  hitsPerPage?: number;
  facets?: string[];
  filters?: string;
  facetFilters?: Array<string | string[]>;
};

type SearchRequest = {
  indexName?: string;
  params?: SearchParams;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalize = (value: string) => value.trim().toLowerCase();

const splitTerms = (query: string) => normalize(query).split(/\s+/).filter(Boolean);

const getActiveContentType = (params: SearchParams = {}): ContentType | null => {
  const filterMatches = params.filters?.match(/contentType:([\w-]+)/)?.[1] ?? null;

  if (filterMatches && CONTENT_TYPE_ORDER.includes(filterMatches as ContentType)) {
    return filterMatches as ContentType;
  }

  const facetValues = params.facetFilters?.flatMap((entry) =>
    Array.isArray(entry) ? entry : [entry],
  );
  const facetMatch =
    facetValues?.find((value) => value.startsWith("contentType:"))?.split(":")[1] ?? null;

  if (facetMatch && CONTENT_TYPE_ORDER.includes(facetMatch as ContentType)) {
    return facetMatch as ContentType;
  }

  return null;
};

const getRecordText = (record: SearchHit) =>
  [record.title, record.methodName ?? "", record.section, ...record.headings, record.content]
    .join(" ")
    .toLowerCase();

const scoreRecord = (record: SearchHit, terms: string[]) => {
  if (terms.length === 0) {
    return 1;
  }

  const title = record.title.toLowerCase();
  const section = record.section.toLowerCase();
  const headings = record.headings.join(" ").toLowerCase();
  const content = record.content.toLowerCase();
  const methodName = record.methodName?.toLowerCase() ?? "";
  const haystack = getRecordText(record);

  let score = 0;

  for (const term of terms) {
    if (!haystack.includes(term)) {
      return -1;
    }

    if (title.includes(term)) {
      score += 8;
    }
    if (section.includes(term)) {
      score += 4;
    }
    if (headings.includes(term)) {
      score += 5;
    }
    if (methodName.includes(term)) {
      score += 6;
    }
    if (content.includes(term)) {
      score += 2;
    }
  }

  return score;
};

const buildHighlightedValue = (value: string, terms: string[]) => {
  if (terms.length === 0) {
    return escapeHtml(value);
  }

  const escapedTerms = terms
    .map((term) => term.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean);

  if (escapedTerms.length === 0) {
    return escapeHtml(value);
  }

  const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  const parts = value.split(pattern);

  return parts
    .map((part) => {
      if (escapedTerms.some((term) => part.toLowerCase() === term.toLowerCase())) {
        return `<mark>${escapeHtml(part)}</mark>`;
      }

      return escapeHtml(part);
    })
    .join("");
};

const buildSnippet = (value: string, terms: string[]) => {
  if (terms.length === 0) {
    const words = value.split(/\s+/).slice(0, 20).join(" ");
    return `${escapeHtml(words)}...`;
  }

  const lowerValue = value.toLowerCase();
  const firstTerm = terms.find((term) => lowerValue.includes(term));

  if (!firstTerm) {
    return `${escapeHtml(value.split(/\s+/).slice(0, 20).join(" "))}...`;
  }

  const matchIndex = lowerValue.indexOf(firstTerm);
  const start = Math.max(0, matchIndex - 64);
  const end = Math.min(value.length, matchIndex + 120);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < value.length ? "..." : "";

  return `${prefix}${buildHighlightedValue(value.slice(start, end).trim(), terms)}${suffix}`;
};

const searchSingleIndex = (request: SearchRequest) => {
  const params = request.params ?? {};
  const query = params.query ?? "";
  const page = params.page ?? 0;
  const hitsPerPage = params.hitsPerPage ?? 8;
  const terms = splitTerms(query);
  const activeContentType = getActiveContentType(params);

  const queryMatched = searchRecords
    .map((record) => ({ record, score: scoreRecord(record, terms) }))
    .filter((entry) => entry.score >= 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.record.title.localeCompare(right.record.title),
    );

  const facets = Object.fromEntries(
    CONTENT_TYPE_ORDER.map((contentType) => [
      contentType,
      queryMatched.filter((entry) => entry.record.contentType === contentType).length,
    ]),
  );

  const refined = activeContentType
    ? queryMatched.filter((entry) => entry.record.contentType === activeContentType)
    : queryMatched;

  const totalHits = refined.length;
  const nbPages = Math.max(1, Math.ceil(totalHits / hitsPerPage));
  const currentPage = Math.min(page, nbPages - 1);
  const start = currentPage * hitsPerPage;
  const end = start + hitsPerPage;

  const hits = refined.slice(start, end).map(({ record }, index) => ({
    ...record,
    _highlightResult: {
      title: {
        value: buildHighlightedValue(record.title, terms),
        matchLevel: terms.length > 0 ? "full" : "none",
        matchedWords: terms,
      },
      section: {
        value: buildHighlightedValue(record.section, terms),
        matchLevel: terms.length > 0 ? "partial" : "none",
        matchedWords: terms,
      },
      methodName: record.methodName
        ? {
            value: buildHighlightedValue(record.methodName, terms),
            matchLevel: terms.length > 0 ? "partial" : "none",
            matchedWords: terms,
          }
        : undefined,
    },
    _snippetResult: {
      content: {
        value: buildSnippet(record.content, terms),
        matchLevel: terms.length > 0 ? "partial" : "none",
      },
    },
    __position: start + index + 1,
  }));

  return {
    hits,
    nbHits: totalHits,
    page: currentPage,
    nbPages,
    hitsPerPage,
    processingTimeMS: 28,
    exhaustiveNbHits: true,
    exhaustiveFacetsCount: true,
    query,
    params: "",
    facets: params.facets?.length ? { contentType: facets } : undefined,
  };
};

export const mockSearchClient = {
  search(requests: SearchRequest[]) {
    return Promise.resolve({
      results: requests.map(searchSingleIndex),
    });
  },
  searchForFacetValues() {
    return Promise.resolve([]);
  },
};
