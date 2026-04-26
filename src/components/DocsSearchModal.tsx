import { BookOpen, ChevronDown, Code, FileText, Plug, SquareTerminal } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import type { Hit } from "instantsearch.js";
import {
  Configure,
  Highlight,
  InstantSearch,
  PoweredBy,
  Snippet,
  useHierarchicalMenu,
  useInfiniteHits,
  useInstantSearch,
  useMenu,
  useSearchBox,
  useStats,
} from "react-instantsearch";
import { cn } from "../lib/cn";
import { indexName, searchClient } from "../searchClient";
import {
  getDeepestHierarchyLevel,
  getFullMatchTitleAttribute,
  getPreferredTitleText,
  type DocsSearchTitleHit,
  type MatchLevel,
} from "./docsSearchTitle";
import { CountPill, FilterChip, Kbd } from "./ui";

type AlgoliaDocHit = {
  objectID: string;
  url: string;
  urlWithoutAnchor?: string;
  content?: string;
  contentType?: string;
  methodName?: string;
  recordType?: string;
  breadcrumbSegments?: string[];
  breadcrumbHierarchy?: Record<string, string>;
  hierarchy?: Record<string, string>;
  _highlightResult?: {
    hierarchy?: Record<string, { value?: string; matchLevel?: MatchLevel }>;
    methodName?: { value?: string; matchLevel?: MatchLevel };
  };
  _snippetResult?: {
    content?: { value?: string };
  };
};

type SearchRenderableHit = Hit<AlgoliaDocHit> & DocsSearchTitleHit;

type DocsSearchModalProps = {
  open: boolean;
  onClose: () => void;
};

const MODAL_ANIMATION_MS = 220;
const SEARCH_BOX_PLACEHOLDER = "Search the docs";
const highlightClassName =
  "rounded-sm bg-amber-500/20 px-0.5 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300";

const CONTENT_TYPE_ORDER = ["guides", "api", "sdk", "integration", "default"];

const CONTENT_TYPE_ALIASES: Record<string, string> = {
  guide: "guides",
  guides: "guides",
  api: "api",
  "api reference": "api",
  sdk: "sdk",
  integration: "integration",
  integrations: "integration",
  tutorial: "default",
  tutorials: "default",
  concept: "default",
  concepts: "default",
  changelog: "default",
  default: "default",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  guide: "Guides",
  guides: "Guides",
  api: "API",
  "api reference": "API",
  sdk: "SDK",
  integration: "Integrations",
  integrations: "Integrations",
  tutorial: "Default",
  tutorials: "Default",
  concept: "Default",
  concepts: "Default",
  changelog: "Default",
  default: "Default",
};

const CONTENT_TYPE_STYLES: Record<string, { iconClassName: string; icon: JSX.Element }> = {
  guides: {
    iconClassName: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
    icon: <BookOpen size={14} strokeWidth={1.5} aria-hidden="true" />,
  },
  api: {
    iconClassName:
      "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    icon: <Code size={14} strokeWidth={1.5} aria-hidden="true" />,
  },
  sdk: {
    iconClassName:
      "bg-fuchsia-500/12 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300",
    icon: <SquareTerminal size={14} strokeWidth={1.5} aria-hidden="true" />,
  },
  integration: {
    iconClassName: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
    icon: <Plug size={14} strokeWidth={1.5} aria-hidden="true" />,
  },
  default: {
    iconClassName: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    icon: <FileText size={14} strokeWidth={1.5} aria-hidden="true" />,
  },
};

const DEFAULT_CONTENT_TYPE_STYLE = CONTENT_TYPE_STYLES.default;

const normalizeContentType = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const toCanonicalContentType = (value?: string | null) => {
  const normalized = normalizeContentType(value);
  return CONTENT_TYPE_ALIASES[normalized] ?? normalized;
};

const getRawContentType = (hit: SearchRenderableHit) => {
  return hit.contentType ?? hit.breadcrumbSegments?.[0] ?? hit.breadcrumbHierarchy?.lvl0 ?? "";
};

const titleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getContentTypeLabel = (value?: string | null) => {
  const normalized = toCanonicalContentType(value);

  if (!normalized) {
    return "Documentation";
  }

  return CONTENT_TYPE_LABELS[normalized] ?? titleCase(normalized);
};

const getContentTypeStyle = (value?: string | null) => {
  return CONTENT_TYPE_STYLES[toCanonicalContentType(value)] ?? DEFAULT_CONTENT_TYPE_STYLE;
};

const HIERARCHICAL_FACET_ATTRIBUTES = [
  "breadcrumbHierarchy.lvl0",
  "breadcrumbHierarchy.lvl1",
  "breadcrumbHierarchy.lvl2",
] as const;

const HIERARCHICAL_FACET_SEPARATOR = " > ";

