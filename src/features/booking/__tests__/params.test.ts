import {
  DEFAULT_DURATION,
  readSelection,
  stepFor,
  writeSelection,
} from "../lib/params";

describe("flow selection in the URL", () => {
  it("reads a complete selection", () => {
    const selection = readSelection(
      new URLSearchParams(
        "date=2026-08-01&table=russian-1&start=840&duration=180",
      ),
    );
    expect(selection).toEqual({
      date: "2026-08-01",
      tableId: "russian-1",
      start: 840,
      duration: 180,
    });
  });

  it("falls back to the default duration for junk values", () => {
    expect(readSelection(new URLSearchParams("duration=17")).duration).toBe(
      DEFAULT_DURATION,
    );
    expect(readSelection(new URLSearchParams()).duration).toBe(
      DEFAULT_DURATION,
    );
  });

  it("ignores a non-numeric start", () => {
    expect(readSelection(new URLSearchParams("start=soon")).start).toBeNull();
  });

  it("round-trips through the query string", () => {
    const selection = {
      date: "2026-08-01",
      tableId: "pool-3",
      start: 1200,
      duration: 60,
    };
    expect(readSelection(writeSelection(selection))).toEqual(selection);
  });
});

describe("stepFor", () => {
  it("walks forward only as far as the selection allows", () => {
    expect(
      stepFor({ date: null, tableId: null, start: null, duration: 120 }),
    ).toBe("when");
    expect(
      stepFor({
        date: "2026-08-01",
        tableId: null,
        start: null,
        duration: 120,
      }),
    ).toBe("table");
    expect(
      stepFor({
        date: "2026-08-01",
        tableId: "russian-1",
        start: null,
        duration: 120,
      }),
    ).toBe("time");
    expect(
      stepFor({
        date: "2026-08-01",
        tableId: "russian-1",
        start: 840,
        duration: 120,
      }),
    ).toBe("pay");
  });

  it("cannot be skipped by hand-editing the URL", () => {
    // start present but no table: the flow still demands a table first.
    expect(
      stepFor({ date: "2026-08-01", tableId: null, start: 840, duration: 120 }),
    ).toBe("table");
  });
});
