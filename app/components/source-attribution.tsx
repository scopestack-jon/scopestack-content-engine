import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Shield, BookOpen, Users } from "lucide-react"

interface Source {
  url: string
  title: string
  relevance: string
}

interface SourceAttributionProps {
  sources: Source[]
}

export function SourceAttribution({ sources }: SourceAttributionProps) {
  const getSourceIcon = (url: string) => {
    if (url.includes("cisco.com") || url.includes("microsoft.com") || url.includes("aws.amazon.com")) {
      return <Shield className="h-4 w-4 text-blue-600" />
    }
    if (url.includes("docs.") || url.includes("documentation")) {
      return <BookOpen className="h-4 w-4 text-green-600" />
    }
    return <Users className="h-4 w-4 text-purple-600" />
  }

  const getSourceType = (url: string) => {
    if (url.includes("cisco.com") || url.includes("microsoft.com") || url.includes("aws.amazon.com")) {
      return "Vendor Documentation"
    }
    if (url.includes("docs.") || url.includes("documentation")) {
      return "Technical Documentation"
    }
    if (url.includes("case-study") || url.includes("whitepaper")) {
      return "Case Study"
    }
    return "Industry Resource"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Research Sources & Attribution
        </CardTitle>
        <p className="text-sm text-gray-600">
          All content generated from these verified sources. No templates or canned data used.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.map((source, index) => (
          <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getSourceIcon(source.url)}
                  <Badge variant="outline" className="text-xs">
                    {getSourceType(source.url)}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm mb-2">{source.title}</h4>
                <p className="text-xs text-gray-600 mb-2">{source.relevance}</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {source.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Research Transparency</span>
          </div>
          <p className="text-xs text-gray-700">
            This content was generated through live web research conducted specifically for your technology solution.
            Each question and service recommendation is derived from current industry practices, vendor documentation,
            and professional services benchmarks found in the sources above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
