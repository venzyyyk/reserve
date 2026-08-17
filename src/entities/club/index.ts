/**
 * Public surface of the club entity: domain types, labels and pure logic.
 * Zod schemas are intentionally NOT re-exported here — they are a
 * server/validation concern (`./schema`), and exporting them would pull the
 * validation runtime into client bundles (ADR-0006).
 */
export {
  AMENITY_LABELS,
  TABLE_TYPES,
  TABLE_TYPE_LABELS,
  clubHref,
  isBookable,
  isVisible,
  type Amenity,
  type Club,
  type TableType,
} from "./model";
export {
  WEEK_ORDER,
  directionsUrl,
  groupedHours,
  isEveryDaySameHours,
  openStatus,
  priceFrom,
  todayInKyiv,
  totalTables,
  type OpenState,
  type WeekDay,
} from "./lib";
