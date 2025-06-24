import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Key, ExternalLink, CheckCircle } from "lucide-react"

export function SetupGuide() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          OpenRouter Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This application uses OpenRouter to access multiple AI models for enhanced research quality.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="text-sm font-medium">Setup Steps:</div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                1
              </Badge>
              <span>Get your OpenRouter API key from</span>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                openrouter.ai/keys
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                2
              </Badge>
              <span>Add to your environment variables:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">OPENROUTER_API_KEY=your_key_here</code>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                3
              </Badge>
              <span>Restart your development server</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-sm font-medium text-blue-800 mb-1">Models Used:</div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>
                • <strong>GPT-4o:</strong> Technology parsing and final formatting
              </div>
              <div>
                • <strong>Claude-3.5-Sonnet:</strong> Research and content generation
              </div>
              <div>
                • <strong>GPT-4-Turbo:</strong> Analysis and insights
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
