// Modularized Research API Route
// Uses the new modular architecture for research and content generation

import { NextRequest, NextResponse } from 'next/server';
import { getResearchOrchestrator } from '../../../lib/research/orchestrator/research-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userRequest = body.input || body.request;
    
    if (!userRequest) {
      return NextResponse.json({ error: 'Input or request is required' }, { status: 400 });
    }

    console.log('🔍 Starting research for:', userRequest);
    
    const orchestrator = getResearchOrchestrator();
    
    // Validate request
    const validation = orchestrator.validateRequest(userRequest);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        let controllerClosed = false;
        
        const sendSSE = (data: any) => {
          if (controllerClosed) {
            return false;
          }
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
            return true;
          } catch (error) {
            console.log('SSE controller closed, cannot send data:', error);
            controllerClosed = true;
            return false;
          }
        };
        
        try {
          // Use orchestrator to generate content with progress tracking
          const content = await orchestrator.generateContent(userRequest, (event) => {
            // Convert orchestrator events to frontend-compatible format
            if (event.type === 'step' && event.stepId === 'research') {
              sendSSE({
                type: "step",
                stepId: "research", 
                status: event.status,
                progress: event.progress,
                model: "perplexity/sonar"
              });
            } else if (event.type === 'step' && event.stepId === 'questions') {
              sendSSE({
                type: "step",
                stepId: "questions",
                status: event.status, 
                progress: event.progress,
                model: "claude-3.5-sonnet"
              });
            } else if (event.type === 'step' && event.stepId === 'services') {
              sendSSE({
                type: "step",
                stepId: "services",
                status: event.status, 
                progress: event.progress,
                model: "claude-3.5-sonnet"
              });
            } else if (event.type === 'step' && event.stepId === 'calculations') {
              sendSSE({
                type: "step",
                stepId: "calculations",
                status: event.status, 
                progress: event.progress,
                model: "local"
              });
            } else if (event.type === 'step' && event.stepId === 'content') {
              sendSSE({
                type: "step",
                stepId: "content",
                status: event.status, 
                progress: event.progress,
                model: "claude-3.5-sonnet"
              });
            } else if (event.type === 'progress') {
              // Progress updates without step changes
              sendSSE({
                type: "progress",
                progress: event.progress,
                sources: event.sources
              });
            } else if (event.type === 'complete') {
              // Format sources for frontend compatibility (expects "URL | Title | Quality" format)
              const formattedSources = event.content?.sources?.map((source: any) => 
                `${source.url} | ${source.title} | ${source.credibility.toUpperCase()}`
              ) || [];
              
              sendSSE({
                type: "complete",
                progress: 100,
                content: {
                  ...event.content,
                  sources: formattedSources
                }
              });
            } else if (event.type === 'error') {
              sendSSE({
                type: "error",
                error: event.error
              });
            }
          });
          
          controllerClosed = true;
          controller.close();
          
        } catch (error) {
          console.error('❌ Streaming error:', error);
          
          // Provide specific error messages for common issues
          let errorMessage = 'Unknown error occurred';
          if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
              errorMessage = 'API key is invalid or expired. Please check your OpenRouter API key configuration.';
            } else if (error.message.includes('Research-driven content generation failed')) {
              errorMessage = error.message;
            } else {
              errorMessage = error.message;
            }
          }
          
          sendSSE({
            type: "error",
            error: errorMessage
          });
          controllerClosed = true;
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}