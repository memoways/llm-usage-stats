'use client';

import { useMemo, useState } from 'react';
import type { CostSeriesPoint, SeriesGrain } from '@/lib/types';

function formatMoney(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toFixed(4);
  return '0';
}

function formatTick(date: string, grain: SeriesGrain): string {
  if (grain === 'month' && /^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-');
    return `${month}/${year.slice(2)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `${date.slice(8)}/${date.slice(5, 7)}`;
  }
  return date;
}

export default function CostChart({
  series,
  grain,
  note,
}: {
  series: CostSeriesPoint[];
  grain: SeriesGrain;
  note?: string;
}) {
  const [showLine, setShowLine] = useState(true);
  const [hover, setHover] = useState<number | null>(null);

  const width = 720;
  const height = 240;
  const pad = { top: 16, right: 16, bottom: 36, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = useMemo(() => {
    const peak = Math.max(0, ...series.map((point) => point.cost_usd));
    return peak > 0 ? peak * 1.08 : 1;
  }, [series]);

  if (series.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Cost over time</h2>
        <p className="text-sm text-gray-500">No time series for this provider or range.</p>
        {note ? <p className="text-xs text-gray-500 mt-2">{note}</p> : null}
      </div>
    );
  }

  const slot = plotW / series.length;
  const barW = Math.max(2, Math.min(28, slot * 0.7));
  const points = series.map((point, index) => {
    const x = pad.left + slot * index + slot / 2;
    const y = pad.top + plotH * (1 - point.cost_usd / max);
    return { ...point, x, y, index };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');

  const yTicks = [0, 0.5, 1].map((ratio) => ({
    y: pad.top + plotH * (1 - ratio),
    label: formatMoney(max * ratio),
  }));

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cost over time</h2>
          <p className="text-sm text-gray-500">
            {grain === 'day' ? 'Daily' : 'Monthly'} totals for the selected range
          </p>
        </div>
        <label className="text-sm text-gray-700 flex items-center gap-2">
          <input
            type="checkbox"
            checked={showLine}
            onChange={(event) => setShowLine(event.target.checked)}
          />
          Show line
        </label>
      </div>
      {note ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">{note}</p> : null}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Cost ${grain === 'day' ? 'per day' : 'per month'}`}
          className="w-full min-w-[480px] h-auto"
        >
          {yTicks.map((tick) => (
            <g key={tick.label}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#e5e7eb"
              />
              <text x={pad.left - 8} y={tick.y + 4} textAnchor="end" className="fill-gray-500" fontSize="11">
                ${tick.label}
              </text>
            </g>
          ))}
          {points.map((point) => (
            <rect
              key={point.date}
              x={point.x - barW / 2}
              y={point.y}
              width={barW}
              height={Math.max(1, pad.top + plotH - point.y)}
              fill={hover === point.index ? '#2563eb' : '#93c5fd'}
              onMouseEnter={() => setHover(point.index)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {showLine && points.length > 1 ? (
            <polyline
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="2"
              points={polyline}
              pointerEvents="none"
            />
          ) : null}
          {points.length <= 12
            ? points.map((point) => (
                <text
                  key={`tick-${point.date}`}
                  x={point.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-gray-500"
                  fontSize="10"
                >
                  {formatTick(point.date, grain)}
                </text>
              ))
            : [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].map((point) => (
                <text
                  key={`tick-${point.date}`}
                  x={point.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-gray-500"
                  fontSize="10"
                >
                  {formatTick(point.date, grain)}
                </text>
              ))}
        </svg>
        {hovered ? (
          <div className="mt-2 text-sm text-gray-800">
            <strong>{hovered.date}</strong>
            {' · '}${formatMoney(hovered.cost_usd)}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Hover a bar for date and amount.</p>
        )}
      </div>
    </div>
  );
}
