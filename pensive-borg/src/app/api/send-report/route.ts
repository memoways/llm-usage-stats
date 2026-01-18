/**
 * Send Report Email API
 *
 * Sends the monthly cost report email via Resend.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMonthlySummary,
  getMonthSnapshots,
  getCurrentMonth,
  isNotionConfigured,
} from '@/lib/notion';
import { sendReportEmail, isEmailConfigured } from '@/lib/email';

/**
 * POST /api/send-report
 *
 * Sends the monthly report email.
 *
 * Query params:
 * - token: Secret token for authorization (uses COLLECT_SECRET_TOKEN)
 * - month: Optional month (format: "2026-01"). Defaults to current month.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.COLLECT_SECRET_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Server configuration error: COLLECT_SECRET_TOKEN not set' },
        { status: 500 }
      );
    }

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Check configurations
    if (!isNotionConfigured()) {
      return NextResponse.json(
        { error: 'Notion is not configured' },
        { status: 500 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email is not configured. Set RESEND_API_KEY and REPORT_EMAIL_TO.' },
        { status: 500 }
      );
    }

    const targetMonth = searchParams.get('month') || getCurrentMonth();

    // Fetch data from Notion
    const [summaryResult, snapshots] = await Promise.all([
      getMonthlySummary(targetMonth),
      getMonthSnapshots(targetMonth),
    ]);

    if (!summaryResult) {
      return NextResponse.json(
        { error: `No summary found for month ${targetMonth}. Run a collection first.` },
        { status: 404 }
      );
    }

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: `No provider data found for month ${targetMonth}. Run a collection first.` },
        { status: 404 }
      );
    }

    // Send the email
    const result = await sendReportEmail(summaryResult.data, snapshots);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId: result.id,
      month: targetMonth,
      to: process.env.REPORT_EMAIL_TO,
    });
  } catch (error) {
    console.error('[Send Report] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/send-report
 *
 * Returns email configuration status.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const expectedToken = process.env.COLLECT_SECRET_TOKEN;

  if (token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    configured: isEmailConfigured(),
    to: process.env.REPORT_EMAIL_TO ? '***' + process.env.REPORT_EMAIL_TO.slice(-10) : null,
  });
}



