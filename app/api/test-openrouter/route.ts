import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { prompt, model } = await request.json()

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return Response.json({ error: "OpenRouter API key not configured" }, { status: 500 })
    }

    // Add JSON formatting instructions to the prompt
    const jsonInstructions = `
IMPORTANT: Return ONLY valid JSON. Do NOT include markdown code blocks (no \`\`\`json or \`\`\`). 
Start with { and end with }. Ensure all JSON syntax is correct.
`;
    const enhancedPrompt = prompt + jsonInstructions;

    console.log(`Calling OpenRouter with model: ${model || "x-ai/grok-3-mini-beta"}`);

    // Call OpenRouter API directly
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://scopestack-content-engine.vercel.app/",
        "X-Title": "ScopeStack Content Engine"
      },
      body: JSON.stringify({
        model: model || "x-ai/grok-3-mini-beta",
        messages: [
          { role: "user", content: enhancedPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter API error: ${response.status} ${errorText}`)
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const generatedText = data.choices?.[0]?.message?.content || ""
    
    // Clean the response if it contains markdown code blocks
    const cleanedText = generatedText
      .replace(/```json\s*([\s\S]*?)\s*```/g, '$1')
      .replace(/```\s*([\s\S]*?)\s*```/g, '$1')
      .trim();
    
    console.log(`OpenRouter response received, length: ${cleanedText.length} characters`);

    return Response.json({ text: cleanedText })
  } catch (error) {
    console.error("OpenRouter test failed:", error)
    return Response.json({ error: `OpenRouter connection failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 })
  }
}
