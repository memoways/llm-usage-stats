/**
 * Report Data API
 *
 * Fetches monthly report data from Notion for display on the report page.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMonthlySummary,
  getMonthSnapshots,
  getAllMonthlySummaries,
  getCurrentMonth,
  isNotionConfigured,
} from '@/lib/notion';

/**
 * GET /api/report
 *
 * Fetches report data for a specific month or historical overview.
 *
 * Query params:
 * - token: Secret token for authorization
 * - month: Optional month (format: "2026-01"). Defaults to current month.
 * - history: Optional "true" to get all historical summaries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.REPORT_SECRET_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Server configuration error: REPORT_SECRET_TOKEN not set' },
        { status: 500 }
      );
    }

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    if (!isNotionConfigured()) {
      return NextResponse.json(
        { error: 'Notion is not configured' },
        { status: 500 }
      );
    }

    const includeHistory = searchParams.get('history') === 'true';

    if (includeHistory) {
      // Return all historical summaries
      const summaries = await getAllMonthlySummaries();
      return NextResponse.json({
        history: summaries,
      });
    }

    // Get data for specific month
    const targetMonth = searchParams.get('month') || getCurrentMonth();

    // Fetch summary and provider snapshots
    const [summaryResult, snapshots] = await Promise.all([
      getMonthlySummary(targetMonth),
      getMonthSnapshots(targetMonth),
    ]);

    if (!summaryResult && snapshots.length === 0) {
      return NextResponse.json({
        month: targetMonth,
        found: false,
        message: `No data found for month ${targetMonth}. Run a collection first.`,
      });
    }

    return NextResponse.json({
      month: targetMonth,
      found: true,
      summary: summaryResult?.data || null,
      providers: snapshots,
    });
  } catch (error) {
    console.error('[Report API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch report' },
      { status: 500 }
    );
  }
}



