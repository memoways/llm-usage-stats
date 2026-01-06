'use client';

/**
 * Monthly Report Page
 *
 * Displays aggregated cost data across all providers with month-over-month
 * percentage changes. Protected by URL token.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface ProviderSnapshot {
  month: string;
  provider: string;
  totalCostUsd: number;
  requests: number;
  breakdown: Array<{ model: string; cost_usd: number; requests: number }>;
  collectedAt: string;
}

interface MonthlySummary {
  month: string;
  totalCostUsd: number;
  previousMonthCost: number;
  changePercent: number;
  providerCount: number;
  reportUrl: string;
  collectedAt: string;
}

interface ReportData {
  month: string;
  found: boolean;
  message?: string;
  summary: MonthlySummary | null;
  providers: ProviderSnapshot[];
}

function ReportContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');
  const month = searchParams.get('month');

  useEffect(() => {
    async function fetchReport() {
      if (!token) {
        setError('Token manquant. Accès non autorisé.');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({ token });
        if (month) params.set('month', month);

        const response = await fetch(`/api/report?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors du chargement');
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [token, month]);

  // Format month for display (e.g., "2026-01" -> "Janvier 2026")
  const formatMonth = (monthStr: string) => {
    const [year, monthNum] = monthStr.split('-').map(Number);
    const date = new Date(year, monthNum - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Format change indicator with arrow and color
  const ChangeIndicator = ({ percent }: { percent: number }) => {
    const isPositive = percent > 0;
    const isZero = percent === 0;
    const arrow = isPositive ? '↑' : isZero ? '→' : '↓';
    const colorClass = isPositive
      ? 'text-rose-400'
      : isZero
      ? 'text-slate-400'
      : 'text-emerald-400';

    return (
      <span className={`font-mono font-bold ${colorClass}`}>
        {arrow} {Math.abs(percent).toFixed(1)}%
      </span>
    );
  };

  // Provider icon mapping
  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      openai: '🤖',
      anthropic: '🧠',
      elevenlabs: '🎤',
      deepgram: '🎧',
      openrouter: '🔀',
    };
    return icons[provider] || '📊';
  };

  // Provider display name
  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      elevenlabs: 'ElevenLabs',
      deepgram: 'Deepgram',
      openrouter: 'OpenRouter',
    };
    return names[provider] || provider;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400 font-light">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-rose-950/50 border border-rose-800 rounded-2xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-rose-200 mb-2">Accès refusé</h1>
          <p className="text-rose-300/70">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.found) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-amber-950/50 border border-amber-800 rounded-2xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">📭</div>
          <h1 className="text-xl font-semibold text-amber-200 mb-2">Aucune donnée</h1>
          <p className="text-amber-300/70">
            {data?.message || 'Aucune donnée trouvée pour ce mois. Lancez une collecte.'}
          </p>
        </div>
      </div>
    );
  }

  const { summary, providers } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <p className="text-indigo-400 font-mono text-sm uppercase tracking-widest mb-2">
            Rapport Mensuel
          </p>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text text-transparent">
            {formatMonth(data.month)}
          </h1>
          {summary?.collectedAt && (
            <p className="text-slate-500 text-sm mt-3">
              Collecté le {new Date(summary.collectedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </header>

        {/* Main Summary Card */}
        {summary && (
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-700/50 rounded-3xl p-8 mb-8 backdrop-blur-sm">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Total Cost */}
              <div className="text-center md:text-left">
                <p className="text-indigo-300/70 text-sm uppercase tracking-wide mb-1">
                  Coût Total
                </p>
                <p className="text-5xl font-bold font-mono">
                  ${summary.totalCostUsd.toFixed(2)}
                </p>
              </div>

              {/* Change from Previous */}
              <div className="text-center">
                <p className="text-indigo-300/70 text-sm uppercase tracking-wide mb-1">
                  vs. Mois Précédent
                </p>
                <div className="text-4xl">
                  <ChangeIndicator percent={summary.changePercent} />
                </div>
                <p className="text-slate-500 text-sm mt-1">
                  (${summary.previousMonthCost.toFixed(2)} → ${summary.totalCostUsd.toFixed(2)})
                </p>
              </div>

              {/* Provider Count */}
              <div className="text-center md:text-right">
                <p className="text-indigo-300/70 text-sm uppercase tracking-wide mb-1">
                  Providers Actifs
                </p>
                <p className="text-5xl font-bold font-mono">{summary.providerCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Provider Breakdown */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-300 mb-4">
            Détail par Provider
          </h2>

          {providers
            .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
            .map((provider) => (
              <div
                key={provider.provider}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(provider.provider)}</span>
                    <h3 className="text-lg font-semibold">{getProviderName(provider.provider)}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-indigo-300">
                      ${provider.totalCostUsd.toFixed(2)}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {provider.requests.toLocaleString()} requêtes
                    </p>
                  </div>
                </div>

                {/* Model breakdown */}
                {provider.breakdown.length > 0 && (
                  <div className="border-t border-slate-800 pt-4 mt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                      Top Modèles
                    </p>
                    <div className="grid gap-2">
                      {provider.breakdown
                        .sort((a, b) => b.cost_usd - a.cost_usd)
                        .slice(0, 5)
                        .map((model, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-sm bg-slate-800/50 rounded-lg px-4 py-2"
                          >
                            <span className="text-slate-300 font-mono truncate max-w-[60%]">
                              {model.model}
                            </span>
                            <div className="flex items-center gap-4">
                              <span className="text-slate-500">
                                {model.requests.toLocaleString()} req
                              </span>
                              <span className="font-mono text-indigo-300">
                                ${model.cost_usd.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-600 text-sm">
          <p>LLM Cost Tracker • Rapport généré automatiquement</p>
        </footer>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}



