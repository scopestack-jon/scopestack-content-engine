import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const content = await request.json()

    // Get ScopeStack settings from request headers or environment
    const scopeStackUrl = process.env.SCOPESTACK_URL
    const scopeStackToken = process.env.SCOPESTACK_TOKEN

    if (!scopeStackUrl || !scopeStackToken) {
      return Response.json({ error: "ScopeStack not configured" }, { status: 400 })
    }

    // Push content to ScopeStack
    const response = await fetch(`${scopeStackUrl}/api/content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${scopeStackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        technology: content.technology,
        questions: content.questions,
        services: content.services,
        totalHours: content.totalHours,
        sources: content.sources,
        generatedAt: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return Response.json({ success: true, scopeStackId: result.id })
    } else {
      return Response.json({ error: "Failed to push to ScopeStack" }, { status: 400 })
    }
  } catch (error) {
    console.error("ScopeStack push failed:", error)
    return Response.json({ error: "ScopeStack push failed" }, { status: 500 })
  }
}
