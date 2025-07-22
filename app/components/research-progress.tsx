"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, Loader2, ChevronDown, ChevronUp, AlertCircle, Brain, Search, FileText } from "lucide-react"

interface ResearchStep {
  id: string
  title: string
  status: "pending" | "active" | "completed" | "error"
  model?: string
  sources?: string[]
  confidence?: number
  insights?: string[]
  sourceCount?: number
  highCredibilityCount?: number
  startTime?: number
  estimatedDuration?: number
}

interface ResearchProgressProps {
  steps: ResearchStep[]
  progress: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function ResearchProgress({ steps, progress, isCollapsed = false, onToggleCollapse }: ResearchProgressProps) {
  const [elapsedTime, setElapsedTime] = useState<Record<string, number>>({})

  // Track elapsed time for active steps
  useEffect(() => {
    const interval = setInterval(() => {
      const activeStep = steps.find(step => step.status === "active")
      if (activeStep && activeStep.startTime) {
        setElapsedTime(prev => ({
          ...prev,
          [activeStep.id]: Date.now() - activeStep.startTime
        }))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [steps])

  const getStepIcon = (status: string, stepId: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600 animate-pulse" />
      case "active":
        return getActiveStepIcon(stepId)
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600 animate-pulse" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getActiveStepIcon = (stepId: string) => {
    const icons = {
      research: <Search className="h-5 w-5 text-blue-600 animate-spin" />,
      content: <Brain className="h-5 w-5 text-purple-600 animate-pulse" />,
      format: <FileText className="h-5 w-5 text-orange-600 animate-bounce" />
    }
    return icons[stepId as keyof typeof icons] || <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
  }

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const getEstimatedTimeRemaining = (stepId: string, estimatedDuration?: number): string => {
    if (!estimatedDuration) return ""
    const elapsed = elapsedTime[stepId] || 0
    const remaining = Math.max(0, estimatedDuration - elapsed)
    return remaining > 0 ? `~${formatTime(remaining)} remaining` : "Finishing up..."
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-200 bg-gradient-to-r from-green-50 to-green-100 shadow-sm"
      case "active":
        return "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 shadow-md animate-pulse"
      case "error":
        return "border-red-200 bg-gradient-to-r from-red-50 to-red-100 shadow-sm"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  if (isCollapsed) {
    return (
      <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-green-100">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <div>
                <div className="font-medium text-green-800">Research Process Completed</div>
                <div className="text-sm text-green-600">
                  {steps.filter((s) => s.status === "completed").length} of {steps.length} steps completed successfully
                </div>
              </div>
            </div>
            <Button onClick={onToggleCollapse} variant="outline" size="sm" className="flex items-center gap-2 hover:bg-white/50">
              <ChevronDown className="h-4 w-4" />
              Show Details
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeStep = steps.find(step => step.status === "active")
  const completedSteps = steps.filter(step => step.status === "completed").length
  const totalSteps = steps.length

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <div className="h-3 w-3 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-800">AI Research in Progress</div>
              <div className="text-sm text-blue-600 font-normal">
                Step {completedSteps + 1} of {totalSteps} • {activeStep?.title || "Processing..."}
              </div>
            </div>
          </CardTitle>
          {onToggleCollapse && (
            <Button onClick={onToggleCollapse} variant="outline" size="sm" className="flex items-center gap-2 hover:bg-white/50">
              <ChevronUp className="h-4 w-4" />
              Collapse
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="w-full h-3" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{progress}% complete</span>
            {activeStep && activeStep.estimatedDuration && (
              <span className="text-blue-600 font-medium">
                {getEstimatedTimeRemaining(activeStep.id, activeStep.estimatedDuration)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`p-4 rounded-lg border transition-all duration-500 ${getStepColor(step.status)} ${
              step.status === "active" ? "scale-105 transform" : ""
            }`}
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-shrink-0">
                {getStepIcon(step.status, step.id)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{step.title}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {step.model && <span>Using {step.model}</span>}
                  {step.status === "active" && step.startTime && (
                    <span className="text-blue-600 font-medium">
                      • {formatTime(elapsedTime[step.id] || 0)} elapsed
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={step.status === "completed" ? "default" : step.status === "active" ? "secondary" : "outline"}
                  className={step.status === "active" ? "animate-pulse" : ""}
                >
                  {index + 1}/{totalSteps}
                </Badge>
                {step.status === "completed" && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
            {/* Enhanced research metrics for active research */}
            {step.status === "completed" && step.id === "research" && (
              <div className="mt-3 space-y-2">
                {step.confidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Research Confidence:</span>
                    <Badge variant={step.confidence >= 0.8 ? "default" : step.confidence >= 0.6 ? "secondary" : "outline"}>
                      {Math.round(step.confidence * 100)}%
                    </Badge>
                  </div>
                )}
                
                {step.sourceCount && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Sources Found:</span>
                    <Badge variant="outline">{step.sourceCount} sources</Badge>
                    {step.highCredibilityCount && step.highCredibilityCount > 0 && (
                      <Badge variant="default">{step.highCredibilityCount} high-credibility</Badge>
                    )}
                  </div>
                )}
                
                {step.insights && step.insights.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Key Insights:</div>
                    <div className="space-y-1">
                      {step.insights.slice(0, 3).map((insight, idx) => (
                        <div key={idx} className="text-xs bg-blue-50 p-2 rounded border">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {step.sources && step.sources.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Sources ({step.sources.length}):</div>
                <div className="flex flex-wrap gap-1">
                  {step.sources.slice(0, 8).map((source, sourceIndex) => {
                    // Parse source format: "URL | Title | Quality"
                    const parts = source.split(' | ');
                    const url = parts[0];
                    const title = parts[1] || 'Source';
                    const quality = parts[2] || '';
                    
                    return (
                      <Badge 
                        key={sourceIndex} 
                        variant={quality.includes('HIGH') || quality.includes('⭐') ? "default" : "outline"} 
                        className="text-xs max-w-[200px] truncate"
                        title={`${title} - ${url}`}
                      >
                        {title}
                      </Badge>
                    );
                  })}
                  {step.sources.length > 8 && (
                    <Badge variant="secondary" className="text-xs">
                      +{step.sources.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
