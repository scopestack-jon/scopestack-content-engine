// Test script for the research API endpoint using SSE
import fetch from 'node-fetch';

async function testResearchEndpoint() {
  console.log('Testing research endpoint...');
  
  const response = await fetch('http://localhost:3001/api/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: 'Microsoft Email Migration to Office 365 for a Hospital with 1000 users',
      models: {
        parsing: 'anthropic/claude-3.5-sonnet',
        research: 'anthropic/claude-3.5-sonnet',
        analysis: 'anthropic/claude-3.5-sonnet',
        content: 'anthropic/claude-3.5-sonnet'
      }
    }),
  });

  if (!response.ok) {
    console.error(`Error: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    return;
  }

  // For node-fetch, we need to handle the stream differently
  const body = response.body;
  
  let buffer = '';
  
  try {
    // Set up event handlers for the stream
    body.on('data', (chunk) => {
      const text = chunk.toString();
      buffer += text;
      
      // Process any complete events
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log(`Event: ${data.type}`);
            
            if (data.type === 'complete') {
              console.log('Content received:');
              console.log(`- Technology: ${data.content.technology}`);
              console.log(`- Questions: ${data.content.questions.length}`);
              console.log(`- Services: ${data.content.services.length}`);
              console.log(`- Sources: ${data.content.sources.length}`);
              console.log(`- Total Hours: ${data.content.totalHours}`);
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
            console.error('Raw data:', line.slice(6));
          }
        }
      }
    });
    
    body.on('end', () => {
      console.log('Stream complete');
    });
    
    body.on('error', (error) => {
      console.error('Stream error:', error);
    });
  } catch (error) {
    console.error('Error reading stream:', error);
  }
}

testResearchEndpoint().catch(console.error); 