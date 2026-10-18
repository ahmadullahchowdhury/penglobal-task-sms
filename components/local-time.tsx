"use client";

import { useSyncExternalStore } from "react";

const dateTime: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const dateOnly: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

const utc = {
  dateTime: new Intl.DateTimeFormat("en-GB", { ...dateTime, timeZone: "UTC" }),
  dateOnly: new Intl.DateTimeFormat("en-GB", { ...dateOnly, timeZone: "UTC" }),
};
const local = {
  dateTime: new Intl.DateTimeFormat(undefined, dateTime),
  dateOnly: new Intl.DateTimeFormat(undefined, dateOnly),
};

const subscribe = () => () => {};

// Timestamps are stored in UTC and shown in the viewer's own timezone. The server
// and the first client render show UTC (so hydration matches), then the browser
// swaps in local time. Use dateOnly for a point in time shown as just a date; a
// calendar date with no time (like a date of birth) should not use this at all.
export function LocalTime({ iso, dateOnly: showDateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const key = showDateOnly ? "dateOnly" : "dateTime";
  const date = new Date(iso);
  const text = useSyncExternalStore(
    subscribe,
    () => local[key].format(date),
    () => null,
  );
  return <time dateTime={iso}>{text ?? `${utc[key].format(date)}${showDateOnly ? "" : " UTC"}`}</time>;
}
