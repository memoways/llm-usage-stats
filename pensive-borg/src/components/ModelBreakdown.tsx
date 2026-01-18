'use client';

/**
 * ModelBreakdown Component
 *
 * Displays a table with cost breakdown by model.
 * Shows native model names from each LLM provider.
 */

import { ModelCost } from '@/lib/types';

interface ModelBreakdownProps {
  breakdown: ModelCost[];
}

export default function ModelBreakdown({ breakdown }: ModelBreakdownProps) {
  // Format cost with 2 decimal places
  const formatCost = (cost: number): string => {
    return cost.toFixed(2);
  };

  // Calculate percentage of total
  const totalCost = breakdown.reduce((sum, item) => sum + item.cost_usd, 0);
  const calculatePercentage = (cost: number): string => {
    if (totalCost === 0) return '0';
    return ((cost / totalCost) * 100).toFixed(1);
  };

  if (breakdown.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
        No cost data available for this period.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          Cost Breakdown by Model
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requests
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost (USD)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % of Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {breakdown.map((item, index) => (
              <tr
                key={`${item.model}-${index}`}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {item.model}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">
                  {item.requests.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                  ${formatCost(item.cost_usd)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">
                  {calculatePercentage(item.cost_usd)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                {breakdown.reduce((sum, item) => sum + item.requests, 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                ${formatCost(totalCost)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
