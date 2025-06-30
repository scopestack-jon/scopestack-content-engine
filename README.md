# ScopeStack Content Engine

A research-driven content generation engine for ScopeStack professional services scoping.

## Overview

ScopeStack Content Engine conducts fresh research for every request to generate structured professional services content dynamically from actual research findings. No templates, no canned data.

The application uses multiple AI models via OpenRouter to:
1. Parse technology requirements
2. Conduct live web research
3. Analyze research findings
4. Generate structured content
5. Format for ScopeStack integration

## Features

- **Fresh Research**: Conducts live web research for every request
- **Multi-Model AI**: Uses multiple AI models via OpenRouter for enhanced research quality
- **Dynamic Content**: Zero hardcoded templates, all content is generated dynamically
- **Smart Calculations**: Ruby-based formulas for dynamic hour adjustments
- **ScopeStack Ready**: Direct integration with ScopeStack calculations and mappings

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An OpenRouter API key (get one from [openrouter.ai/keys](https://openrouter.ai/keys))
- Optional: ScopeStack integration credentials (URL and API token)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your OpenRouter API key as an environment variable:
   ```bash
   export OPENROUTER_API_KEY=your-api-key-here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000 in your browser

### Configuration

1. Click the "Settings" button to access configuration options
2. Configure OpenRouter:
   - Enter your API key
   - Select models for each step of the research process
3. Configure Custom Prompts (optional):
   - Customize the prompts for each step of the research process
4. Configure ScopeStack Integration (optional):
   - Enter your ScopeStack URL and API token
   - Test the connection

## Usage

1. Enter a technology solution in the input field (e.g., "Microsoft Email Migration to Office 365 for a Hospital with 1000 users")
2. Click "Generate Content"
3. Watch the research progress through each step
4. Once complete, explore the generated content:
   - Discovery Questions
   - Calculations
   - Service Structure
   - Sources
5. Export the content as JSON or push it directly to ScopeStack

## Content Structure

The generated content follows this structure:

```json
{
  "technology": "Technology name",
  "questions": [
    {
      "id": "q1",
      "slug": "question-slug",
      "question": "Question text",
      "options": [
        {
          "key": "Option text",
          "value": "Option value",
          "numericalValue": 1,
          "default": true
        }
      ]
    }
  ],
  "calculations": [
    {
      "id": "calc1",
      "slug": "calculation-slug",
      "name": "Calculation name",
      "description": "Calculation description",
      "formula": "Ruby formula",
      "mappedQuestions": ["question-slug"],
      "resultType": "multiplier"
    }
  ],
  "services": [
    {
      "phase": "Planning",
      "service": "Service name",
      "description": "Service description",
      "hours": 40,
      "subservices": [
        {
          "name": "Subservice name",
          "description": "Subservice description",
          "hours": 16,
          "mappedQuestions": ["question-slug"],
          "calculationSlug": "calculation-slug"
        }
      ]
    }
  ],
  "totalHours": 120,
  "sources": [
    {
      "url": "https://example.com",
      "title": "Source title",
      "relevance": "Source relevance"
    }
  ]
}
```

## Testing

See [TESTING.md](TESTING.md) for detailed testing instructions.

## Development

### Project Structure

- `app/` - Next.js application
  - `api/` - API routes
    - `research/` - Research API endpoint
    - `push-to-scopestack/` - ScopeStack integration endpoint
    - `test-openrouter/` - OpenRouter test endpoint
    - `test-scopestack/` - ScopeStack test endpoint
  - `components/` - React components
  - `settings/` - Settings page
  - `page.tsx` - Main page
- `components/` - Shared components
- `hooks/` - React hooks
- `lib/` - Utility functions
- `public/` - Static assets
- `styles/` - CSS styles

### API Endpoints

- `POST /api/research` - Generate content based on input
- `POST /api/push-to-scopestack` - Push content to ScopeStack
- `POST /api/test-openrouter` - Test OpenRouter connection
- `POST /api/test-scopestack` - Test ScopeStack connection

## License

This project is proprietary and confidential. All rights reserved.

## Support

For support, please contact your ScopeStack representative.
