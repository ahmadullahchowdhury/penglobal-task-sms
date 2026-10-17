"use client";

import { useSyncExternalStore } from "react";

const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const utcFormat = new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });
const localFormat = new Intl.DateTimeFormat(undefined, options);

const subscribe = () => () => {};

// Deadlines are stored in UTC and shown in the viewer's own timezone. The server
// and the first client render show UTC (so hydration matches), then the browser
// swaps in local time.
export function LocalTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const local = useSyncExternalStore(
    subscribe,
    () => localFormat.format(date),
    () => null,
  );
  return <time dateTime={iso}>{local ?? `${utcFormat.format(date)} UTC`}</time>;
}
