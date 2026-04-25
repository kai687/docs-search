import { liteClient as algoliasearch } from "algoliasearch/lite";

const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchApiKey = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;
export const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME;

if (!appId || !searchApiKey || !indexName) {
  throw new Error(
    "Missing Algolia env vars. Set VITE_ALGOLIA_APP_ID, VITE_ALGOLIA_SEARCH_API_KEY, and VITE_ALGOLIA_INDEX_NAME.",
  );
}

export const searchClient = algoliasearch(appId, searchApiKey);