const getOrderedContentTypeKeys = (keys: Iterable<string>) => {
  const uniqueKeys = [...new Set(Array.from(keys).map(toCanonicalContentType).filter(Boolean))];
  const order = new Map(CONTENT_TYPE_ORDER.map((key, index) => [key, index]));

  return uniqueKeys.sort((left, right) => {
    const leftRank = order.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = order.get(right) ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return getContentTypeLabel(left).localeCompare(getContentTypeLabel(right));
  });
};

const getHierarchicalFacetChipLabel = (value: string) => {
  return value.split(HIERARCHICAL_FACET_SEPARATOR).pop()?.trim() ?? value;
};

type HierarchicalFacetItem = {
  label: string;
  value: string;
  count: number;
  isRefined: boolean;
  data?: HierarchicalFacetItem[];
};

const getBreadcrumbParts = (hit: SearchRenderableHit) => {
  const segmentParts = hit.breadcrumbSegments?.map((part) => part.trim()).filter(Boolean);

  if (segmentParts?.length) {
    return segmentParts;
  }

  const hierarchyParts = Object.entries(hit.breadcrumbHierarchy ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value.trim())
    .filter(Boolean);

  if (hierarchyParts.length) {
    return hierarchyParts[hierarchyParts.length - 1]
      .split(">")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return Object.entries(hit.hierarchy ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value.trim())
    .filter(Boolean);
};

const getBreadcrumb = (hit: SearchRenderableHit) => getBreadcrumbParts(hit).join(" › ");

const hasContentSnippet = (hit: SearchRenderableHit) => Boolean(hit._snippetResult?.content?.value);

const getPreferredHierarchyAttribute = (
  level: NonNullable<ReturnType<typeof getDeepestHierarchyLevel>>,
) => {
  return `hierarchy.${level}` as keyof SearchRenderableHit;
};

const getFallbackContent = (hit: SearchRenderableHit) => {
  return hit.content?.trim() || "";
};

const getSnippetFallback = (content: string) => {
  const normalized = content.trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177).trimEnd()}...`;
};

function SearchHeader({ onClose }: { onClose: () => void }) {
  const { query, refine } = useSearchBox();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-300/80 px-4 py-3.5 dark:border-white/10">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="shrink-0 text-slate-400"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3 3" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        className="min-w-[220px] flex-1 border-0 bg-transparent text-[15px] text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-50"
        type="text"
        value={query}
        onChange={(event) => refine(event.currentTarget.value)}
        placeholder={SEARCH_BOX_PLACEHOLDER}
        aria-label="Search documentation"
      />
      <button
        type="button"
        className="ml-auto inline-flex items-center justify-center bg-transparent"
        onClick={onClose}
        aria-label="Close search"
      >
        <Kbd>esc</Kbd>
      </button>
    </div>
  );
}

function HierarchicalFacetChipRow({
  items,
  refine,
  trailingAction,
}: {
  items: HierarchicalFacetItem[];
  refine: (value: string) => void;
  trailingAction?: ReactNode;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <FilterChip key={item.value} active={item.isRefined} onClick={() => refine(item.value)}>
          {getHierarchicalFacetChipLabel(item.label)}
          <CountPill>{item.count}</CountPill>
        </FilterChip>
      ))}
      {trailingAction}
    </div>
  );
}

function HierarchicalDrilldownChips() {
  const { items, refine } = useHierarchicalMenu({
    attributes: [...HIERARCHICAL_FACET_ATTRIBUTES],
    limit: 20,
  });

  const level0Items = items as HierarchicalFacetItem[];
  const selectedLevel0 = level0Items.find((item) => item.isRefined);
  const level1Items = selectedLevel0?.data ?? [];
  const selectedLevel1 = level1Items.find((item) => item.isRefined);
  const level2Items = selectedLevel1?.data ?? [];
  const selectedLevel2 = level2Items.find((item) => item.isRefined);
  const refinedItems = [selectedLevel0, selectedLevel1, selectedLevel2].filter(
    (item): item is HierarchicalFacetItem => Boolean(item),
  );
  const activeDrilldownItem = refinedItems[refinedItems.length - 1];

  if (level0Items.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-300/80 px-4 py-3 dark:border-white/10">
      <div className="space-y-2.5">
        <HierarchicalFacetChipRow
          items={level0Items}
          refine={refine}
          trailingAction={
            activeDrilldownItem ? (
              <button
                type="button"
                className="inline-flex min-h-7 items-center rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 motion-reduce:transition-none dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50"
                onClick={() => refine(activeDrilldownItem.value)}
              >
                Clear
              </button>
            ) : null
          }
        />
        {selectedLevel0 ? <HierarchicalFacetChipRow items={level1Items} refine={refine} /> : null}
        {selectedLevel1 ? <HierarchicalFacetChipRow items={level2Items} refine={refine} /> : null}
      </div>
    </div>
  );
}

function FilterChips() {
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const { items, refine } = useMenu({
    attribute: "contentType",
    limit: 20,
  });

  const activeItem = items.find((item) => item.isRefined) ?? null;
  const allCount = items.reduce((total, item) => total + item.count, 0);
  const orderedItems = getOrderedContentTypeKeys(items.map((item) => item.label)).reduce<
    typeof items
  >((accumulator, key) => {
    const item = items.find((entry) => toCanonicalContentType(entry.label) === key);

    if (item && item.count > 0) {
      accumulator.push(item);
    }

    return accumulator;
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-300/80 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <FilterChip
            active={!activeItem}
            onClick={() => {
              if (activeItem) {
                refine(activeItem.value);
              }
            }}
          >
            All
            <CountPill>{allCount}</CountPill>
          </FilterChip>
          {orderedItems.map((item) => (
            <FilterChip key={item.value} active={item.isRefined} onClick={() => refine(item.value)}>
              {getContentTypeLabel(item.label)}
              <CountPill>{item.count}</CountPill>
            </FilterChip>
          ))}
        </div>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300/80 px-2.5 py-1 text-[12px] font-medium text-slate-600 transition hover:bg-slate-100 motion-reduce:transition-none dark:border-white/15 dark:text-slate-300 dark:hover:bg-slate-800/70",
            isDrilldownOpen &&
              "border-sky-300 bg-sky-500/8 text-sky-700 dark:border-sky-500/30 dark:bg-sky-400/10 dark:text-sky-300",
          )}
          onClick={() => setIsDrilldownOpen((current) => !current)}
          aria-expanded={isDrilldownOpen}
          aria-controls="facet-drilldown-panel"
        >
          Drilldown
          <ChevronDown
            size={14}
            className={cn(
              "transition duration-200 motion-reduce:transition-none",
              isDrilldownOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>
      {isDrilldownOpen ? (
        <div id="facet-drilldown-panel">
          <HierarchicalDrilldownChips />
        </div>
      ) : null}
    </div>
  );
}

function SearchStatsBar() {
  const { nbHits, processingTimeMS } = useStats();
  const { status } = useInstantSearch();

  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-0.5 pt-2.5 text-[12px] text-slate-500 dark:text-slate-400">
      <span>
        {nbHits} results · {processingTimeMS} ms
      </span>
      {status === "stalled" ? (
        <span className="text-sky-700 dark:text-sky-300">Updating...</span>
      ) : null}
    </div>
  );
}

function ResultRow({
  hit,
  isSelected,
  onHover,
  onOpen,
}: {
  hit: SearchRenderableHit;
  isSelected: boolean;
  onHover: () => void;
  onOpen: () => void;
}) {
  const style = getContentTypeStyle(getRawContentType(hit));
  const breadcrumb = getBreadcrumb(hit);
  const fullMatchTitleAttribute = getFullMatchTitleAttribute(hit);
  const preferredHierarchyLevel = fullMatchTitleAttribute ?? getDeepestHierarchyLevel(hit);
  const preferredTitleText = getPreferredTitleText(hit);
  const isFieldRecord = hit.recordType === "field";

  return (
    <button
      type="button"
      className={cn(
        "grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)_14px] items-start gap-3 border-l-2 px-4 py-2.5 text-left text-inherit transition hover:bg-slate-100 motion-reduce:transition-none dark:hover:bg-slate-800/90",
        isSelected
          ? "border-l-sky-500 bg-slate-100 dark:border-l-sky-400 dark:bg-slate-800/90"
          : "border-l-transparent bg-transparent",
      )}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onOpen}
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
          style.iconClassName,
        )}
        aria-hidden="true"
      >
        {style.icon}
      </div>
      <div className="min-w-0">
        {breadcrumb ? (
          <div className="mb-0.5 text-[12px] text-slate-500 dark:text-slate-400">{breadcrumb}</div>
        ) : null}
        {preferredTitleText ? (
          <div className="mb-1 text-[14px] font-semibold leading-5 text-slate-950 dark:text-slate-50">
            <span
              className={cn(
                isFieldRecord &&
                  "inline-block rounded-md bg-sky-100 px-2 py-0.5 font-mono text-[13px] font-medium text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
              )}
            >
              {preferredHierarchyLevel && fullMatchTitleAttribute === preferredHierarchyLevel ? (
                <Highlight
                  hit={hit}
                  attribute={getPreferredHierarchyAttribute(preferredHierarchyLevel)}
                  classNames={{ highlighted: highlightClassName }}
                />
              ) : (
                preferredTitleText
              )}
            </span>
          </div>
        ) : null}
        <div className="text-[13px] leading-5 text-slate-600 dark:text-slate-300">
          {hasContentSnippet(hit) ? (
            <Snippet
              hit={hit}
              attribute="content"
              classNames={{ highlighted: highlightClassName }}
            />
          ) : (
            getSnippetFallback(getFallbackContent(hit))
          )}
        </div>
        {hit.methodName ? (
          <div className="mt-1.5">
            <code className="inline-flex items-center rounded-md border border-slate-300/80 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200">
              <Highlight
                hit={hit}
                attribute="methodName"
                classNames={{ highlighted: highlightClassName }}
              />
            </code>
          </div>
        ) : null}
      </div>
      <svg
        className="mt-2 shrink-0 text-slate-400"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M5 3l4 4-4 4" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function SearchResults({ onClose }: { onClose: () => void }) {
  const { items, isLastPage, showMore } = useInfiniteHits<SearchRenderableHit>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((current) => Math.min(current, items.length - 1));
  }, [items]);

  const openHit = useEffectEvent((hit: SearchRenderableHit | undefined) => {
    if (!hit?.url) {
      return;
    }

    window.open(hit.url, "_blank", "noopener,noreferrer");
    onClose();
  });

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (items.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % items.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + items.length) % items.length);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      openHit(items[selectedIndex]);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (items.length === 0) {
    return (
      <div className="px-4 pb-12 pt-10 text-center">
        <p className="m-0 text-[18px] font-bold text-slate-950 dark:text-slate-50">
          No matching docs
        </p>
        <p className="mx-auto mt-2.5 max-w-[34ch] leading-6 text-slate-600 dark:text-slate-300">
          Try broader terms like{" "}
          <code className="rounded-full bg-slate-200 px-1.5 py-0.5 dark:bg-slate-800">filters</code>
          ,{" "}
          <code className="rounded-full bg-slate-200 px-1.5 py-0.5 dark:bg-slate-800">
            faceting
          </code>
          , or{" "}
          <code className="rounded-full bg-slate-200 px-1.5 py-0.5 dark:bg-slate-800">
            attribute
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[min(68vh,680px)] overflow-auto pb-2">
      {items.map((hit, index) => (
        <ResultRow
          key={hit.objectID}
          hit={hit}
          isSelected={index === selectedIndex}
          onHover={() => setSelectedIndex(index)}
          onOpen={() => openHit(hit)}
        />
      ))}
      {!isLastPage ? (
        <div className="px-4 pt-3">
          <button
            type="button"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => showMore()}
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SearchFooter() {
  return (
    <div className="flex flex-wrap items-center gap-3.5 border-t border-slate-300/80 px-4 py-2.5 text-[12px] text-slate-500 dark:border-white/10 dark:text-slate-400">
      <span className="inline-flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        navigate
      </span>
      <span className="inline-flex items-center gap-1">
        <Kbd>⏎</Kbd>
        open
      </span>
      <span className="inline-flex items-center gap-1">
        <Kbd>esc</Kbd>
        close
      </span>
      <PoweredBy
        className="ml-auto w-full sm:w-auto"
        classNames={{
          root: "inline-flex w-full sm:w-auto",
          link: "inline-flex items-center px-0 py-0 text-slate-600 dark:text-slate-300",
          logo: "h-4 w-auto dark:brightness-0 dark:invert",
        }}
      />
    </div>
  );
}

function SearchExperience({ onClose }: { onClose: () => void }) {
  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <Configure
        hitsPerPage={8}
        attributesToSnippet={["content:20"]}
        // Hide legacy docs from all search results.
        filters="NOT variant:legacy"
      />
      <SearchHeader onClose={onClose} />
      <FilterChips />
      <SearchStatsBar />
      <SearchResults onClose={onClose} />
      <SearchFooter />
    </InstantSearch>
  );
}

export function DocsSearchModal({ open, onClose }: DocsSearchModalProps) {
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (open) {
      setIsMounted(true);

      if (prefersReducedMotion) {
        setIsVisible(true);
        return undefined;
      }

      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    if (prefersReducedMotion) {
      setIsVisible(false);
      setIsMounted(false);
      return undefined;
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setIsMounted(false);
    }, MODAL_ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [open, prefersReducedMotion]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-10 flex items-start justify-center px-3 py-4 transition duration-200 ease-out motion-reduce:transition-none md:py-8",
        prefersReducedMotion
          ? "bg-slate-950/35"
          : isVisible
            ? "bg-slate-950/35 backdrop-blur"
            : "bg-slate-950/0 backdrop-blur-none",
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "w-full max-w-[1040px] overflow-hidden rounded-[18px] border border-slate-300 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.15)] transition duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none dark:border-white/15 dark:bg-[#101521] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
          prefersReducedMotion
            ? "opacity-100"
            : isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-[0.985] opacity-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="docs-search-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="docs-search-modal-title" className="sr-only">
          Documentation search modal demo
        </h2>
        <SearchExperience onClose={onClose} />
      </div>
    </div>
  );
}
