// Modularized Research API Route
// Uses the new modular architecture for research and content generation

import { NextRequest, NextResponse } from 'next/server';
import { getResearchOrchestrator } from '../../../lib/research/orchestrator/research-orchestrator';
import { getResearchOrchestratorV2 } from '../../../lib/research/orchestrator/research-orchestrator-v2';
import { useV2Orchestration } from '../../../lib/research/config/feature-flags';
import { getRequestLogger, getScopeStackUserInfo, getSessionId } from '../../../lib/request-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logger = getRequestLogger();
  let requestId: string | undefined;

  try {
    const body = await request.json();
    const userRequest = body.input || body.request;
    const scopeStackApiKey = body.scopeStackApiKey;
    const scopeStackApiUrl = body.scopeStackApiUrl;
    
    if (!userRequest) {
      return NextResponse.json({ error: 'Input or request is required' }, { status: 400 });
    }

    // Verify authentication - require either OAuth token or legacy API key
    if (!scopeStackApiKey) {
      return NextResponse.json({ 
        error: 'Authentication required. Please sign in to ScopeStack to use the content engine.' 
      }, { status: 401 });
    }

    // Additional validation: if it looks like an OAuth token, verify it's not expired
    // OAuth tokens are much longer and contain JWT-like structure vs API keys
    if (scopeStackApiKey.length > 500) {
      try {
        // Try to decode as base64 to check if it's a session token
        const decoded = JSON.parse(atob(scopeStackApiKey));
        if (decoded.expiresAt && decoded.expiresAt < Date.now()) {
          return NextResponse.json({ 
            error: 'Session expired. Please sign in again to continue.' 
          }, { status: 401 });
        }
      } catch (e) {
        // Not a valid session token format, continue with regular processing
      }
    }

    // Get user info from ScopeStack if credentials provided
    const { userName, accountSlug } = await getScopeStackUserInfo(scopeStackApiKey, scopeStackApiUrl);
    const sessionId = getSessionId(request);
    
    // Don't log "started" entries - only log completed solutions

    console.log('🔍 Starting research for:', userRequest);
    
    // Use v2 orchestrator if enabled
    const useV2 = useV2Orchestration();
    console.log(`🔧 DEBUG: useV2Orchestration() returned: ${useV2}`);
    console.log(`📌 Using ${useV2 ? 'V2 (service-first)' : 'V1 (legacy)'} orchestrator`);
    
    const orchestrator = useV2 ? getResearchOrchestratorV2() : getResearchOrchestrator();
    console.log(`🔧 DEBUG: Orchestrator instance type: ${orchestrator.constructor.name}`);
    
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
            } else if (event.type === 'step' && event.stepId === 'content') {
              sendSSE({
                type: "step",
                stepId: "content",
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

              // Log completed solution with user attribution (fire and forget to avoid blocking)
              logger.logRequest({
                userRequest,
                requestType: 'research', 
                sessionId,
                status: 'completed',
                duration: Date.now() - startTime,
                userName,
                accountSlug
              }).catch(err => console.warn('Failed to log solution:', err));
            } else if (event.type === 'error') {
              sendSSE({
                type: "error",
                error: event.error
              });
            } else if (event.type === 'progress') {
              sendSSE({
                type: "progress",
                progress: event.progress,
                sources: event.sources || []
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

          // Don't log errors - only successful solutions
          
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
    
    // Don't log route errors - only successful solutions
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}