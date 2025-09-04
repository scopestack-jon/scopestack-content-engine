import { NextRequest, NextResponse } from 'next/server';
import { getRequestLogger } from '../../../lib/request-logger';

export async function GET(request: NextRequest) {
  try {
    const logger = getRequestLogger();
    
    // Get query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    // Return raw logs
    const logs = await logger.getRequestLogs(limit);
    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch request logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}