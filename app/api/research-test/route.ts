// Test endpoint for local development that bypasses OAuth
// This endpoint should be removed or protected in production

import { NextRequest, NextResponse } from 'next/server';
import { getResearchOrchestrator } from '../../../lib/research/orchestrator/research-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userRequest = body.input || body.request || 'Office 365 migration for 100 mailboxes';
    
    console.log('🧪 TEST MODE: Running research without authentication');
    console.log('📝 Request:', userRequest);
    
    const orchestrator = getResearchOrchestrator();
    
    // Generate content without authentication
    const content = await orchestrator.generateContent(userRequest);
    
    console.log('✅ Content generated successfully');
    console.log('📊 Services:', content.services?.length);
    console.log('❓ Questions:', content.questions?.length);
    console.log('🧮 Calculations:', content.calculations?.length);
    console.log('📈 Survey Calculations:', content.surveyCalculations?.length);
    
    // Log service quantities for debugging
    content.services?.forEach(service => {
      if (service.quantity && service.quantity > 1) {
        console.log(`  ✅ ${service.name}: quantity=${service.quantity}, baseHours=${service.baseHours}`);
      }
    });
    
    return NextResponse.json(content);
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for easy browser testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || 'Office 365 migration for 100 mailboxes';
  
  console.log('🧪 TEST MODE (GET): Running research for:', query);
  
  try {
    // Add timeout to prevent browser timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
    });
    
    const orchestrator = getResearchOrchestrator();
    const contentPromise = orchestrator.generateContent(query);
    
    const content = await Promise.race([contentPromise, timeoutPromise]) as any;
    
    // Return a formatted HTML response for browser viewing
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Research Test Results</title>
          <style>
            body { font-family: monospace; margin: 20px; background: #1a1a1a; color: #fff; }
            h2 { color: #4ade80; }
            .section { margin: 20px 0; padding: 10px; background: #262626; border-radius: 5px; }
            .service { margin: 10px 0; padding: 10px; background: #333; }
            .quantity { color: #fbbf24; }
            .calculation { color: #60a5fa; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>🧪 Research Test Results</h1>
          <div class="section">
            <h2>Query</h2>
            <p>${query}</p>
          </div>
          
          <div class="section">
            <h2>Summary</h2>
            <p>Technology: ${content.technology}</p>
            <p>Total Hours: ${content.totalHours}</p>
            <p>Services: ${content.services?.length || 0}</p>
            <p>Questions: ${content.questions?.length || 0}</p>
            <p>Calculations: ${content.surveyCalculations?.length || 0}</p>
          </div>
          
          <div class="section">
            <h2>Services with Quantities</h2>
            ${content.services?.map(s => `
              <div class="service">
                <strong>${s.name}</strong><br>
                Hours: ${s.hours} | 
                <span class="quantity">Quantity: ${s.quantity || 1}</span> | 
                Base Hours: ${s.baseHours || s.hours}<br>
                ${s.calculationIds ? `Calculations: ${s.calculationIds.join(', ')}` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="section">
            <h2>Survey Calculations</h2>
            ${content.surveyCalculations?.map(c => `
              <div class="calculation">
                <strong>${c.calculation_id}</strong>: ${c.value}<br>
                ${c.description || ''}
              </div>
            `).join('') || 'None'}
          </div>
          
          <div class="section">
            <h2>Questions</h2>
            ${content.questions?.map(q => `
              <div>
                ${q.text} (${q.type})<br>
                Slug: ${q.slug}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
    
  } catch (error) {
    return new NextResponse(
      `<h1>Error</h1><pre>${error}</pre>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}