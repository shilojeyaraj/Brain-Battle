# Kimi K2 Model Update - Official Model Names

## Overview

This document tracks the update to use official Kimi K2 model names as per the [Moonshot AI documentation](https://platform.moonshot.cn/).

## Official K2 Models

All K2 models support **256K context window**:

| Model Name | Description | Use Case |
|------------|-------------|----------|
| `kimi-k2-0905-preview` | Latest version of Kimi K2 | General purpose, latest features |
| `kimi-k2-turbo-preview` | High-speed version | Enterprise-level, high-response applications (60-100 tokens/s) |
| `kimi-k2-thinking` | Long-thinking model | Complex problems, multi-step tool calls, reasoning (default) |
| `kimi-k2-thinking-turbo` | High-speed thinking version | Fast complex problem solving |

## Changes Made

### 1. Default Model Updated
- **Old**: `kimi-k2-0711-preview` (deprecated)
- **New**: `kimi-k2-thinking` (official thinking model)

### 2. Files Updated

#### Core Implementation
- `src/lib/ai/moonshot-client.ts`
  - Updated default model to `kimi-k2-thinking`
  - Added model validation for official K2 models
  - Added max_tokens cap (32K) as per K2 documentation
  - Improved error messages with valid model names

#### API Routes
- `src/app/api/generate-quiz/route.ts` - Uses `kimi-k2-thinking`
- `src/app/api/notes/route.ts` - Uses `kimi-k2-thinking`
- `src/app/api/embeddings/route.ts` - Uses `kimi-k2-thinking`

#### Libraries
- `src/lib/quiz/llm-answer-evaluator.ts` - Uses `kimi-k2-thinking`
- `src/lib/agents/base-agent.ts` - Uses `kimi-k2-thinking`
- `src/lib/actions/quiz-generation.ts` - Uses `kimi-k2-thinking`

#### Testing & Documentation
- `scripts/test-moonshot-key.js` - Updated to check for all official K2 models
- `docs/ai/KIMI_K2_INTEGRATION.md` - Updated with official model names

## Configuration

### Environment Variable

```bash
# Optional: Override default model
MOONSHOT_MODEL=kimi-k2-thinking
```

### Available Options

You can override the model in your `.env.local`:

```bash
# Latest version
MOONSHOT_MODEL=kimi-k2-0905-preview

# High-speed version
MOONSHOT_MODEL=kimi-k2-turbo-preview

# Thinking model (default - best for complex tasks)
MOONSHOT_MODEL=kimi-k2-thinking

# High-speed thinking
MOONSHOT_MODEL=kimi-k2-thinking-turbo
```

## API Configuration

### Base URL
- ✅ Correct: `https://api.moonshot.cn/v1`
- Already configured in `moonshot-client.ts`

### Max Tokens
- K2 models support up to **32,000 max_tokens** for output
- The client automatically caps max_tokens at 32K if provided
- If not specified, the API uses its default

### Context Window
- All K2 models support **256K context window**
- Perfect for large documents and complex reasoning

## Testing

Run the test script to verify your API key and model access:

```bash
npm run test:moonshot
```

This will:
1. Check API key validity
2. List all available models
3. Verify access to official K2 models
4. Test a simple API call with `kimi-k2-thinking`

## Why `kimi-k2-thinking`?

The thinking model is chosen as the default because:
- ✅ Supports multi-step tool calls and reasoning
- ✅ Excels at solving complex problems
- ✅ 256K context window for large documents
- ✅ Ideal for study notes and quiz generation
- ✅ Better suited for educational content analysis

## Migration Notes

If you were using `kimi-k2-0711-preview`:
1. The old model name may still work but is deprecated
2. Update your `.env.local` to use an official model name
3. Restart your dev server after updating
4. Run `npm run test:moonshot` to verify access

## Troubleshooting

### 401 Invalid Authentication
- Verify your API key has access to K2 models
- Check your Moonshot dashboard for model access
- Some accounts may need to enable K2 model access
- Wait 2-3 minutes after creating a new key

### Model Not Found (404)
- Verify the model name is spelled correctly
- Check which models are available with your API key
- Run `npm run test:moonshot` to see available models

### Rate Limiting
- K2 models may have different rate limits
- Check your account tier and limits in the dashboard
- Consider using `kimi-k2-turbo-preview` for higher throughput

## References

- [Kimi K2 Official Documentation](https://platform.moonshot.cn/)
- [Kimi K2 Technical Report](https://platform.moonshot.cn/)
- [Moonshot API Documentation](https://platform.moonshot.cn/docs)

