import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url, token } = await request.json()

    if (!url || !token) {
      return Response.json({ error: "URL and token are required" }, { status: 400 })
    }

    // Test connection to ScopeStack API
    const response = await fetch(`${url}/api/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      return Response.json({ success: true, message: "ScopeStack connection successful" })
    } else {
      return Response.json({ error: "ScopeStack connection failed" }, { status: 400 })
    }
  } catch (error) {
    console.error("ScopeStack test failed:", error)
    return Response.json({ error: "ScopeStack connection failed" }, { status: 400 })
  }
}
