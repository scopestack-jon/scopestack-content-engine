// Research API Configuration Constants

export const JSON_RESPONSE_INSTRUCTION = `

CRITICAL RESPONSE FORMAT:
- Return ONLY valid JSON
- NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO explanations before or after the JSON
- NO comments within the JSON
- Start response with { and end with }
- Complete the entire JSON structure
- Validate JSON syntax before returning
- DO NOT nest your response inside fields like "email_migration_research" or "research_findings"
- Use a flat structure with top-level fields

CRITICAL FOR URLS:
- Always use properly formatted URLs (e.g., "https://example.com")
- Never use double quotes within double quotes (e.g., ""https://example.com"")
- If you don't know the exact URL, use "https://example.com" as a placeholder
- Format URLs in sources as: { "url": "https://example.com", "title": "Source Title" }

CRITICAL FOR NESTED STRUCTURES:
- Ensure all arrays and objects are properly closed
- Check that all opening braces { have matching closing braces }
- Check that all opening brackets [ have matching closing brackets ]
- Ensure all property names are in double quotes
- Ensure all string values are in double quotes

RESPOND WITH PURE JSON ONLY.
`;

export const API_TIMEOUT = 60000; // 60 seconds
export const SERVICE_GENERATION_TIMEOUT = 120000; // 2 minutes for complex service generation
export const MAX_RETRY_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second
export const MAX_RETRY_DELAY = 5000; // 5 seconds

export const PERPLEXITY_MODEL = "perplexity/sonar";
export const DEFAULT_CONTENT_MODEL = "anthropic/claude-3.5-sonnet";