# Diagram & Figure Extraction Implementation

## ✅ What's Been Implemented

### 1. PDF Image Extractor (`src/lib/pdf-image-extractor.ts`)
- **Full page rendering**: Renders each PDF page to canvas and extracts as PNG
- **High quality**: Uses 2x scale for better image quality
- **Base64 encoding**: Converts images to base64 for storage/transmission
- **Page tracking**: Tracks which page each image came from
- **Error handling**: Graceful fallback if extraction fails

### 2. Diagram Analyzer Agent (`src/lib/agents/diagram-analyzer-agent.ts`)
- **AI-powered analysis**: Uses GPT-4o to analyze extracted images
- **Context-aware**: Uses document content to understand what diagrams show
- **Smart descriptions**: Generates titles, captions, and descriptions
- **Type identification**: Identifies diagram types (flowchart, tree, trace, algorithm, etc.)
- **Concept linking**: Links diagrams to concepts mentioned in documents
- **Page references**: Includes page numbers in captions

### 3. Integration with Notes API
- **Automatic extraction**: Extracts images during PDF processing
- **Analysis pipeline**: Analyzes extracted diagrams after note generation
- **Fallback handling**: Creates basic diagram entries if analysis fails
- **Web image enrichment**: Still enriches with web images if needed

### 4. Multi-Agent Orchestrator Support
- **Parallel execution**: Diagram analyzer runs in parallel with other agents
- **Integrated workflow**: Diagrams included in final note assembly

## 🎯 How It Works

### Extraction Flow

```
1. PDF Upload
   ↓
2. Extract Images (pdf-image-extractor.ts)
   - Render each page to canvas
   - Convert to base64 PNG
   - Track page numbers
   ↓
3. Generate Notes (OpenAI)
   - Creates initial notes structure
   ↓
4. Analyze Diagrams (DiagramAnalyzerAgent)
   - Analyzes extracted images
   - Generates titles, captions, descriptions
   - Links to document concepts
   ↓
5. Enrich with Web Images (if needed)
   - Adds web images for diagrams without extracted images
   ↓
6. Final Notes with Diagrams
```

### Example Output

For a Heap Sort diagram like the one shown:
```json
{
  "source": "file",
  "title": "Heap Sort - Insertion and Re-heapification",
  "caption": "Demonstrates the insertion of element 45 into a max-heap and the subsequent re-heapification process. Shows three states: initial insertion, after first swap (14 and 45), and final max-heap state after second swap (22 and 45). Illustrates the bubble-up process to maintain max-heap property (p. 15)",
  "page": 15,
  "type": "algorithm",
  "keywords": ["heap sort", "max heap", "re-heapification", "binary tree"],
  "relates_to_concepts": ["Heap Sort", "Max-Heap Property", "Bubble-Up Algorithm"],
  "image_data_b64": "...",
  "width": 1200,
  "height": 800
}
```

## 🔧 Technical Details

### Dependencies Added
- `pdfjs-dist` - PDF parsing and rendering
- `canvas` - Canvas API for Node.js (image rendering)

### Image Format
- **Format**: PNG (base64 encoded)
- **Quality**: 2x scale rendering for clarity
- **Storage**: Base64 string in `image_data_b64` field
- **Display**: Rendered in study notes viewer component

## 📊 Benefits

1. **Captures All Visual Content**: Renders entire pages, capturing diagrams, charts, tables, and figures
2. **Context-Aware Descriptions**: AI analyzes diagrams in context of document content
3. **Better Study Materials**: Students can see and reference actual diagrams from documents
4. **Automatic Recognition**: System identifies what diagrams show without manual input
5. **Integrated Workflow**: Works seamlessly with existing note generation

## 🚀 Future Enhancements

1. **Selective Extraction**: Only extract pages that contain diagrams (detect via text analysis)
2. **Individual Image Extraction**: Extract individual embedded images vs full page rendering
3. **Diagram Cropping**: Automatically crop diagrams from pages
4. **OCR Integration**: Extract text from diagrams for better analysis
5. **Visual Search**: Use image embeddings to find similar diagrams

## 🐛 Known Limitations

1. **Full Page Rendering**: Currently renders entire pages (includes text and diagrams)
   - **Solution**: DiagramAnalyzerAgent can identify which pages contain significant diagrams
   - **Future**: Implement selective extraction based on content analysis

2. **Large File Sizes**: Base64 encoded full pages can be large
   - **Solution**: Consider compression or CDN storage for production

3. **Canvas Dependencies**: Requires `canvas` package which has native dependencies
   - **Solution**: Works on most systems, may need additional setup on some platforms

## 📝 Usage

The system automatically extracts and analyzes diagrams when:
- PDF files are uploaded
- Notes are generated
- Diagrams are present in the documents

No additional configuration needed - it works out of the box!

