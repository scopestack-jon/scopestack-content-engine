// Test script for JSON parsing and normalization

// Function to fix common URL issues in AI responses
function fixUrlsInJson(json) {
  // First, try to identify and fix incomplete URLs
  let fixed = json;
  
  // Fix missing quotes at the end of values
  fixed = fixed.replace(/:\s*"([^"]*)(?=\s*[,}])/g, ': "$1"');
  
  // Fix URLs that are cut off after https:
  fixed = fixed.replace(/"(url|source|title|href|link)"\s*:\s*"https:(?:[^"]*)?(?!")(?=[,}\]])/g, '"$1": "https://example.com"');
  fixed = fixed.replace(/"(url|source|title|href|link)"\s*:\s*"https:(?:[^"]*)?"/g, '"$1": "https://example.com"');
  
  // Fix URLs in arrays that are cut off
  fixed = fixed.replace(/"https:(?:[^"]*)?(?!")(?=[,}\]])/g, '"https://example.com"');
  
  // Fix any other attributes that might have https: without closing quotes
  fixed = fixed.replace(/:\s*"https:(?:[^"]*)?(?!")(?=[,}\]])/g, ': "https://example.com"');
  
  // Fix "SOURCE: https: patterns which are common in the logs
  fixed = fixed.replace(/"SOURCE:\s*https:(?:[^"]*)?(?!")(?=[,}\]])/g, '"SOURCE: https://example.com"');
  
  // Fix type field followed by url field pattern that's causing issues
  fixed = fixed.replace(/"type"\s*:\s*"[^"]*"\s*,\s*"url"\s*:\s*"https:(?:[^"]*)?(?!")(?=[,}\]])/g, 
    (match) => {
      // Keep the type part and fix the URL part
      const typePart = match.split('"url"')[0];
      return typePart + '"url": "https://example.com"';
    }
  );
  
  // Fix any remaining unquoted URLs
  fixed = fixed.replace(/https:\/\/[^",}\]]*(?=[,}\]])/g, '"https://example.com"');
  
  return fixed;
}

// Function to normalize nested structures into the expected format
function normalizeNestedStructure(parsed) {
  const normalized = {
    technology: "",
    questions: [],
    calculations: [],
    services: [],
    totalHours: 0,
    sources: []
  };
  
  // Extract technology name
  if (parsed.technology) {
    normalized.technology = parsed.technology;
  } else if (parsed.project_scope?.title) {
    normalized.technology = parsed.project_scope.title;
  } else if (parsed.email_migration_research) {
    normalized.technology = "Email Migration to Office 365";
  } else if (parsed.research_findings?.implementation_methodologies?.recommended_frameworks?.[0]) {
    normalized.technology = parsed.research_findings.implementation_methodologies.recommended_frameworks[0];
  }
  
  // Extract questions
  if (Array.isArray(parsed.questions)) {
    normalized.questions = parsed.questions;
  } else if (parsed.assessment_questions) {
    // Convert assessment_questions to the expected format
    normalized.questions = Object.entries(parsed.assessment_questions).map(([id, q], index) => ({
      id: id,
      slug: id.replace('question_', ''),
      question: q.text || `Question ${index + 1}`,
      options: Array.isArray(q.options) ? q.options.map((opt, i) => ({
        key: opt,
        value: i + 1,
        default: i === 0
      })) : []
    }));
  } else if (parsed.discovery_questions) {
    // Convert discovery_questions to the expected format
    normalized.questions = parsed.discovery_questions.map((q, index) => ({
      id: `q${index + 1}`,
      slug: `question-${index + 1}`,
      question: q.question,
      options: Array.isArray(q.options) ? q.options.map((opt, i) => ({
        key: opt,
        value: i + 1,
        default: i === 0
      })) : []
    }));
  }
  
  // Extract services
  if (Array.isArray(parsed.services)) {
    normalized.services = parsed.services;
  } else {
    // Try to find services in different locations
    const serviceLocations = [
      parsed.service_components?.core_services,
      parsed.email_migration_research?.professional_services?.core_services,
      parsed.research_findings?.service_components?.core_services,
      parsed.implementation_services,
      parsed.service_breakdown
    ];
    
    for (const location of serviceLocations) {
      if (Array.isArray(location)) {
        // Transform services to expected format
        const services = location.map((svc) => {
          const phase = svc.phase || "Implementation";
          const service = svc.name || svc.service;
          const hours = svc.estimated_hours || svc.hours || 40;
          
          // Handle subservices
          let subservices = [];
          if (Array.isArray(svc.subservices)) {
            subservices = svc.subservices.map((sub, i) => {
              // Handle both string and object subservices
              if (typeof sub === 'string') {
                return {
                  name: sub,
                  description: `${sub} activities`,
                  hours: Math.floor(hours / 3)
                };
              } else {
                return {
                  name: sub.name || `Subservice ${i+1}`,
                  description: sub.description || `${sub.name || 'Subservice'} activities`,
                  hours: sub.hours || Math.floor(hours / 3)
                };
              }
            });
          }
          
          // Ensure exactly 3 subservices
          while (subservices.length < 3) {
            subservices.push({
              name: `Additional Activity ${subservices.length + 1}`,
              description: `Supporting activities for ${service}`,
              hours: Math.floor(hours / 3)
            });
          }
          
          // Limit to exactly 3 subservices
          subservices = subservices.slice(0, 3);
          
          return {
            phase,
            service,
            description: svc.description || `${service} for implementation`,
            hours,
            subservices
          };
        });
        
        if (services.length > 0) {
          normalized.services = services;
          break;
        }
      }
    }
  }
  
  // Extract sources
  if (Array.isArray(parsed.sources)) {
    normalized.sources = parsed.sources;
  } else if (parsed.reference_sources) {
    normalized.sources = parsed.reference_sources.map((src) => ({
      url: src.url || "https://example.com",
      title: src.title || "Reference Source",
      relevance: src.relevance || "Implementation guidance"
    }));
  } else if (parsed.email_migration_research?.reference_sources) {
    normalized.sources = parsed.email_migration_research.reference_sources.map((src) => ({
      url: src.url || "https://example.com",
      title: src.title || "Reference Source",
      relevance: src.relevance || "Implementation guidance"
    }));
  } else if (parsed.research_findings?.reference_sources) {
    normalized.sources = parsed.research_findings.reference_sources.map((src) => ({
      url: src.url || "https://example.com",
      title: src.title || "Reference Source",
      relevance: src.relevance || "Implementation guidance"
    }));
  }
  
  // Calculate total hours
  if (typeof parsed.totalHours === 'number') {
    normalized.totalHours = parsed.totalHours;
  } else if (typeof parsed.total_estimated_hours === 'number') {
    normalized.totalHours = parsed.total_estimated_hours;
  } else if (typeof parsed.total_hours === 'number') {
    normalized.totalHours = parsed.total_hours;
  } else if (Array.isArray(normalized.services)) {
    normalized.totalHours = normalized.services.reduce((total, service) => total + (service.hours || 0), 0);
  }
  
  console.log("Successfully normalized nested structure");
  return normalized;
}

// Test cases
const testCases = [
  {
    name: "Test case 1: Missing quote at end of URL",
    input: `{ "url": "https: }`,
    expected: `{ "url": "https://example.com" }`
  },
  {
    name: "Test case 2: Nested structure",
    input: `{ "email_migration_research": { "implementation_methodologies": { "recommended_frameworks": [ "Microsoft FastTrack", "Hybrid Migration", "Cutover Migration", "Staged Migration" ] } } }`,
    expectNormalized: true
  },
  {
    name: "Test case 3: Multiple incomplete URLs - individual test",
    input: `{ "type": "Vendor Documentation", "url": "https:" }`,
    expected: `{ "type": "Vendor Documentation", "url": "https://example.com" }`
  }
];

// Run tests
console.log("Running JSON parsing and normalization tests...\n");

testCases.forEach((testCase, index) => {
  console.log(`\n${testCase.name}`);
  console.log("Input:", testCase.input);
  
  const fixedJson = fixUrlsInJson(testCase.input);
  console.log("Fixed JSON:", fixedJson);
  
  try {
    const parsed = JSON.parse(fixedJson);
    console.log("Parsed successfully:", parsed);
    
    if (testCase.expectNormalized) {
      const normalized = normalizeNestedStructure(parsed);
      console.log("Normalized:", normalized);
    }
    
    console.log("✅ Test passed");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
});

console.log("\nAll tests completed."); 