/**
 * Time-series helpers for cost charts.
 * Day grain when the filter span is ≤ 45 days; otherwise month (sum of days).
 */

export type CostSeriesPoint = {
  date: string;
  cost_usd: number;
};

export type SeriesGrain = "day" | "month";

export const SERIES_DAY_MAX_DAYS = 45;

export function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function seriesGrainForRange(startDate: string, endDate: string): SeriesGrain {
  return inclusiveDayCount(startDate, endDate) <= SERIES_DAY_MAX_DAYS ? "day" : "month";
}

export function isoDateFromUnixSeconds(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function rollupSeries(
  points: CostSeriesPoint[],
  grain: SeriesGrain,
): CostSeriesPoint[] {
  const totals = new Map<string, number>();
  for (const point of points) {
    if (!point.date || !Number.isFinite(point.cost_usd)) continue;
    const key = grain === "month" ? monthKey(point.date) : point.date;
    totals.set(key, (totals.get(key) ?? 0) + point.cost_usd);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost_usd]) => ({ date, cost_usd }));
}

export function singlePeriodSeries(
  endDate: string,
  costUsd: number,
): CostSeriesPoint[] {
  if (!endDate || !Number.isFinite(costUsd) || costUsd < 0) return [];
  return [{ date: endDate, cost_usd: costUsd }];
}
