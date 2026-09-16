# Quick Start: Using Gemini API in CodeColabAI

## 1. Get Your API Key
```
Visit: https://makersuite.google.com/app/apikey
Sign in → Create API Key → Copy
```

## 2. Set Environment Variable
Create or edit `client/.env`:
```bash
VITE_GEMINI_API_KEY=your_api_key_here
VITE_BACKEND_URL=http://localhost:3000
```

## 3. Start the Application
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

## 4. Test the Copilot Feature
1. Open http://localhost:5173
2. Navigate to the Copilot/AI assistant feature
3. Enter a prompt like: "Create a function to calculate fibonacci numbers"
4. Click generate

## API Usage in Code

### Basic Generation
```typescript
import { generateWithGemini } from "@/api/geminiApi"

const systemPrompt = "You are a helpful coding assistant"
const userPrompt = "Write a hello world function"

const response = await generateWithGemini(systemPrompt, userPrompt)
```

### With Streaming (Future)
```typescript
import { generateWithGeminiStream } from "@/api/geminiApi"

await generateWithGeminiStream(
    systemPrompt,
    userPrompt,
    (chunk) => {
        console.log("Received:", chunk)
        // Update UI with streaming response
    }
)
```

## Troubleshooting

### "API key not found" warning
- Check `.env` file exists in `client/` directory
- Verify `VITE_GEMINI_API_KEY` is set
- Restart the dev server after adding the key

### "Failed to generate the code" error
- Verify API key is valid
- Check internet connection
- Check browser console for detailed errors
- Verify you haven't exceeded rate limits (60/min free tier)

### No response
- Open browser DevTools → Console
- Look for network errors
- Verify the Gemini API is not blocked by firewall/proxy

## Rate Limits (Free Tier)
- 60 requests per minute
- 1,500 requests per day
- For higher limits, upgrade to paid plan

## Model Information
- **Current Model:** gemini-1.5-flash
- **Optimized for:** Fast code generation
- **Context Window:** 1M tokens
- **Output:** Up to 8K tokens

## Support
- Gemini API Docs: https://ai.google.dev/docs
- Issues: GitHub Issues page
- API Status: https://status.cloud.google.com/
