# Local Testing Guide for Error Handling Improvements

## 🚀 Setup & Installation

### 1. Install Dependencies
```bash
cd /Users/jon/scopestack-content-engine
npm install
```

### 2. Environment Setup
Create a `.env.local` file if it doesn't exist:
```bash
# Required for testing
OPENROUTER_API_KEY=your-api-key-here

# Optional for ScopeStack integration tests
SCOPESTACK_URL=your-scopestack-url
SCOPESTACK_API_TOKEN=your-api-token
```

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 🧪 Error Handling Test Scenarios

### Test 1: Missing API Key Error
**Purpose**: Test API configuration error handling

1. **Setup**: Remove or comment out `OPENROUTER_API_KEY` in `.env.local`
2. **Test**: Try to generate content with any input
3. **Expected Result**: 
   - Toast notification: "API configuration is missing. Please check your settings."
   - No alert() popup
   - Research step shows error state

### Test 2: Network Error Simulation
**Purpose**: Test retry mechanisms and network error handling

1. **Setup**: Disconnect internet or block openrouter.ai in hosts file
2. **Test**: Try to generate content
3. **Expected Result**:
   - Toast with retry button
   - Automatic retry attempts (watch console logs)
   - Eventually fails with user-friendly message

### Test 3: Invalid Input Handling
**Purpose**: Test input validation

1. **Test**: Try submitting empty input
2. **Expected Result**: Button should be disabled
3. **Test**: Try with just spaces
4. **Expected Result**: Toast: "Please provide a description of your technology solution."

### Test 4: React Component Error
**Purpose**: Test Error Boundaries

1. **Setup**: Temporarily break a component by adding invalid JSX
2. **Test**: Navigate to the broken component
3. **Expected Result**: 
   - Error boundary catches the error
   - Shows fallback UI with retry option
   - App doesn't crash completely

### Test 5: SSE Stream Error
**Purpose**: Test Server-Sent Events error handling

1. **Setup**: Modify research API to return invalid SSE data
2. **Test**: Start content generation
3. **Expected Result**:
   - Individual SSE parsing errors logged (not shown to user)
   - Research continues with valid events
   - Final error if stream completely fails

## 🔧 Manual Testing Steps

### A. Basic Functionality Test
```bash
# 1. Start the app
npm run dev

# 2. Open browser console to see error logs
# 3. Try normal operation first
# 4. Enter: "Microsoft Office 365 migration for 100 users"
# 5. Click Generate Content
# 6. Verify normal operation works
```

### B. Error Boundary Test
```bash
# 1. Edit app/components/content-output.tsx
# 2. Add this line at the top of the component:
#    throw new Error("Test error boundary")
# 3. Generate content successfully first
# 4. Watch error boundary catch the display error
# 5. Remove the test error
```

### C. API Error Test
```bash
# 1. In app/api/research/route.ts, temporarily change:
#    const apiKey = process.env.OPENROUTER_API_KEY
#    to: const apiKey = "invalid-key"
# 2. Try to generate content
# 3. Should see API authentication error
# 4. Restore correct API key
```

### D. Toast Notification Test
```bash
# 1. Open browser dev tools console
# 2. Run this command to test different toast types:

# Test error toast
showErrorToast(new Error("Test error message"))

# Test success toast  
showSuccessToast("Test success message")

# Test retry toast
showRetryToast(new Error("Test retry"), () => console.log("Retry clicked"))
```

## 🐛 Debugging Tools

### Console Commands for Testing
Open browser console and run these:

```javascript
// Test error types
import { ScopeStackError, ErrorCode } from '/lib/errors.js'

// Create test errors
const testError = new ScopeStackError(
  ErrorCode.API_TIMEOUT, 
  "Test timeout error",
  { testData: "debugging" }
)

// Test toast system
showErrorToast(testError)

// Test error boundary (will crash component)
throw new Error("Test component crash")

// Check error boundary state
console.log("Error boundaries active:", document.querySelectorAll('[data-error-boundary]').length)
```

### Network Tab Testing
1. **Open Dev Tools** → Network tab
2. **Generate content** and watch API calls
3. **Throttle network** to simulate slow connections
4. **Block specific requests** to test error handling

### React Dev Tools
1. **Install React Developer Tools** browser extension
2. **Look for Error Boundary components** in component tree
3. **Check state** of error boundaries after errors occur

## 📊 Expected Test Results

### ✅ Success Indicators
- **No alert() popups** anywhere in the app
- **Toast notifications** appear for all errors
- **Retry buttons** work when clicked
- **Error boundaries** prevent app crashes
- **Console logs** show structured error information
- **Progressive error handling** adapts to repeated failures

### ❌ Failure Indicators
- Any alert() popups appear
- White screen of death (component crashes)
- Errors without user-friendly messages
- No retry options for retryable errors
- Unstructured error logs

## 🔍 Advanced Testing

### Load Testing Error Handling
```bash
# Test multiple rapid requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/test-openrouter \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}' &
done
```

### Error Recovery Testing
1. **Start content generation**
2. **Disconnect internet mid-process**
3. **Reconnect internet**
4. **Click retry button**
5. **Verify recovery works**

### Memory Leak Testing
1. **Generate content multiple times**
2. **Trigger errors repeatedly**
3. **Check browser memory usage**
4. **Verify no memory leaks from error handling**

## 🚨 Common Issues & Solutions

### Issue: "Module not found" errors
**Solution**: Make sure all new files are saved and TypeScript is compiled
```bash
npm run build
```

### Issue: Toast notifications not appearing
**Solution**: Check that Toaster component is in layout.tsx
```bash
grep -n "Toaster" app/layout.tsx
```

### Issue: Error boundaries not catching errors
**Solution**: Make sure errors are thrown during render, not in event handlers

### Issue: API errors not properly formatted
**Solution**: Check that API routes use the new error handling utilities

## 📋 Test Checklist

### Basic Functionality
- [ ] App starts without errors
- [ ] Normal content generation works
- [ ] Toast notifications appear for errors
- [ ] No alert() popups anywhere

### Error Handling
- [ ] API key missing error handled gracefully
- [ ] Network errors show retry options
- [ ] Invalid input shows appropriate messages
- [ ] Component errors caught by boundaries

### User Experience
- [ ] Error messages are user-friendly
- [ ] Retry buttons work as expected
- [ ] Progressive error handling adapts
- [ ] App remains usable after errors

### Developer Experience
- [ ] Structured error logs in console
- [ ] Error context includes useful information
- [ ] TypeScript types work correctly
- [ ] No build errors or warnings

## 🎯 Next Steps After Testing

1. **Fix any issues** found during testing
2. **Adjust error messages** based on user feedback
3. **Fine-tune retry logic** timing and attempts
4. **Add additional error scenarios** you discover
5. **Document any new test cases** for future reference

---

## 🆘 Need Help?

If you encounter issues during testing:

1. **Check the console** for detailed error logs
2. **Verify environment variables** are set correctly
3. **Ensure all dependencies** are installed
4. **Check file paths** and imports are correct
5. **Review the error handling improvements** documentation

The error handling system is designed to be robust, but please test thoroughly in your specific environment!