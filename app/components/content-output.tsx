"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, Clock, Hash, Link2, Calculator } from "lucide-react"

interface GeneratedContent {
  technology: string
  questions: Array<{
    id: string
    slug: string
    question: string
    options: Array<{
      key: string
      value: string
      numericalValue: number
      default?: boolean
    }>
  }>
  calculations: Array<{
    id: string
    slug: string
    name: string
    description: string
    formula: string
    mappedQuestions: string[]
    resultType: "multiplier" | "additive" | "conditional"
  }>
  services: Array<{
    phase: string
    service: string
    description: string
    hours: number
    subservices: Array<{
      name: string
      description: string
      hours: number
      mappedQuestions?: string[]
      calculationSlug?: string
    }>
  }>
  totalHours: number
  sources: Array<{
    url: string
    title: string
    relevance: string
  }>
}

interface ContentOutputProps {
  content: GeneratedContent
}

export function ContentOutput({ content }: ContentOutputProps) {
  const phaseColors = {
    Planning: "bg-blue-100 text-blue-800",
    Design: "bg-green-100 text-green-800",
    Implementation: "bg-orange-100 text-orange-800",
    Testing: "bg-purple-100 text-purple-800",
    "Go-Live": "bg-red-100 text-red-800",
    Support: "bg-gray-100 text-gray-800",
  }

  const exportToScopeStack = () => {
    const scopeStackFormat = {
      technology: content.technology,
      totalHours: content.totalHours,
      questions: content.questions,
      calculations: content.calculations,
      services: content.services,
      generatedAt: new Date().toISOString(),
      sources: content.sources,
    }

    const blob = new Blob([JSON.stringify(scopeStackFormat, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scopestack-${content.technology.toLowerCase().replace(/\s+/g, "-")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const pushToScopeStack = async () => {
    try {
      const response = await fetch("/api/push-to-scopestack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })

      if (response.ok) {
        alert("Content successfully pushed to ScopeStack!")
      } else {
        alert("Failed to push to ScopeStack. Check your settings.")
      }
    } catch (error) {
      alert("Failed to push to ScopeStack. Check your settings.")
    }
  }

  const getCalculationTypeColor = (type: string) => {
    switch (type) {
      case "multiplier":
        return "bg-orange-100 text-orange-800"
      case "additive":
        return "bg-blue-100 text-blue-800"
      case "conditional":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Content: {content.technology}
          </CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {content.totalHours} hours
            </Badge>
            <Button onClick={exportToScopeStack} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={pushToScopeStack} className="bg-green-600 hover:bg-green-700">
              <Link2 className="h-4 w-4 mr-2" />
              Push to ScopeStack
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions">Discovery Questions ({content.questions.length})</TabsTrigger>
            <TabsTrigger value="calculations">Calculations ({content.calculations?.length || 0})</TabsTrigger>
            <TabsTrigger value="services">Service Structure ({content.services.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Research-generated questions with numerical values for calculations and subservice mapping
            </div>
            {content.questions.map((question, index) => (
              <Card key={question.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="font-medium">
                      {index + 1}. {question.question}
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Hash className="h-3 w-3" />
                      {question.slug}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-3 rounded border ${
                          option.default ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{option.key}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Value: {option.value}
                            </Badge>
                            {option.default && (
                              <Badge variant="default" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="calculations" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Dynamic calculations that combine question values to determine subservice hour adjustments
            </div>
            {content.calculations && content.calculations.length > 0 ? (
              content.calculations.map((calculation, index) => (
                <Card key={calculation.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium mb-1">{calculation.name}</div>
                        <div className="text-sm text-gray-600">{calculation.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <Hash className="h-3 w-3" />
                          {calculation.slug}
                        </Badge>
                        <Badge className={`text-xs ${getCalculationTypeColor(calculation.resultType)}`}>
                          {calculation.resultType}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border mb-3">
                      <div className="text-sm font-medium mb-1">Formula:</div>
                      <code className="text-sm bg-white px-2 py-1 rounded border">{calculation.formula}</code>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-sm text-gray-500">Uses questions:</span>
                      {calculation.mappedQuestions.map((questionSlug, qIndex) => (
                        <Badge key={qIndex} variant="secondary" className="text-xs">
                          {questionSlug}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-l-4 border-l-gray-300">
                <CardContent className="p-4">
                  <div className="text-center text-gray-500">
                    <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="font-medium">No calculations generated</div>
                    <div className="text-sm">
                      Calculations are created when subservices have multiple mapped questions
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Professional services structure with question mapping and calculations for dynamic hour adjustments
            </div>
            {content.services.map((service, index) => (
              <Card key={index} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          phaseColors[service.phase as keyof typeof phaseColors] || "bg-gray-100 text-gray-800"
                        }
                      >
                        {service.phase}
                      </Badge>
                      <span className="font-medium">{service.service}</span>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {service.hours}h
                    </Badge>
                  </div>

                  <p className="text-gray-600 mb-4">{service.description}</p>

                  <div className="space-y-2">
                    <div className="font-medium text-sm">Subservices:</div>
                    {service.subservices.map((sub, subIndex) => (
                      <div key={subIndex} className="bg-gray-50 p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{sub.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {sub.hours}h base
                            </Badge>
                            {sub.calculationSlug && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Calculator className="h-3 w-3" />
                                {sub.calculationSlug}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{sub.description}</p>

                        {sub.mappedQuestions && sub.mappedQuestions.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mb-2">
                            <span className="text-xs text-gray-500">
                              {sub.calculationSlug ? "Calculation uses:" : "Mapped to:"}
                            </span>
                            {sub.mappedQuestions.map((questionSlug, qIndex) => (
                              <Badge key={qIndex} variant="secondary" className="text-xs">
                                {questionSlug}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {sub.calculationSlug && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            Final hours = base hours × calculation result
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
