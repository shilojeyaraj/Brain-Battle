# Download Notes Feature - How It Works

## Overview

The **Download Notes** button allows students to export their AI-generated study notes as a PDF file. This feature converts all the structured study content into a well-formatted PDF document that students can save, print, or share.

## How the Download Button Works

### Location
The download button is located in the **Study Notes Viewer** component (`src/components/study-notes/study-notes-viewer.tsx`), specifically in the sidebar's "Ready to Test?" section.

### Technical Implementation

1. **Library Used**: `jsPDF` - A JavaScript library for generating PDFs in the browser
   - Dynamically imported when the button is clicked (lazy loading)
   - No need to install globally - loaded on-demand

2. **Process Flow**:
   ```
   User clicks "Download Notes" 
   → handleDownloadNotes() function executes
   → jsPDF library is dynamically imported
   → New PDF document is created
   → Content is formatted and added section by section
   → PDF is saved with filename: "{title}_study_notes.pdf"
   ```

3. **PDF Generation Steps**:
   - Creates a new PDF document with standard page size (A4)
   - Sets up margins (20px) and page dimensions
   - Iterates through all study note sections:
     - Title and metadata (subject, education level, difficulty)
     - Complexity analysis
     - Outline
     - Key terms
     - Concepts
     - Diagrams (with captions and page references)
     - **Formulas** (with improved formatting - see below)
     - Practice questions
     - Study tips
     - Common misconceptions
     - Resources (links and videos)
   - Handles page breaks automatically when content exceeds page height
   - Saves the PDF file to the user's downloads folder

## How Notes Are Formatted for Students

### 1. **Structure & Organization**
The PDF maintains the same logical structure as the web view:
- **Hierarchical sections** with clear headings
- **Numbered lists** for outlines and practice questions
- **Bullet points** for concepts and key points
- **Page references** for citations (e.g., "Page 5", "Page 6")

### 2. **Typography & Styling**
- **Headings**: Bold, larger font sizes (16-20pt) for section titles
- **Body text**: Standard 12pt font for readability
- **Formulas**: 
  - **14pt bold monospace font** (Courier)
  - **Blue color** (RGB: 0, 100, 200) to distinguish from regular text
  - **Centered alignment** for visual prominence
  - **Improved spacing** around operators (newly added)

### 3. **Content Formatting**

#### **Formulas** (Recently Improved!)
Formulas are now formatted using **LaTeX-style notation** similar to ChatGPT's method:

**Before** (plain text):
```
BHN = 2F/(πD[D-√(D²-Di²)])
```

**After** (formatted with proper notation):
- **Display**: Uses HTML `<sub>` and `<sup>` tags for subscripts and superscripts
- **PDF**: Properly spaced with clear operator separation
- **Markdown**: Can be converted to LaTeX notation for advanced rendering

**Example improvements**:
- Subscripts: `D_i` → `D<sub>i</sub>` (visual subscript)
- Superscripts: `x²` → `x<sup>2</sup>` (visual superscript)
- Fractions: Better visual representation
- Greek letters: Styled with italic font
- Operators: Proper spacing around `=`, `+`, `-`, `×`, `÷`, etc.

#### **Variables**
Each formula includes:
- Variable symbol (e.g., `F`, `D`, `D_i`)
- Variable meaning (e.g., "Applied load", "Diameter of indenter")
- Formatted as: `F: Applied load`

#### **Examples**
Formula examples are highlighted:
- Green text color in PDF
- Separate section with clear "Example:" label
- Includes actual calculations when available

### 4. **Section-Specific Formatting**

#### **Outline**
- Numbered list (1., 2., 3., ...)
- Each item on a new line
- Page references included where applicable

#### **Key Terms**
- Term name in **bold**
- Definition follows on next line
- Importance level shown (high/medium/low)

#### **Concepts**
- Concept heading in **bold**
- Bullet points for key information
- Examples listed separately
- Connections to other concepts included

