"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"

interface ResearchStep {
  id: string
  title: string
  status: "pending" | "active" | "completed" | "error"
  model?: string
  sources?: string[]
}

interface ResearchProgressProps {
  steps: ResearchStep[]
  progress: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function ResearchProgress({ steps, progress, isCollapsed = false, onToggleCollapse }: ResearchProgressProps) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "active":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-200 bg-green-50"
      case "active":
        return "border-blue-200 bg-blue-50"
      case "error":
        return "border-red-200 bg-red-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  if (isCollapsed) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">Research Process Completed</div>
                <div className="text-sm text-gray-600">
                  {steps.filter((s) => s.status === "completed").length} of {steps.length} steps completed
                </div>
              </div>
            </div>
            <Button onClick={onToggleCollapse} variant="outline" size="sm" className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              Show Details
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            Research in Progress
          </CardTitle>
          {onToggleCollapse && (
            <Button onClick={onToggleCollapse} variant="outline" size="sm" className="flex items-center gap-2">
              <ChevronUp className="h-4 w-4" />
              Collapse
            </Button>
          )}
        </div>
        <Progress value={progress} className="w-full" />
        <div className="text-sm text-gray-600">{progress}% complete</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className={`p-4 rounded border ${getStepColor(step.status)}`}>
            <div className="flex items-center gap-3 mb-2">
              {getStepIcon(step.status)}
              <div className="flex-1">
                <div className="font-medium">{step.title}</div>
                {step.model && <div className="text-sm text-gray-600">Using {step.model}</div>}
              </div>
              <Badge variant={step.status === "completed" ? "default" : "secondary"}>Step {index + 1}</Badge>
            </div>
            {step.sources && step.sources.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Sources:</div>
                <div className="flex flex-wrap gap-1">
                  {step.sources.map((source, sourceIndex) => (
                    <Badge key={sourceIndex} variant="outline" className="text-xs">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
