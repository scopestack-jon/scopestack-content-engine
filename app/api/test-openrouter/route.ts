import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return Response.json({ error: "API key is required" }, { status: 400 })
    }

    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    })

    // Test with a simple generation
    const { text } = await generateText({
      model: openrouter("openai/gpt-4o-mini"),
      prompt: "Say 'OpenRouter connection successful' if you can read this.",
    })

    if (text.toLowerCase().includes("successful")) {
      return Response.json({ success: true, message: "OpenRouter connection successful" })
    } else {
      return Response.json({ error: "Unexpected response from OpenRouter" }, { status: 400 })
    }
  } catch (error) {
    console.error("OpenRouter test failed:", error)
    return Response.json({ error: "OpenRouter connection failed" }, { status: 400 })
  }
}
