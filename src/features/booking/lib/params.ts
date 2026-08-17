import { DURATION_PRESETS, type Minutes } from "@/entities/booking";

/**
 * The flow's state lives in the URL, not a client store.
 *
 * This is a product decision as much as a technical one: the browser back
 * button steps back through the flow, a refresh keeps the selection, and a
 * half-made booking can be sent to the friend you are meeting. A Zustand
 * store would have given none of that for free, and the flow has no state
 * that a URL cannot express.
 *
 * `?step=` is derived rather than stored — the furthest step the current
 * selection can support — so a hand-edited URL cannot land on payment with
 * nothing chosen.
 */
export interface FlowSelection {
  date: string | null;
  tableId: string | null;
  start: Minutes | null;
  duration: Minutes;
}

export type FlowStep = "when" | "table" | "time" | "pay";

export const DEFAULT_DURATION: Minutes = DURATION_PRESETS[1];

export function readSelection(params: URLSearchParams): FlowSelection {
  const rawDuration = Number(params.get("duration"));
  const rawStart = Number(params.get("start"));
  return {
    date: params.get("date"),
    tableId: params.get("table"),
    start: Number.isInteger(rawStart) && rawStart > 0 ? rawStart : null,
    duration: DURATION_PRESETS.includes(
      rawDuration as (typeof DURATION_PRESETS)[number],
    )
      ? rawDuration
      : DEFAULT_DURATION,
  };
}

export function writeSelection(selection: FlowSelection): URLSearchParams {
  const params = new URLSearchParams();
  if (selection.date) params.set("date", selection.date);
  if (selection.tableId) params.set("table", selection.tableId);
  if (selection.start !== null) params.set("start", String(selection.start));
  params.set("duration", String(selection.duration));
  return params;
}

/** The furthest step this selection has earned. */
export function stepFor(selection: FlowSelection): FlowStep {
  if (!selection.date) return "when";
  if (!selection.tableId) return "table";
  if (selection.start === null) return "time";
  return "pay";
}

/** Steps in order, for the progress indicator. */
export const STEPS: readonly FlowStep[] = ["when", "table", "time", "pay"];
