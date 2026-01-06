'use client';

/**
 * Monthly Collection Panel
 *
 * Provides manual trigger for monthly data collection and displays status.
 * Collapsible panel with collection controls and last collection info.
 */

import { useState, useEffect } from 'react';

interface CollectionSummary {
  totalCostUsd: number;
  previousMonthCost: number;
  changePercent: number;
  providerCount: number;
  reportUrl: string;
}

interface CollectionResult {
  provider: string;
  success: boolean;
  totalCost?: number;
  requests?: number;
  error?: string;
}

interface CollectionResponse {
  success: boolean;
  month: string;
  summary: CollectionSummary;
  results: CollectionResult[];
  emailSent: boolean;
}

interface ConfigStatus {
  configured: {
    notion: boolean;
    email: boolean;
    providers: string[];
  };
  currentMonth: string;
}

export default function MonthlyCollectionPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastCollection, setLastCollection] = useState<CollectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [token, setToken] = useState('');
  const [targetMonth, setTargetMonth] = useState('');
  const [includeEmail, setIncludeEmail] = useState(true);

  // Initialize target month to current month
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setTargetMonth(currentMonth);
  }, []);

  // Check configuration status when token is entered
  const checkConfiguration = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/collect?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur de configuration');
        setConfig(null);
      }
    } catch {
      setError('Erreur de connexion');
      setConfig(null);
    }
  };

  // Trigger monthly collection
  const triggerCollection = async () => {
    if (!token) {
      setError('Veuillez entrer le token secret');
      return;
    }

    setCollecting(true);
    setError(null);
    setLastCollection(null);

    try {
      const params = new URLSearchParams({
        token,
        month: targetMonth,
      });
      if (includeEmail) {
        params.set('send_email', 'true');
      }

      const response = await fetch(`/api/collect?${params.toString()}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Échec de la collecte');
      }

      setLastCollection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setCollecting(false);
    }
  };

  // Send email separately
  const sendEmail = async () => {
    if (!token) {
      setError('Veuillez entrer le token secret');
      return;
    }

    setSendingEmail(true);
    setError(null);

    try {
      const response = await fetch(`/api/send-report?token=${token}&month=${targetMonth}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Échec de l\'envoi');
      }

      alert(`Email envoyé avec succès à ${data.to}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'envoi');
    } finally {
      setSendingEmail(false);
    }
  };

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Change indicator component
  const ChangeIndicator = ({ percent }: { percent: number }) => {
    const isPositive = percent > 0;
    const isZero = percent === 0;
    const arrow = isPositive ? '↑' : isZero ? '→' : '↓';
    const colorClass = isPositive
      ? 'text-rose-500'
      : isZero
      ? 'text-gray-500'
      : 'text-emerald-500';

    return (
      <span className={`font-mono font-bold ${colorClass}`}>
        {arrow} {Math.abs(percent).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl shadow-lg mb-8 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div className="text-left">
            <h2 className="font-semibold text-lg">Collecte Mensuelle</h2>
            <p className="text-sm text-slate-400">
              Collecter et sauvegarder les données de tous les providers
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Token Input */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <label className="block text-sm text-slate-300 mb-2">
              Token Secret (COLLECT_SECRET_TOKEN)
            </label>
            <div className="flex gap-3">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Entrez le token secret..."
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={checkConfiguration}
                disabled={!token}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Vérifier
              </button>
            </div>
          </div>

          {/* Configuration Status */}
          {config && (
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Configuration</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className={config.configured.notion ? 'text-emerald-400' : 'text-rose-400'}>
                    {config.configured.notion ? '✓' : '✗'}
                  </span>
                  <span className="text-slate-300">Notion</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={config.configured.email ? 'text-emerald-400' : 'text-rose-400'}>
                    {config.configured.email ? '✓' : '✗'}
                  </span>
                  <span className="text-slate-300">Email</span>
                </div>
                <div className="col-span-2 text-slate-400">
                  Providers: {config.configured.providers.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Collection Controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Mois cible</label>
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeEmail"
                checked={includeEmail}
                onChange={(e) => setIncludeEmail(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <label htmlFor="includeEmail" className="text-sm text-slate-300">
                Envoyer email
              </label>
            </div>

            <button
              onClick={triggerCollection}
              disabled={collecting || !token}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {collecting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Collecte en cours...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Lancer la collecte
                </>
              )}
            </button>

            <button
              onClick={sendEmail}
              disabled={sendingEmail || !token}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingEmail ? 'Envoi...' : '📧 Envoyer email'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-rose-900/30 border border-rose-700 rounded-lg p-4">
              <p className="text-rose-300">
                <strong>Erreur:</strong> {error}
              </p>
            </div>
          )}

          {/* Collection Results */}
          {lastCollection && (
            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="text-xl">✓</span>
                <h3 className="font-semibold">Collecte réussie - {formatMonth(lastCollection.month)}</h3>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Coût Total</p>
                  <p className="text-2xl font-bold text-white font-mono">
                    ${lastCollection.summary.totalCostUsd.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Variation</p>
                  <p className="text-2xl">
                    <ChangeIndicator percent={lastCollection.summary.changePercent} />
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Providers</p>
                  <p className="text-2xl font-bold text-white">
                    {lastCollection.summary.providerCount}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Email</p>
                  <p className="text-2xl">
                    {lastCollection.emailSent ? '✅' : '⏭️'}
                  </p>
                </div>
              </div>

              {/* Provider Results */}
              <div className="space-y-2">
                <h4 className="text-sm text-slate-400 uppercase tracking-wide">Détail par provider</h4>
                <div className="grid gap-2">
                  {lastCollection.results.map((result) => (
                    <div
                      key={result.provider}
                      className={`flex items-center justify-between px-4 py-2 rounded-lg ${
                        result.success ? 'bg-slate-800/50' : 'bg-rose-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={result.success ? 'text-emerald-400' : 'text-rose-400'}>
                          {result.success ? '✓' : '✗'}
                        </span>
                        <span className="text-white capitalize">{result.provider}</span>
                      </div>
                      <div className="text-right">
                        {result.success ? (
                          <span className="text-slate-300 font-mono">
                            ${result.totalCost?.toFixed(2)} ({result.requests?.toLocaleString()} req)
                          </span>
                        ) : (
                          <span className="text-rose-400 text-sm">{result.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Link */}
              {lastCollection.summary.reportUrl && (
                <div className="pt-4 border-t border-slate-700">
                  <a
                    href={lastCollection.summary.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                  >
                    <span>📊</span>
                    Voir le rapport complet
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

