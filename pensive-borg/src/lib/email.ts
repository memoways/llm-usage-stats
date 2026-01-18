/**
 * Email Integration with Resend
 *
 * Handles sending monthly cost report emails.
 */

import { Resend } from 'resend';
import { MonthlySummary, ProviderSnapshot } from './notion';

// Lazy-initialize Resend client to avoid build-time errors
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Check if email is properly configured
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.REPORT_EMAIL_TO);
}

/**
 * Format month for display (e.g., "2026-01" -> "January 2026")
 */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Generate change indicator with arrow
 */
function getChangeIndicator(percent: number): { arrow: string; color: string; text: string } {
  if (percent > 0) {
    return { arrow: '↑', color: '#f43f5e', text: `+${percent.toFixed(1)}%` };
  } else if (percent < 0) {
    return { arrow: '↓', color: '#10b981', text: `${percent.toFixed(1)}%` };
  }
  return { arrow: '→', color: '#64748b', text: '0%' };
}

/**
 * Provider icon mapping
 */
function getProviderEmoji(provider: string): string {
  const icons: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
    elevenlabs: '🎤',
    deepgram: '🎧',
    openrouter: '🔀',
  };
  return icons[provider] || '📊';
}

/**
 * Generate HTML email template for monthly report
 */
export function generateReportEmailHtml(
  summary: MonthlySummary,
  providers: ProviderSnapshot[]
): string {
  const change = getChangeIndicator(summary.changePercent);

  const providerRows = providers
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
    .map(
      (p) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b;">
          ${getProviderEmoji(p.provider)} ${p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
        </td>
        <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #1e293b; font-family: monospace;">
          $${p.totalCostUsd.toFixed(2)}
        </td>
        <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #1e293b; color: #64748b;">
          ${p.requests.toLocaleString()} req
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Mensuel LLM - ${formatMonth(summary.month)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="color: #818cf8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">
        Rapport Mensuel
      </p>
      <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 600;">
        ${formatMonth(summary.month)}
      </h1>
    </div>

    <!-- Main Summary Card -->
    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 16px; padding: 32px; margin-bottom: 24px;">
      
      <!-- Total Cost -->
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="color: rgba(199, 210, 254, 0.7); font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">
          Coût Total
        </p>
        <p style="color: #ffffff; font-size: 48px; font-weight: bold; font-family: monospace; margin: 0;">
          $${summary.totalCostUsd.toFixed(2)}
        </p>
      </div>

      <!-- Change Indicator -->
      <div style="text-align: center; padding: 16px; background: rgba(15, 23, 42, 0.5); border-radius: 12px;">
        <p style="color: rgba(199, 210, 254, 0.7); font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">
          vs. Mois Précédent
        </p>
        <p style="color: ${change.color}; font-size: 32px; font-weight: bold; font-family: monospace; margin: 0;">
          ${change.arrow} ${change.text}
        </p>
        <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0;">
          $${summary.previousMonthCost.toFixed(2)} → $${summary.totalCostUsd.toFixed(2)}
        </p>
      </div>
    </div>

    <!-- Provider Breakdown -->
    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 16px; overflow: hidden;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #334155;">
        <h2 style="color: #e2e8f0; font-size: 16px; margin: 0; font-weight: 600;">
          Détail par Provider
        </h2>
      </div>
      <table style="width: 100%; border-collapse: collapse; color: #e2e8f0; font-size: 14px;">
        <thead>
          <tr style="background: rgba(15, 23, 42, 0.5);">
            <th style="padding: 12px 16px; text-align: left; color: #64748b; font-weight: 500;">Provider</th>
            <th style="padding: 12px 16px; text-align: right; color: #64748b; font-weight: 500;">Coût</th>
            <th style="padding: 12px 16px; text-align: right; color: #64748b; font-weight: 500;">Requêtes</th>
          </tr>
        </thead>
        <tbody>
          ${providerRows}
        </tbody>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-top: 32px;">
      <a href="${summary.reportUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
        Voir le Rapport Complet →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #1e293b;">
      <p style="color: #475569; font-size: 12px; margin: 0;">
        LLM Cost Tracker • Rapport généré automatiquement
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email for fallback
 */
export function generateReportEmailText(
  summary: MonthlySummary,
  providers: ProviderSnapshot[]
): string {
  const change = summary.changePercent > 0 ? `+${summary.changePercent.toFixed(1)}%` : `${summary.changePercent.toFixed(1)}%`;

  const providerList = providers
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
    .map((p) => `  • ${p.provider}: $${p.totalCostUsd.toFixed(2)} (${p.requests.toLocaleString()} requêtes)`)
    .join('\n');

  return `
RAPPORT MENSUEL LLM - ${formatMonth(summary.month).toUpperCase()}
${'='.repeat(50)}

COÛT TOTAL: $${summary.totalCostUsd.toFixed(2)}
VARIATION: ${change} (vs. $${summary.previousMonthCost.toFixed(2)} le mois précédent)

DÉTAIL PAR PROVIDER:
${providerList}

---
Voir le rapport complet: ${summary.reportUrl}

LLM Cost Tracker
  `.trim();
}

/**
 * Send the monthly report email
 */
export async function sendReportEmail(
  summary: MonthlySummary,
  providers: ProviderSnapshot[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email not configured. Set RESEND_API_KEY and REPORT_EMAIL_TO.' };
  }

  const to = process.env.REPORT_EMAIL_TO!;
  const from = process.env.RESEND_FROM_EMAIL || 'LLM Cost Tracker <onboarding@resend.dev>';

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from,
      to: [to],
      subject: `📊 Rapport LLM ${formatMonth(summary.month)} - $${summary.totalCostUsd.toFixed(2)}`,
      html: generateReportEmailHtml(summary, providers),
      text: generateReportEmailText(summary, providers),
    });

    if (error) {
      console.error('[Email] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Exception:', err);
    return { success: false, error: errorMessage };
  }
}

