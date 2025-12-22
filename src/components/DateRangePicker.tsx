'use client';

/**
 * DateRangePicker Component
 *
 * Date range selector with quick preset buttons (week, month, year)
 * and custom date inputs.
 */

import { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  /**
   * Get date range for a preset period
   */
  const getPresetDates = (preset: 'week' | 'month' | 'year'): { start: string; end: string } => {
    const today = new Date();
    const start = new Date(today);

    switch (preset) {
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  };

  /**
   * Handle preset button click
   */
  const handlePresetClick = (preset: 'week' | 'month' | 'year') => {
    const { start, end } = getPresetDates(preset);
    onStartDateChange(start);
    onEndDateChange(end);
    setActivePreset(preset);
  };

  /**
   * Handle custom date change
   */
  const handleCustomDateChange = () => {
    setActivePreset(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Preset Buttons */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Quick Select</label>
        <div className="flex gap-2">
          <button
            onClick={() => handlePresetClick('week')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activePreset === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last Week
          </button>
          <button
            onClick={() => handlePresetClick('month')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activePreset === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => handlePresetClick('year')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activePreset === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last Year
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Custom Range</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="start-date" className="text-xs text-gray-600">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                onStartDateChange(e.target.value);
                handleCustomDateChange();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="end-date" className="text-xs text-gray-600">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                onEndDateChange(e.target.value);
                handleCustomDateChange();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
