# Kimi K2 (Moonshot AI) Integration Guide

## Overview

This document describes the integration of Moonshot AI's Kimi K2 model as an alternative to OpenAI's GPT-4o for study notes and quiz generation. Kimi K2 offers significant cost savings (83% reduction) while maintaining high quality.

## Environment Variables

Add the following to your `.env.local` file:

```bash
# Moonshot AI (Kimi K2) API Key
MOONSHOT_API_KEY=your_moonshot_api_key_here

# AI Provider Selection
# Options: 'openai', 'moonshot', or 'both' (for parallel testing)
AI_PROVIDER=both

# Optional: Override default Kimi K2 model name
# Default: kimi-k2-0711-preview
MOONSHOT_MODEL=kimi-k2-0711-preview
```

## Configuration Modes

### 1. OpenAI Only (Default)
```bash
AI_PROVIDER=openai
# or omit AI_PROVIDER (defaults to OpenAI)
```
- Uses GPT-4o for all AI operations
- Current production setup

### 2. Moonshot Only
```bash
AI_PROVIDER=moonshot
MOONSHOT_API_KEY=your_key
```
- Uses Kimi K2 for all AI operations
- 83% cost reduction
- Requires testing to verify quality

### 3. Parallel Testing (Recommended for Testing)
```bash
AI_PROVIDER=both
OPENAI_API_KEY=your_openai_key
MOONSHOT_API_KEY=your_moonshot_key
```
- Runs both providers in parallel
- Compares costs, quality, and performance
- Uses Moonshot result if available, falls back to OpenAI
- Logs detailed comparison metrics

## Cost Comparison

### Single Study Notes Generation (5MB document)

| Provider | Input Tokens | Output Tokens | Cost |
|----------|--------------|---------------|------|
| **OpenAI GPT-4o** | 55K | 20K | **$0.34** |
| **Moonshot Kimi K2** | 55K | 20K | **$0.058** |
| **Savings** | | | **83%** ($0.28) |

### Single Quiz Generation

| Provider | Input Tokens | Output Tokens | Cost |
|----------|--------------|---------------|------|
| **OpenAI GPT-4o** | 13K | 3K | **$0.06** |
| **Moonshot Kimi K2** | 13K | 3K | **$0.009** |
| **Savings** | | | **85%** ($0.05) |

### Total Session Cost

| Provider | Total Cost | Monthly (1000 users) |
|----------|------------|----------------------|
| **OpenAI GPT-4o** | $0.40 | $4,000 |
| **Moonshot Kimi K2** | $0.07 | $700 |
| **Savings** | **83%** | **$3,300/month** |

## API Compatibility

Moonshot API is OpenAI-compatible, so the integration uses the same OpenAI SDK with a different base URL:

- **Base URL**: `https://api.moonshot.cn/v1`
- **Model**: `kimi-k2-0711-preview` (128k context window)
- **Format**: Same as OpenAI (JSON mode supported)

## Parallel Testing

When `AI_PROVIDER=both`, the system:

1. Sends the same request to both providers simultaneously
2. Logs detailed comparison metrics:
   - Token usage (input/output)
   - Cost comparison
   - Response time
   - Error handling
3. Uses Moonshot result if successful, falls back to OpenAI if Moonshot fails
4. Logs all results for quality comparison

### Example Parallel Test Output

```
============================================================
📊 PARALLEL TEST RESULTS - Study Notes Generation
============================================================

✅ OpenAI (GPT-4o):
   - Model: gpt-4o
   - Tokens: 75,000 (55,000 input + 20,000 output)
   - Cost: $0.3375
   - Time: 8543ms

✅ Moonshot (Kimi K2):
   - Model: kimi-k2-0711-preview
   - Tokens: 74,500 (54,500 input + 20,000 output)
   - Cost: $0.0568
   - Time: 7892ms

💰 COST COMPARISON:
   - OpenAI: $0.3375
   - Moonshot: $0.0568
   - Savings: $0.2807 (83.2%)

============================================================
```

## Quality Testing Checklist

When testing Kimi K2, verify:

- [ ] Study notes quality matches GPT-4o
- [ ] Formula extraction is accurate
- [ ] Outline items are document-specific (not generic)
- [ ] Key terms are properly defined
- [ ] Concepts are comprehensive
- [ ] Practice questions are relevant
- [ ] JSON schema compliance
- [ ] Page references are included
- [ ] No hallucination or made-up content

## Migration Strategy

### Phase 1: Parallel Testing (Current)
- Set `AI_PROVIDER=both`
- Run parallel tests on real documents
- Compare quality side-by-side
- Monitor cost savings

### Phase 2: Gradual Rollout
- If quality is acceptable, switch to `AI_PROVIDER=moonshot` for 10% of requests
- Monitor quality metrics
- Gradually increase percentage

### Phase 3: Full Migration
- Switch to `AI_PROVIDER=moonshot` for all requests
- Keep OpenAI as fallback for errors
- Monitor costs and quality

## Troubleshooting

### Error: MOONSHOT_API_KEY not set
- Ensure `MOONSHOT_API_KEY` is in `.env.local`
- Restart the development server after adding the key

### Error: Model not found
- Verify the model name: `kimi-k2-0711-preview`
- Check Moonshot API documentation for latest model names
- Override with `MOONSHOT_MODEL` environment variable

### Parallel testing not working
- Ensure both `OPENAI_API_KEY` and `MOONSHOT_API_KEY` are set
- Set `AI_PROVIDER=both`
- Check console logs for errors

## Files Modified

- `src/lib/ai/types.ts` - Type definitions
- `src/lib/ai/openai-client.ts` - OpenAI client implementation
- `src/lib/ai/moonshot-client.ts` - Moonshot client implementation
- `src/lib/ai/client-factory.ts` - Client factory and configuration
- `src/lib/ai/parallel-test.ts` - Parallel testing utilities
- `src/app/api/notes/route.ts` - Updated to use new AI abstraction layer

## Next Steps

1. ✅ Integration complete
2. ⏳ Test with real documents
3. ⏳ Compare quality metrics
4. ⏳ Make migration decision
5. ⏳ Update quiz generation API (if notes quality is good)

