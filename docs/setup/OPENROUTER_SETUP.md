# OpenRouter Setup Guide

## Overview

This project uses **OpenRouter** as a proxy to access Moonshot AI models. OpenRouter provides:
- ✅ Reliable API access to Moonshot models
- ✅ Easier API key management
- ✅ Better error handling and support
- ✅ Access to multiple AI providers through one API

## Environment Variables

Add the following to your `.env.local` file:

```bash
# OpenRouter API Key (required)
OPEN_ROUTER_KEY=your_openrouter_api_key_here

# Optional: Override default Moonshot model
# Available Moonshot models on OpenRouter (verified):
# - moonshotai/kimi-k2-thinking (262K context) - DEFAULT - Best for complex reasoning
# - moonshotai/kimi-k2-0905 (262K context) - Latest version
# - moonshotai/kimi-k2 (131K context) - Standard version
# - moonshotai/kimi-k2:free (32K context) - Free tier
# - moonshotai/kimi-linear-48b-a3b-instruct (1M context) - Largest context
MOONSHOT_MODEL=moonshotai/kimi-k2-thinking

# Or use OPENROUTER_MODEL for explicit OpenRouter model name
OPENROUTER_MODEL=moonshotai/kimi-k2-thinking
```

## Getting Your OpenRouter API Key

1. **Sign up/Login**: Go to https://openrouter.ai/
2. **Get API Key**: 
   - Navigate to **Keys** section in your dashboard
   - Create a new API key or copy an existing one
   - Keys typically start with `sk-or-v1-...`
3. **Add Credits**: Ensure your account has credits to use the API
4. **Add to `.env.local`**: Copy the key to your `.env.local` file

## Model Mapping

The system automatically maps old Moonshot model names to OpenRouter format:

| Old Model Name | OpenRouter Model |
|----------------|------------------|
| `kimi-k2-thinking` | `moonshotai/kimi-k2-thinking` (262K context) |
| `kimi-k2-0905-preview` | `moonshotai/kimi-k2-0905` (262K context) |
| `kimi-k2-turbo-preview` | `moonshotai/kimi-k2` (131K context) |
| `kimi-k2-thinking-turbo` | `moonshotai/kimi-k2-thinking` (262K context) |

## Available Moonshot Models on OpenRouter

### `moonshotai/kimi-k2-thinking` (Recommended - Default)
- **Context**: 262K tokens
- **Best for**: Complex reasoning, large documents, study notes
- **Default**: Yes
- **Use case**: Study notes generation, quiz generation, complex problem solving
- **Pricing**: $0.00000045/1M prompt, $0.00000235/1M completion

### `moonshotai/kimi-k2-0905`
- **Context**: 262K tokens
- **Best for**: Latest features, large documents
- **Use case**: Latest version with extended capabilities
- **Pricing**: $0.00000039/1M prompt, $0.0000019/1M completion

### `moonshotai/kimi-k2`
- **Context**: 131K tokens
- **Best for**: Standard use cases, good balance
- **Use case**: General purpose, faster than thinking model
- **Pricing**: $0.000000456/1M prompt, $0.00000184/1M completion

### `moonshotai/kimi-k2:free`
- **Context**: 32K tokens
- **Best for**: Testing, small documents
- **Use case**: Free tier for development/testing
- **Pricing**: Free

### `moonshotai/kimi-linear-48b-a3b-instruct`
- **Context**: 1M tokens (largest!)
- **Best for**: Extremely large documents
- **Use case**: Massive document processing
- **Pricing**: $0.0000007/1M prompt, $0.0000009/1M completion

## Configuration

### Default Configuration

The system uses `moonshot/moonshot-v1-128k` by default, which is perfect for:
- ✅ Large PDF documents (up to 128K tokens)
- ✅ Complex study notes generation
- ✅ Multi-step reasoning tasks
- ✅ Quiz question generation

### Override Model

You can override the default model in two ways:

1. **Via Environment Variable** (recommended):
   ```bash
   MOONSHOT_MODEL=moonshot/moonshot-v1-32k
   ```

2. **Via Code** (in API calls):
   ```typescript
   await aiClient.chatCompletions(messages, {
     model: 'moonshot/moonshot-v1-32k',
     // ... other options
   })
   ```

## Testing

After setting up your API key:

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Test the connection**:
   - Try generating study notes
   - Check console logs for OpenRouter initialization messages
   - Look for: `✅ [OPENROUTER] Client initialized with API key`

3. **Verify in OpenRouter Dashboard**:
   - Go to https://openrouter.ai/activity
   - Check that API calls are being made
   - Monitor usage and costs

## Troubleshooting

### 401 Authentication Error

**Symptoms**: `OpenRouter API authentication failed (401)`

**Solutions**:
1. ✅ Verify `OPEN_ROUTER_KEY` is set in `.env.local`
2. ✅ Check the key is correct (no extra spaces, quotes, etc.)
3. ✅ Ensure your OpenRouter account has credits
4. ✅ Restart your dev server after updating `.env.local`
5. ✅ Check your OpenRouter dashboard for account status

### Model Not Found (404)

**Symptoms**: `Model not found` or `404` errors

**Solutions**:
1. ✅ Verify the model name is correct (e.g., `moonshot/moonshot-v1-128k`)
2. ✅ Check OpenRouter's available models: https://openrouter.ai/models
3. ✅ Ensure the model is available on OpenRouter (some models may be restricted)

### Rate Limiting (429)

**Symptoms**: `Rate limit exceeded` or `429` errors

**Solutions**:
1. ✅ Check your OpenRouter account tier/limits
2. ✅ Add more credits to your account
3. ✅ Upgrade your OpenRouter plan if needed
4. ✅ Implement rate limiting in your code

## Cost Information

OpenRouter charges based on:
- **Input tokens**: Text sent to the model
- **Output tokens**: Text generated by the model
- **Model pricing**: Each model has different pricing

Check current pricing at: https://openrouter.ai/models

**Example** (approximate):
- `moonshot/moonshot-v1-128k`: ~$0.001 per 1K tokens
- Much cheaper than direct OpenAI GPT-4o
- Similar quality for study notes generation

## Migration from Direct Moonshot API

If you were previously using `MOONSHOT_API_KEY`:

1. **Get OpenRouter key**: Sign up at https://openrouter.ai/
2. **Update `.env.local`**:
   ```bash
   # Old (remove or comment out)
   # MOONSHOT_API_KEY=sk-...
   
   # New (add this)
   OPEN_ROUTER_KEY=sk-or-v1-...
   ```
3. **Restart dev server**: `npm run dev`
4. **Test**: Try generating study notes

The code automatically handles the migration - no code changes needed!

## Benefits of OpenRouter

✅ **Reliability**: Better uptime and error handling
✅ **Ease of Use**: One API key for multiple providers
✅ **Cost Tracking**: Built-in usage tracking and billing
✅ **Model Access**: Access to multiple AI providers
✅ **Support**: Better documentation and support
✅ **No Direct API Issues**: Avoids Moonshot API authentication problems

---

**Last Updated**: After OpenRouter integration
**Status**: ✅ **PRODUCTION READY**

