# Vision API Implementation for Image Analysis

## Overview

The Vision API integration enables AI-powered analysis of diagrams, figures, and charts extracted from PDF documents. This feature uses OpenAI's GPT-4o Vision API to analyze actual image content and generate detailed descriptions, titles, and captions.

## Architecture

### Components

1. **DiagramAnalyzerAgent** (`src/lib/agents/diagram-analyzer-agent.ts`)
   - Uses OpenAI GPT-4o Vision API directly (not Moonshot)
   - Processes images in batches (max 5 per request)
   - Sends actual base64 image data to Vision API
   - Generates structured diagram analysis

2. **OpenAI Client** (`src/lib/ai/openai-client.ts`)
   - Updated to support Vision API format
   - Handles both text-only and image+text messages
   - Uses `gpt-4o` model for Vision capabilities

3. **Subscription Protection** (`src/lib/security/subscription-validation.ts`)
   - `validateImageAnalysis()` checks Pro subscription
   - Free users cannot use Vision API (cost control)

## How It Works

### 1. Image Extraction (Pro Users Only)

When a Pro user uploads a PDF:
- Images are extracted using `pdf-unified-extractor.ts`
- Base64 encoded images are stored with page numbers
- Only Pro users have `canAnalyzeImages === true`

### 2. Vision API Analysis

The `DiagramAnalyzerAgent`:
1. Receives extracted images with base64 data
2. Processes images in batches of 5 (to avoid token limits)
3. Sends each batch to GPT-4o Vision API with:
   - System prompt (analysis instructions)
   - User prompt (document context + image metadata)
   - Actual images as `data:image/png;base64,{base64_string}`
4. Receives JSON response with diagram analysis
5. Merges analysis with original image data

### 3. Vision API Message Format

```typescript
const messages: AIChatMessage[] = [
  {
    role: 'system',
    content: 'You are a diagram analysis specialist...'
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Analyze these diagrams from the document...'
      },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/png;base64,{base64_string}',
          detail: 'high' // For better analysis
        }
      },
      // ... more images
    ]
  }
]
```

## API Key Requirements

### Required Environment Variable

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important:**
- Must be a direct OpenAI API key (not OpenRouter)
- Vision API requires GPT-4o model access
- Cost: ~$0.01-0.03 per image analysis

## Cost Considerations

### Vision API Pricing (GPT-4o)

- **Input tokens**: ~$0.0025 per 1K tokens
- **Image processing**: ~$0.01-0.03 per image (depends on size)
- **Typical cost per diagram**: $0.015-0.025

### Cost Control

1. **Pro-only feature**: Only Pro users can use Vision API
2. **Batch processing**: Processes up to 5 images per request (efficient)
3. **High detail mode**: Uses `detail: 'high'` for accurate analysis (more expensive but necessary)

## Usage Flow

### Notes Generation API

```typescript
// 1. Check Pro subscription
const imageAnalysisValidation = await validateImageAnalysis(userId)
const canAnalyzeImages = imageAnalysisValidation.allowed

// 2. Extract images (only if Pro)
if (canAnalyzeImages) {
  const pdfContent = await extractPDFTextAndImages(buffer, file.name)
  extractedImages = pdfContent.images || []
}

// 3. Analyze diagrams (only if Pro and images exist)
if (canAnalyzeImages && extractedImages.length > 0) {
  const diagramAnalyzer = new DiagramAnalyzerAgent()
  const result = await diagramAnalyzer.execute({
    extractedImages,
    documentContent: fileContents.join('\n'),
    // ... other inputs
  })
}
```

## Response Format

The Vision API returns:

```json
{
  "diagrams": [
    {
      "source": "file",
      "title": "Bubble Sort Algorithm Trace",
      "caption": "This diagram shows a step-by-step trace of the bubble sort algorithm sorting the array [29, 10, 14, 37, 13] (p. 9)",
      "page": 9,
      "type": "algorithm",
      "keywords": ["bubble sort", "sorting algorithm", "array trace"],
      "relates_to_concepts": ["sorting", "algorithms", "arrays"]
    }
  ]
}
```

## Error Handling

- **Missing API key**: Throws error during initialization
- **Invalid images**: Skips images that can't be processed
- **API failures**: Logs error, continues with other batches
- **Parse errors**: Logs warning, continues processing

## Limitations

1. **Batch size**: Max 5 images per request (to avoid token limits)
2. **Image size**: Large images increase cost
3. **Processing time**: ~2-5 seconds per batch
4. **Cost**: More expensive than text-only analysis

## Future Improvements

1. **Image compression**: Compress images before sending to reduce costs
2. **Smart batching**: Group related images together
3. **Caching**: Cache analysis results for identical images
4. **Lower detail mode**: Option for `detail: 'low'` for faster/cheaper analysis

## Testing

To test Vision API:

1. Ensure `OPENAI_API_KEY` is set
2. Upload a PDF with diagrams as a Pro user
3. Check console logs for:
   - Image extraction count
   - Batch processing info
   - Token usage
   - Analysis results

## Troubleshooting

### "OPENAI_API_KEY environment variable is required"
- Add `OPENAI_API_KEY` to `.env.local`
- Restart dev server

### "Image analysis disabled for free tier user"
- Expected behavior for free users
- Upgrade to Pro to enable

### "Failed to parse response"
- Check API response format
- Verify JSON structure matches expected schema
- Check console for detailed error

### High costs
- Reduce number of images per document
- Consider image compression
- Use `detail: 'low'` for non-critical images

