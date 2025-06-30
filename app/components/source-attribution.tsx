import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Shield, BookOpen, Users, FileText, Database, Code, AlertCircle } from "lucide-react"

interface Source {
  url: string
  title: string
  relevance?: string | any
  category?: string
}

interface SourceAttributionProps {
  sources: Source[] | string[]
}

export function SourceAttribution({ sources }: SourceAttributionProps) {
  // Parse sources if they're in string format (url | title)
  const parsedSources = Array.isArray(sources) 
    ? sources.map(source => {
        if (typeof source === 'string') {
          // Try to extract URL and title from string format "url | title"
          const parts = source.split(' | ');
          return {
            url: parts[0] || '',
            title: parts[1] || source,
            relevance: 'Relevant for implementation',
            category: 'Technical Resource'
          };
        }
        return source;
      })
    : [];
    
  // Ensure sources is an array and validate each source
  const safeSources = parsedSources.map(source => {
    // Create a new object to avoid modifying the original
    const safeSource = { ...source };
    
    // Ensure URL is properly formatted
    if (!safeSource.url || typeof safeSource.url !== 'string') {
      safeSource.url = "";
    }
    
    // Fix double quoted URLs
    if (safeSource.url.startsWith('"') && safeSource.url.endsWith('"')) {
      safeSource.url = safeSource.url.substring(1, safeSource.url.length - 1);
    }
    
    // Ensure URL starts with https:// only if it's not empty
    if (safeSource.url && !safeSource.url.startsWith('http')) {
      safeSource.url = "https://" + safeSource.url;
    }
    
    // Ensure title exists
    if (!safeSource.title) {
      // Extract domain name for title if possible
      if (safeSource.url) {
        try {
          const url = new URL(safeSource.url);
          safeSource.title = url.hostname.replace('www.', '');
        } catch (e) {
          safeSource.title = "Resource";
        }
      } else {
        safeSource.title = "Resource";
      }
    }
    
    // Ensure relevance exists and is a string
    if (!safeSource.relevance) {
      safeSource.relevance = "Relevant for implementation";
    } else if (typeof safeSource.relevance !== 'string') {
      // If relevance is an object or another non-string type, convert to string or use default
      try {
        if (safeSource.relevance && typeof safeSource.relevance === 'object') {
          // Try to extract a meaningful string from the object
          const relevanceStr = safeSource.relevance.description || 
                              safeSource.relevance.text || 
                              safeSource.relevance.info ||
                              JSON.stringify(safeSource.relevance);
          safeSource.relevance = relevanceStr;
        } else {
          safeSource.relevance = String(safeSource.relevance);
        }
      } catch (e) {
        safeSource.relevance = "Source for implementation";
      }
    }
    
    // Ensure category exists
    if (!safeSource.category) {
      safeSource.category = "Technical Resource";
    }
    
    return safeSource;
  });
  
  // Get icon based on category
  const getCategoryIcon = (category: string | undefined) => {
    if (!category) return <ExternalLink className="h-4 w-4" />;
    
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('vendor') || lowerCategory.includes('official')) return <Shield className="h-4 w-4" />;
    if (lowerCategory.includes('research') || lowerCategory.includes('analyst')) return <BookOpen className="h-4 w-4" />;
    if (lowerCategory.includes('community')) return <Users className="h-4 w-4" />;
    if (lowerCategory.includes('documentation')) return <FileText className="h-4 w-4" />;
    if (lowerCategory.includes('database')) return <Database className="h-4 w-4" />;
    if (lowerCategory.includes('technical')) return <Code className="h-4 w-4" />;
    return <ExternalLink className="h-4 w-4" />;
  };
  
  // If no valid sources, show a message
  if (!safeSources.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-muted-foreground">
            <AlertCircle className="mr-2 h-4 w-4" />
            <p>No sources available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {safeSources.map((source, index) => (
            <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                {source.url ? (
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium hover:underline flex items-center"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {source.title}
                  </a>
                ) : (
                  <div className="font-medium flex items-center">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {source.title}
                  </div>
                )}
                <Badge variant="outline" className="flex items-center">
                  {getCategoryIcon(source.category)}
                  <span className="ml-1">{source.category}</span>
                </Badge>
              </div>
              {source.relevance && typeof source.relevance === 'string' && (
                <p className="mt-1 text-sm text-muted-foreground">{source.relevance}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
