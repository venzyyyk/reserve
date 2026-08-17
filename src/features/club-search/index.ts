/**
 * Feature surface. Client components are exported for convenience, but
 * consumers that only need one should import the leaf module: "use client"
 * modules are client-reference boundaries and escape tree-shaking through
 * barrels (ADR-0006).
 */
export { CatalogFilters } from "./components/catalog-filters";
export { QuickSearchForm } from "./components/quick-search-form";
export {
  DEFAULT_QUERY,
  filterClubs,
  type ClubQuery,
  type ClubSort,
} from "./lib/filter";
export { catalogParsers, loadCatalogParams } from "./lib/params";
