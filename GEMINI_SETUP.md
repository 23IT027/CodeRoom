# Google Gemini API Setup Guide

This project now uses Google's Gemini API for AI-powered code generation instead of Pollinations API.

## Getting Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click on "Get API Key" or "Create API Key"
4. Copy the generated API key

## Configuration

1. Navigate to the `client` directory
2. Create a `.env` file (or copy from `.env.example`)
3. Add your API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   VITE_BACKEND_URL=your_backend_url
   ```

## Features

The Gemini integration supports:
- Code generation based on natural language prompts
- Syntax-highlighted code output
- Support for multiple programming languages
- Fast and reliable AI responses

## Model Information

Currently using: **gemini-1.5-flash**
- Fast response times
- High-quality code generation
- Cost-effective for most use cases

## Troubleshooting

### API Key Not Working
- Ensure the API key is correctly copied without extra spaces
- Check that the API key has the necessary permissions
- Verify you haven't exceeded the API quota

### No Response from Gemini
- Check your internet connection
- Verify the API key is set in the `.env` file
- Check the browser console for any error messages

### Rate Limiting
- Google Gemini has rate limits based on your plan
- Free tier: 60 requests per minute
- Consider implementing request caching for production use

## Migration from Pollinations

The migration from Pollinations API to Gemini includes:
- ✅ Better code generation quality
- ✅ More reliable service
- ✅ Official Google support
- ✅ Streaming support (available for future enhancements)

## Future Enhancements

Potential improvements with Gemini:
- [ ] Streaming responses for real-time code generation
- [ ] Context-aware suggestions based on existing code
- [ ] Multi-turn conversations for iterative code improvements
- [ ] Code explanation and documentation generation
