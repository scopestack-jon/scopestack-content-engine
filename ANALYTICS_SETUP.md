# Analytics Persistent Storage Setup

The analytics system has been updated to support persistent storage in production environments. By default, it uses in-memory storage that works in development but doesn't persist between serverless function invocations in Vercel.

## Current Status

✅ **Development**: Works with file-based storage (`/tmp/scopestack-requests.jsonl`)  
❌ **Production**: Memory storage doesn't persist between function invocations  
✅ **Solution**: Added support for external storage services

## Storage Options

### Option 1: Upstash Redis (Recommended)

**Pros**: Free tier available, excellent performance, purpose-built for serverless  
**Setup Time**: ~5 minutes

1. Go to [https://console.upstash.com/](https://console.upstash.com/)
2. Create a free account and database
3. Copy the REST URL and Token
4. Add to your environment variables:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-rest-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-rest-token
```

### Option 2: JSONBin.io (Alternative)

**Pros**: Simple JSON storage, free tier available  
**Cons**: Slower than Redis, less efficient for high-volume usage

1. Go to [https://jsonbin.io/](https://jsonbin.io/)
2. Create a free account and bin
3. Get your API key and bin ID
4. Add to your environment variables:

```bash
JSONBIN_BIN_ID=your-bin-id
JSONBIN_API_KEY=your-api-key
```

## How It Works

The system uses a **fallback strategy**:

1. **Upstash Redis** (if configured) - Primary persistent storage
2. **JSONBin.io** (if configured) - Secondary persistent storage  
3. **File storage** (development only) - Local file in `/tmp`
4. **Memory storage** - Final fallback (doesn't persist in production)

## Deployment

### For Vercel Production

1. Choose either Upstash Redis or JSONBin.io (or both)
2. Add environment variables to your Vercel project:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add the required variables based on your chosen storage option

### For Other Platforms

The environment variables work the same way across all platforms. Just ensure they're available to your Node.js environment.

## Data Retention

- **Upstash Redis**: Stores last 1000 analytics entries
- **JSONBin.io**: Stores last 1000 analytics entries  
- **Memory**: Stores last 1000 entries (per function instance)

## Testing

You can test the analytics system by:

1. Generating research requests through the UI
2. Visiting `/analytics` to view the dashboard  
3. Calling the API directly: `GET /api/analytics?limit=100`

## What Gets Tracked

- ✅ Completed research solutions (with user attribution)
- ✅ Push-to-ScopeStack operations (with user attribution)
- ❌ Failed requests (logged to console only)
- ❌ Started requests (logged to console only)

## Security

- All storage solutions use HTTPS/TLS encryption
- API keys should be treated as secrets
- Data includes user attribution but no sensitive content
- Logs rotate automatically (1000 entry limit)