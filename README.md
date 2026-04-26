# Documentation search with React InstantSearch + TypeScript + Vite

This is a small demo app for a search modal for the Algolia docs.

## What this demo shows

- "Quick filters" by content type.
  Works best if you have clear boundaries between prose "Guide" content,
  and API reference content.
- "Drill down" facets. Mirrors the navigation structure of your docs.
  Works best if you have a clear structure that mirrors user's mental models.

## Tech

- React 19
- TypeScript
- React InstantSearch v7
- Tailwind CSS
- Vite+ (`vp`)

## Get started

### Install deps

```sh
vp install
```

### Configure env vars

Create `.env.local`:

```sh
VITE_ALGOLIA_APP_ID=your_app_id
VITE_ALGOLIA_SEARCH_API_KEY=your_search_only_key
VITE_ALGOLIA_INDEX_NAME=docs_clean
```

### Start dev server

```sh
vp dev
```

## Project structure

```text
src/
  App.tsx                         Demo landing screen
  components/DocsSearchModal.tsx  Search modal UI and result rendering
  components/docsSearchTitle.ts   Title selection and hierarchy helpers
  searchClient.ts                 Algolia client bootstrap from env vars
```

## Demo notes

- Search modal opens by default for quick demos.
- Global shortcut toggles modal with `⌘K` or `Ctrl+K`.
- UI expects records with fields like `hierarchy`, `breadcrumbHierarchy`, `breadcrumbSegments`, `contentType`, `content`, and `recordType`.

## License

MIT. See `LICENSE`.
