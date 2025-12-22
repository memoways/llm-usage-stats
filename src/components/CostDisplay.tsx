'use client';

/**
 * CostDisplay Component
 *
 * Displays the total cost prominently in a card.
 */

interface CostDisplayProps {
  totalCost: number;
  lastUpdated: string;
}

export default function CostDisplay({ totalCost, lastUpdated }: CostDisplayProps) {
  // Format the last updated timestamp
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  // Format cost with 2 decimal places
  const formatCost = (cost: number): string => {
    return cost.toFixed(2);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          Total Cost
        </h2>
        <div className="text-4xl font-bold text-blue-900">
          ${formatCost(totalCost)}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Last updated: {formatTimestamp(lastUpdated)}
        </p>
      </div>
    </div>
  );
}
