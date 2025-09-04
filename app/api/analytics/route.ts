import { NextRequest, NextResponse } from 'next/server';
import { getRequestLogger } from '../../../lib/request-logger';

export async function GET(request: NextRequest) {
  try {
    const logger = getRequestLogger();
    
    // Get query params
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'analytics';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    if (action === 'logs') {
      // Return raw logs
      const logs = await logger.getRequestLogs(limit);
      return NextResponse.json({
        success: true,
        data: logs,
        count: logs.length
      });
    } else if (action === 'analytics') {
      // Return analytics summary
      const analytics = await logger.getAnalytics();
      return NextResponse.json({
        success: true,
        data: analytics
      });
    } else {
      return NextResponse.json({
        error: 'Invalid action. Use ?action=analytics or ?action=logs'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}