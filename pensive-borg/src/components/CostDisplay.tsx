'use client';

/**
 * CostDisplay Component
 *
 * Displays the total cost prominently in a card.
 * Handles special case of -1 meaning "usage data not available via API"
 */

interface CostDisplayProps {
  totalCost: number;
  lastUpdated: string;
  provider?: string;
}

export default function CostDisplay({ totalCost, lastUpdated, provider }: CostDisplayProps) {
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

  // Check if usage data is not available (indicated by -1)
  const isUsageNotAvailable = totalCost < 0;

  if (isUsageNotAvailable) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-amber-700 uppercase tracking-wide">
            ⚠️ Usage Data Not Available
          </h2>
          <div className="text-xl font-semibold text-amber-900">
            {provider === 'anthropic' 
              ? 'Anthropic does not expose usage data via their API'
              : 'Usage data not available via API'
            }
          </div>
          <p className="text-sm text-amber-700 mt-2">
            {provider === 'anthropic' && (
              <>
                Check your usage manually at:{' '}
                <a 
                  href="https://console.anthropic.com/settings/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium hover:text-amber-900"
                >
                  console.anthropic.com/settings/billing
                </a>
              </>
            )}
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Checked at: {formatTimestamp(lastUpdated)}
          </p>
        </div>
      </div>
    );
  }

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
