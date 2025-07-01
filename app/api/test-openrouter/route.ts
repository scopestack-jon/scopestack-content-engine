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

    // Call OpenRouter API directly
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "x-ai/grok-3-mini-beta",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 1024,
        temperature: 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const generatedText = data.choices?.[0]?.message?.content || ""

    return Response.json({ text: generatedText })
  } catch (error) {
    console.error("OpenRouter test failed:", error)
    return Response.json({ error: "OpenRouter connection failed" }, { status: 400 })
  }
}
