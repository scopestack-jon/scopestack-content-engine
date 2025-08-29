'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  HelpCircle, 
  Users, 
  MapPin, 
  Layers, 
  Clock, 
  GraduationCap,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Calculator
} from 'lucide-react'
import {
  InteractiveQuestion,
  QuestionnaireResponse,
  calculateServiceImpact,
  getUserTierMultiplier,
  getLocationMultiplier,
  ServiceImpact
} from '@/lib/research/types/interactive-questions'
import type { Service } from '@/lib/research/types/interfaces'

interface InteractiveQuestionnaireProps {
  questions: InteractiveQuestion[]
  baseServices: Service[]
  onServicesUpdate?: (services: Service[], responses: QuestionnaireResponse[]) => void
  onComplete?: (responses: QuestionnaireResponse[]) => void
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'sizing': Users,
  'locations': MapPin,
  'complexity': Layers,
  'timeline': Clock,
  'training': GraduationCap,
  'technical': Cpu,
  'general': HelpCircle
}

export function InteractiveQuestionnaire({ 
  questions, 
  baseServices,
  onServicesUpdate,
  onComplete
}: InteractiveQuestionnaireProps) {
  const [responses, setResponses] = useState<Map<string, QuestionnaireResponse>>(new Map())
  const [currentStep, setCurrentStep] = useState(0)
  const [modifiedServices, setModifiedServices] = useState<Service[]>(baseServices)
  const [showImpact, setShowImpact] = useState(false)
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  // Group questions by category
  const categorizedQuestions = questions.reduce((acc, question) => {
    const category = question.category || 'general'
    if (!acc[category]) acc[category] = []
    acc[category].push(question)
    return acc
  }, {} as Record<string, InteractiveQuestion[]>)

  const categories = Object.keys(categorizedQuestions)
  const currentCategory = categories[currentStep]
  const currentQuestions = categorizedQuestions[currentCategory] || []
  const progress = ((currentStep + 1) / categories.length) * 100

  // Update services when responses change
  useEffect(() => {
    const responseArray = Array.from(responses.values())
    const updated = calculateServiceImpact(baseServices, responseArray)
    setModifiedServices(updated)
    onServicesUpdate?.(updated, responseArray)
  }, [responses, baseServices, onServicesUpdate])

  const handleResponse = (questionId: string, value: any, impact?: ServiceImpact) => {
    const newResponses = new Map(responses)
    
    // Special handling for user count and locations
    let calculatedImpact = impact
    
    if (questionId === 'userCount' && typeof value === 'number') {
      const multiplier = getUserTierMultiplier(value)
      calculatedImpact = {
        hourModifiers: [{
          phasePattern: 'Execution|Implementation',
          operation: 'multiply',
          value: multiplier
        }]
      }
    }
    
    if (questionId === 'locations' && typeof value === 'number') {
      const multiplier = getLocationMultiplier(value)
      calculatedImpact = {
        hourModifiers: [{
          phasePattern: '.*',
          operation: 'multiply',
          value: multiplier
        }]
      }
    }
    
    newResponses.set(questionId, {
      questionId,
      value,
      impact: calculatedImpact
    })
    
    setResponses(newResponses)
    
    // Clear error for this question
    const newErrors = new Map(errors)
    newErrors.delete(questionId)
    setErrors(newErrors)
  }

  const validateCurrentStep = (): boolean => {
    const newErrors = new Map<string, string>()
    let isValid = true

    currentQuestions.forEach(question => {
      if (question.required && !responses.has(question.id)) {
        newErrors.set(question.id, 'This field is required')
        isValid = false
      }
      
      const response = responses.get(question.id)
      if (response && question.validation) {
        const value = response.value
        const validation = question.validation
        
        if (validation.min !== undefined && value < validation.min) {
          newErrors.set(question.id, `Minimum value is ${validation.min}`)
          isValid = false
        }
        
        if (validation.max !== undefined && value > validation.max) {
          newErrors.set(question.id, `Maximum value is ${validation.max}`)
          isValid = false
        }
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < categories.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        onComplete?.(Array.from(responses.values()))
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderQuestion = (question: InteractiveQuestion) => {
    const response = responses.get(question.id)
    const error = errors.get(question.id)
    const IconComponent = CATEGORY_ICONS[question.category || 'general']

    return (
      <Card key={question.id} className={`mb-4 ${error ? 'border-red-500' : ''}`}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Label htmlFor={question.id} className="text-base font-medium flex items-center gap-2">
                  {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
                  {question.text}
                  {question.required && <span className="text-red-500">*</span>}
                </Label>
                {question.description && (
                  <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
                )}
              </div>
              {question.helpText && (
                <HelpCircle className="h-4 w-4 text-muted-foreground ml-2" title={question.helpText} />
              )}
            </div>

            {/* Render input based on question type */}
            {question.type === 'slider' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {question.validation?.min || 0}
                  </span>
                  <span className="text-lg font-semibold">
                    {response?.value || question.defaultValue || question.validation?.min || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {question.validation?.max || 100}
                  </span>
                </div>
                <Slider
                  id={question.id}
                  min={question.validation?.min || 0}
                  max={question.validation?.max || 100}
                  step={1}
                  value={[response?.value || question.defaultValue || question.validation?.min || 0]}
                  onValueChange={(value) => handleResponse(question.id, value[0])}
                  className="w-full"
                />
              </div>
            )}

            {question.type === 'number' && (
              <Input
                id={question.id}
                type="number"
                placeholder={question.placeholder}
                value={response?.value || ''}
                onChange={(e) => handleResponse(question.id, parseInt(e.target.value) || 0)}
                min={question.validation?.min}
                max={question.validation?.max}
              />
            )}

            {question.type === 'text' && (
              <Input
                id={question.id}
                type="text"
                placeholder={question.placeholder}
                value={response?.value || ''}
                onChange={(e) => handleResponse(question.id, e.target.value)}
              />
            )}

            {question.type === 'boolean' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id={question.id}
                  checked={response?.value || false}
                  onCheckedChange={(checked) => {
                    const option = question.options?.find(o => o.value === checked)
                    handleResponse(question.id, checked, option?.impact)
                  }}
                />
                <Label htmlFor={question.id} className="text-sm">
                  {response?.value ? 'Yes' : 'No'}
                </Label>
              </div>
            )}

            {question.type === 'dropdown' && (
              <Select
                value={response?.value || ''}
                onValueChange={(value) => {
                  const option = question.options?.find(o => o.value === value)
                  handleResponse(question.id, value, option?.impact)
                }}
              >
                <SelectTrigger id={question.id}>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {question.options?.map(option => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      <div>
                        <div>{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {question.type === 'multiple_choice' && (
              <div className="space-y-2">
                {question.options?.map(option => (
                  <label
                    key={option.value}
                    className="flex items-start space-x-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={String(option.value)}
                      checked={response?.value === option.value}
                      onChange={() => handleResponse(question.id, option.value, option.impact)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'multi_select' && (
              <div className="space-y-2">
                {question.options?.map(option => {
                  const currentValues = response?.value || []
                  const isChecked = currentValues.includes(option.value)
                  
                  return (
                    <label
                      key={option.value}
                      className="flex items-start space-x-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          let newValues = [...currentValues]
                          if (checked) {
                            newValues.push(option.value)
                          } else {
                            newValues = newValues.filter(v => v !== option.value)
                          }
                          
                          // Combine impacts from all selected options
                          const selectedOptions = question.options?.filter(o => 
                            newValues.includes(o.value)
                          ) || []
                          
                          const combinedImpact: ServiceImpact = {
                            serviceInclusion: {
                              include: selectedOptions.flatMap(o => 
                                o.impact?.serviceInclusion?.include || []
                              )
                            },
                            hourModifiers: selectedOptions.flatMap(o => 
                              o.impact?.hourModifiers || []
                            )
                          }
                          
                          handleResponse(question.id, newValues, combinedImpact)
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate impact summary
  const calculateImpactSummary = () => {
    const baseHours = baseServices.reduce((sum, s) => sum + s.hours, 0)
    const modifiedHours = modifiedServices.reduce((sum, s) => sum + s.hours, 0)
    const hoursDifference = modifiedHours - baseHours
    const percentChange = ((hoursDifference / baseHours) * 100).toFixed(1)
    
    return {
      baseHours,
      modifiedHours,
      hoursDifference,
      percentChange
    }
  }

  const impactSummary = calculateImpactSummary()

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {categories.length}</span>
          <span>{currentCategory}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Category Header */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{currentCategory} Configuration</CardTitle>
          <CardDescription>
            Answer these questions to customize your service package
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Questions */}
      <div>
        {currentQuestions.map(renderQuestion)}
      </div>

      {/* Impact Summary */}
      {showImpact && (
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Impact Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Base Hours</div>
                <div className="text-2xl font-semibold">{impactSummary.baseHours}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Adjusted Hours</div>
                <div className="text-2xl font-semibold">{impactSummary.modifiedHours}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Change</div>
                <div className="flex items-center gap-2">
                  <Badge variant={impactSummary.hoursDifference > 0 ? 'destructive' : 'success'}>
                    {impactSummary.hoursDifference > 0 ? '+' : ''}{impactSummary.hoursDifference} hours
                  </Badge>
                  <span className="text-sm">({impactSummary.percentChange}%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImpact(!showImpact)}
        >
          {showImpact ? 'Hide' : 'Show'} Impact
        </Button>

        <Button
          onClick={handleNext}
        >
          {currentStep === categories.length - 1 ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete
            </>
          ) : (
            'Next'
          )}
        </Button>
      </div>
    </div>
  )
}