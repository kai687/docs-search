import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { Hit } from "instantsearch.js";
import {
  Configure,
  Highlight,
  InstantSearch,
  PoweredBy,
  Snippet,
  useHits,
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
  recordType?: string;
  breadcrumbSegments?: string[];
  breadcrumbHierarchy?: Record<string, string>;
  hierarchy?: Record<string, string>;
  _highlightResult?: {
    hierarchy?: Record<string, { value?: string; matchLevel?: MatchLevel }>;
  };
  _snippetResult?: {
    content?: { value?: string };
  };
};

type SearchRenderableHit = Hit<AlgoliaDocHit> & DocsSearchTitleHit;

type GroupedHits = {
  contentType: string;
  label: string;
  items: SearchRenderableHit[];
};

type DocsSearchModalProps = {
  open: boolean;
  onClose: () => void;
};

const MODAL_ANIMATION_MS = 220;
const SEARCH_BOX_PLACEHOLDER = "Search the docs";
const highlightClassName =
  "rounded-sm bg-amber-500/20 px-0.5 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300";

const CONTENT_TYPE_ORDER = ["guides", "api", "tutorials", "concepts", "changelog"];

const CONTENT_TYPE_ALIASES: Record<string, string> = {
  guide: "guides",
  guides: "guides",
  api: "api",
  "api reference": "api",
  tutorial: "tutorials",
  tutorials: "tutorials",
  concept: "concepts",
  concepts: "concepts",
  changelog: "changelog",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  guide: "Guides",
  guides: "Guides",
  api: "API reference",
  "api reference": "API reference",
  tutorial: "Tutorials",
  tutorials: "Tutorials",
  concept: "Concepts",
  concepts: "Concepts",
  changelog: "Changelog",
};

const CONTENT_TYPE_STYLES: Record<string, { iconClassName: string; iconFallback: string }> = {
  guides: {
    iconClassName: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
    iconFallback: "G",
  },
  api: {
    iconClassName:
      "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    iconFallback: "A",
  },
  tutorials: {
    iconClassName: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
    iconFallback: "T",
  },
  concepts: {
    iconClassName: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
    iconFallback: "C",
  },
  changelog: {
    iconClassName: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    iconFallback: "R",
  },
};

const DEFAULT_CONTENT_TYPE_STYLE = {
  iconClassName: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  iconFallback: "D",
};

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

function FilterChips() {
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
    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-300/80 px-4 py-3 dark:border-white/10">
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
        {style.iconFallback}
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
  const { hits } = useHits<SearchRenderableHit>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const groupedHits = useMemo<GroupedHits[]>(() => {
    const groups = new Map<string, GroupedHits>();

    for (const hit of hits) {
      const contentType = toCanonicalContentType(getRawContentType(hit));
      const groupKey = contentType || "documentation";
      const existingGroup = groups.get(groupKey);

      if (existingGroup) {
        existingGroup.items.push(hit);
        continue;
      }

      groups.set(groupKey, {
        contentType: groupKey,
        label: getContentTypeLabel(getRawContentType(hit) || groupKey),
        items: [hit],
      });
    }

    return Array.from(groups.values());
  }, [hits]);

  useEffect(() => {
    if (hits.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((current) => Math.min(current, hits.length - 1));
  }, [hits]);

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

    if (hits.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % hits.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + hits.length) % hits.length);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      openHit(hits[selectedIndex]);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (hits.length === 0) {
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

  let globalIndex = -1;

  return (
    <div className="max-h-[min(60vh,560px)] overflow-auto pb-2">
      {groupedHits.map((group) => (
        <section key={group.contentType}>
          <div className="px-4 pb-1 pt-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
            {group.label}
          </div>
          {group.items.map((hit) => {
            globalIndex += 1;
            const currentIndex = globalIndex;

            return (
              <ResultRow
                key={hit.objectID}
                hit={hit}
                isSelected={currentIndex === selectedIndex}
                onHover={() => setSelectedIndex(currentIndex)}
                onOpen={() => openHit(hit)}
              />
            );
          })}
        </section>
      ))}
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
      <Configure hitsPerPage={8} attributesToSnippet={["content:20"]} />
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
          "w-full max-w-[760px] overflow-hidden rounded-[18px] border border-slate-300 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.15)] transition duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none dark:border-white/15 dark:bg-[#101521] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
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