#### **Diagrams**
- Diagram title
- Caption/description
- Page reference
- Source indicator (from document or web)

#### **Practice Questions**
- Question number (Q1, Q2, ...)
- Question type and difficulty shown
- Answer highlighted in green
- Explanation included
- Options listed for multiple choice questions

## Formula Formatting Improvements

### New Utility Functions

Created `src/lib/utils/formula-formatter.ts` with three formatting functions:

1. **`formatFormulaToHTML()`**: Converts formulas to HTML with proper sub/superscript tags
   - Used in the web viewer for better visual display
   - Handles subscripts, superscripts, fractions, Greek letters, operators

2. **`formatFormulaForPDF()`**: Formats formulas for PDF generation
   - Adds proper spacing around operators
   - Cleans up multiple spaces
   - Ensures readability in PDF format

3. **`formatFormulaToLaTeX()`**: Converts to LaTeX notation
   - For future use with math rendering libraries (KaTeX, MathJax)
   - Full LaTeX syntax support

### Supported Mathematical Notation

The formatter handles:
- ✅ **Subscripts**: `D_i`, `l_f`, `A_0` → `D<sub>i</sub>`
- ✅ **Superscripts**: `x²`, `E=mc²` → `x<sup>2</sup>`
- ✅ **Greek letters**: `π`, `α`, `β`, `γ`, `Δ`, `Σ` (preserved and styled)
- ✅ **Operators**: `=`, `+`, `-`, `×`, `÷`, `√`, `∫`, `Σ`, `Π`
- ✅ **Fractions**: `a/b`, `(a+b)/(c+d)` (visual representation)
- ✅ **Functions**: `log()`, `ln()`, `sin()`, `cos()`, `tan()`
- ✅ **Special symbols**: `±`, `≈`, `≠`, `≤`, `≥`, `∞`

### Example Transformations

**Brinell Hardness Number**:
```
Original: BHN = 2F/(πD[D-√(D²-Di²)])
HTML:     BHN = 2F/(πD[D-√(D²-D<sub>i</sub>²)])
LaTeX:    BHN = \frac{2F}{\pi D[D-\sqrt{D^{2}-D_{i}^{2}}]}
```

**Impact Energy**:
```
Original: E = mass × g × (h0 - hf)
HTML:     E = mass × g × (h<sub>0</sub> - h<sub>f</sub>)
LaTeX:    E = mass \times g \times (h_{0} - h_{f})
```

## Benefits for Students

1. **Portable Study Material**: PDF can be saved, printed, or shared
2. **Offline Access**: No internet required once downloaded
3. **Professional Formatting**: Clean, organized layout suitable for printing
4. **Complete Content**: All sections included (outline, concepts, formulas, questions)
5. **Page References**: Easy to find original content in source documents
6. **Better Formula Display**: Improved mathematical notation readability

## Technical Details

### File Naming
- Format: `{title}_study_notes.pdf`
- Title is sanitized (special characters replaced with underscores)
- Example: `Material_Properties_Study_Notes.pdf`

### Page Management
- Automatic page breaks when content exceeds page height
- Margins: 20px on all sides
- Page size: Standard A4 (210mm × 297mm)

### Error Handling
- If PDF generation fails, user sees alert: "Failed to download notes. Please try again."
- Errors are logged to console for debugging

## Future Enhancements

Potential improvements:
1. **Math Rendering Libraries**: Integrate KaTeX or MathJax for even better formula display
2. **Customizable Templates**: Allow students to choose PDF layouts
3. **Export Formats**: Add support for Markdown, DOCX, or HTML export
4. **Interactive PDFs**: Add clickable links and bookmarks
5. **Print Optimization**: Special print-friendly layout option

## Code References

- **Component**: `src/components/study-notes/study-notes-viewer.tsx` (lines 68-296)
- **Formatter Utility**: `src/lib/utils/formula-formatter.ts` (newly created)
- **Schema**: `src/lib/schemas/notes-schema.ts` (defines formula structure)

