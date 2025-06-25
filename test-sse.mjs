// Simple Node.js script to test the SSE implementation
import fetch from 'node-fetch';

async function testSSE() {
  console.log('Testing SSE implementation...');
  
  try {
    const response = await fetch('http://localhost:3006/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'Microsoft Email Migration to Office 365 for a Hospital with 1000 users',
        models: {
          research: 'anthropic/claude-3-sonnet',
          analysis: 'anthropic/claude-3-sonnet',
          content: 'anthropic/claude-3-sonnet',
          format: 'openai/gpt-4o',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    console.log('Response received, reading stream...');
    
    // Use response.body as a stream directly
    for await (const chunk of response.body) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('Event received:', data.type);
            
            if (data.type === 'step') {
              console.log(`Step: ${data.stepId}, Status: ${data.status}, Progress: ${data.progress}%`);
            } else if (data.type === 'complete') {
              console.log('Content generation complete!');
            }
          } catch (e) {
            if (line.trim()) {
              console.error('Error parsing SSE data:', e);
              console.error('Raw line:', line);
            }
          }
        }
      }
    }
    
    console.log('Stream complete');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSSE(); 