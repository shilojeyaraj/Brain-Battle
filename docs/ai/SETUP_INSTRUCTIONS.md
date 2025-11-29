# Kimi K2 Setup Instructions

## Quick Start

### 1. Add Environment Variables

Add to your `.env.local` file:

```bash
# Your existing OpenAI key (for parallel testing or fallback)
OPENAI_API_KEY=your_openai_key

# Moonshot AI (Kimi K2) API Key
MOONSHOT_API_KEY=your_moonshot_api_key

# Enable parallel testing to compare both providers
AI_PROVIDER=both
```

### 2. Restart Development Server

After adding the environment variables, restart your Next.js dev server:

```bash
npm run dev
```

### 3. Test Study Notes Generation

1. Go to your singleplayer page
2. Upload a 5MB PDF document
3. Generate study notes
4. Check the console logs for parallel test results

## What to Look For

### Console Output

When parallel testing is enabled, you'll see:

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
```

### Quality Comparison

Compare the study notes from both providers:

1. **Formula Extraction**: Are all formulas extracted correctly?
2. **Outline Quality**: Are outline items document-specific (not generic)?
3. **Key Terms**: Are definitions accurate and complete?
4. **Concepts**: Are concepts comprehensive and well-structured?
5. **Practice Questions**: Are questions relevant and answerable?
6. **JSON Schema**: Does the output match the expected schema?

## Configuration Options

### Option 1: Parallel Testing (Recommended for Testing)
```bash
AI_PROVIDER=both
```
- Runs both providers simultaneously
- Compares costs and quality
- Uses Moonshot if successful, falls back to OpenAI

### Option 2: Moonshot Only
```bash
AI_PROVIDER=moonshot
```
- Uses only Kimi K2
- 83% cost savings
- Requires quality verification first

### Option 3: OpenAI Only (Default)
```bash
AI_PROVIDER=openai
# or omit AI_PROVIDER
```
- Uses only GPT-4o
- Current production setup

## Troubleshooting

### "MOONSHOT_API_KEY not set" Error
- Ensure the key is in `.env.local` (not `.env`)
- Restart the dev server after adding the key
- Check for typos in the variable name

### "Model not found" Error
- Verify the model name: `kimi-k2-0711-preview`
- Check Moonshot API documentation for updates
- Try setting `MOONSHOT_MODEL=kimi-k2-0711-preview` explicitly

### Parallel Testing Not Working
- Ensure both `OPENAI_API_KEY` and `MOONSHOT_API_KEY` are set
- Set `AI_PROVIDER=both`
- Check console for specific error messages

## Next Steps After Testing

1. **If quality is acceptable:**
   - Switch to `AI_PROVIDER=moonshot` for production
   - Monitor quality metrics
   - Enjoy 83% cost savings!

2. **If quality needs improvement:**
   - Adjust prompts if needed
   - Test with different document types
   - Consider hybrid approach (Moonshot for some, OpenAI for others)

3. **If quality is not acceptable:**
   - Keep using OpenAI
   - Re-evaluate after Moonshot model updates
   - Consider other cost optimization strategies

## Cost Impact

With 1,000 active users:
- **Current (OpenAI)**: $4,000/month
- **With Kimi K2**: $700/month
- **Savings**: $3,300/month (83%)

This allows you to:
- Offer more free tier documents
- Lower Pro pricing
- Improve profit margins
- Scale more efficiently

