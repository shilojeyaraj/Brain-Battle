# Content Extraction Improvements - Formulas, Concepts, and Figures

## 🔍 Issues Identified

### 1. Missing Formulas
**Problem**: Many formulas from the documents are not being extracted:
- % Reduction in Area (% RA) = (A₀ - Af) / A₀
- % Elongation = (l_f - l₀) / l₀ × 100
- True stress: σ = F / A
- True strain: ε = ln(l / l₀) = ln(A₀ / A)
- Conversion formulas: σ = S(1 + e), ε = ln(1 + e)
- Brinell Hardness: BHN = 2F / (πD[D - √(D² - Dᵢ²)])
- UTS conversion: UTS (psi) = BHN × 500
- And many more...

### 2. Missing Concepts
**Problem**: Important concepts are being skipped:
- Ductility (definition, quantification methods)
- Notch Sensitivity (Izod test, fracture toughness)
- True stress vs Engineering stress
- Brinell Hardness Test
- Material properties and their relationships

### 3. Missing Figures/Diagrams
**Problem**: Diagrams and figures from the documents are not being captured:
- Tensile test specimens (before/after)
- Hardness test diagrams
- Notch sensitivity illustrations
- Material property charts

### 4. Generic Outline Items
**Problem**: Outline items are too generic and not specific to the document:
- ❌ "Definition and importance of stress and strain"
- ❌ "Understanding tensile strength, modulus of resilience, and tensile toughness"
- ❌ "Poisson's ratio and its significance in material deformation"

**Should be**:
- ✅ "Engineering stress (S = F/A₀) and strain (e = Δl/l₀): definitions, measurement via tensile testing, relationship to material properties, and conversion to true stress/strain (σ = S(1+e), ε = ln(1+e)) (p. 1)"
- ✅ "Ductility quantification: % Elongation = (l_f - l₀)/l₀ × 100 and % Reduction in Area = (A₀ - A_f)/A₀ × 100, with worked example (D₀=12.5mm, Df=9.85mm → 37.9% RA) (p. 2)"
- ✅ "Brinell Hardness Test: procedure (steel sphere, measure indentation), formula BHN = 2F/(πD[D-√(D²-Dᵢ²)]), variables (F, D, Dᵢ), and UTS conversion for steel (UTS = BHN × 500) (p. 3)"

---

## ✅ Fixes Applied

### 1. Enhanced Formula Extraction Prompts
**Location**: `src/app/api/notes/route.ts`

**Changes**:
- Added explicit examples of ALL formula types to extract
- Added instruction to scan "character by character" for formulas
- Added specific examples: % RA, % elongation, true stress/strain, Brinell, etc.
- Added instruction to COUNT formulas before finishing
- Lowered temperature from 0.3 to 0.2 for better fidelity

**New Instructions**:
```
1. **FORMULAS (MANDATORY - EXTRACT EVERY SINGLE ONE)**: 
   Scan the ENTIRE document character by character for ALL formulas. Look for:
   - Mathematical expressions with =, ÷, ×, +, -, √, ln, log, ∫, Σ, ∏
   - Formulas with subscripts (A₀, l₀, Dᵢ, l_f, A_f, D₀, Df) and superscripts
   - Greek letters (σ, ε, π, Δ, θ, α, β, γ, etc.)
   - Percentage calculations: % Elongation, % Reduction in Area, %RA
   - Engineering formulas: S = F / A₀, e = Δl / l₀
   - True stress/strain formulas: σ = F / A, ε = ln(l / l₀) = ln(A₀ / A)
   - Conversion formulas: σ = S(1 + e), ε = ln(1 + e)
   - Hardness test formulas: BHN = 2F / (πD[D - √(D² - Dᵢ²)]), UTS = BHN × 500
   - **COUNT**: Before finishing, count how many formulas you found and ensure ALL are in the formulas array
```

### 2. Improved Outline Generation
**Location**: `src/app/api/notes/route.ts`

**Changes**:
- Added explicit REJECT criteria for generic outline items
- Added explicit ACCEPT criteria with specific examples
- Added validation patterns to detect generic items
- Added examples of GOOD vs BAD outline items

**New Validation**:
- REJECT items like: "Definition and importance of...", "Understanding... concepts", "Introduction to..."
- ACCEPT only items with: specific formulas, specific examples, specific tests/procedures, page references
- Each item must be identifiable to THIS document only

### 3. Enhanced Concept Extraction
**Location**: `src/app/api/notes/route.ts`

**Changes**:
- Added explicit list of concepts that MUST be included
- Added instruction to extract concepts from examples and worked problems
- Added requirement to include detailed bullets with specific examples/formulas
- Added instruction to not skip "minor" concepts

**New Instructions**:
```
3. **CONCEPTS**: Extract EVERY concept mentioned - do not skip any:
   - Include ALL concepts like: 
     * Ductility (definition, quantification methods, % elongation, % reduction in area)
     * Notch Sensitivity (Izod test, notched vs unnotched, fracture toughness)
     * True stress vs Engineering stress (definitions, formulas, conversions, limitations)
     * Brinell Hardness (test procedure, formula, variables, UTS conversion)
     * Tensile testing (procedure, measurements, calculations)
   - For each concept, include: heading, detailed bullets with specific examples/formulas, examples from the document, connections to other concepts
```

### 4. Strengthened Validation
**Location**: `src/app/api/notes/route.ts`

**Changes**:
- Added post-processing validation checks
- Added detection of generic outline items
- Added formula count validation
- Added concept count validation
- Added diagram count validation
- Added logging for missing content

**New Validation Checks**:
1. **Generic outline items**: Detects and logs generic patterns
2. **Missing formulas**: Checks if document has math but formulas array is empty
3. **Missing concepts**: Validates that major concepts are included
4. **Missing diagrams**: Validates that all diagrams are captured
5. **Outline specificity**: Checks if outline items have specific content (formulas, examples, page refs)

### 5. Enhanced System Prompt
**Location**: `src/app/api/notes/route.ts`

**Changes**:
- Added explicit validation criteria that must be checked before returning output
- Added instruction to REJECT and regenerate if validation fails
- Added explicit examples of what to extract
- Added instruction to COUNT formulas, concepts, and diagrams

---

## 📊 Expected Improvements

### Before:
- ❌ Generic outline: "Definition and importance of stress and strain"
- ❌ Missing formulas: % RA, % elongation, true stress/strain conversions
- ❌ Missing concepts: Ductility, Notch Sensitivity, Brinell Hardness
- ❌ Missing diagrams: Tensile test specimens, hardness test diagrams

### After:
- ✅ Specific outline: "Engineering stress (S = F/A₀) and strain (e = Δl/l₀): definitions, measurement via tensile testing, relationship to material properties, and conversion to true stress/strain (σ = S(1+e), ε = ln(1+e)) (p. 1)"
- ✅ All formulas extracted: % RA, % elongation, true stress/strain, Brinell, conversions, etc.
- ✅ All concepts included: Ductility, Notch Sensitivity, True stress, Engineering stress, Brinell Hardness, etc.
- ✅ All diagrams captured: With titles, captions, and page references

---

## 🚀 Next Steps

1. **Test with your materials science PDFs**:
   - Upload the documents again
   - Check terminal logs for validation warnings
   - Verify all formulas are extracted
   - Verify outline items are specific
   - Verify all concepts are included

2. **Monitor validation logs**:
   - Look for "CRITICAL" warnings about generic outline items
   - Look for warnings about missing formulas
   - Check formula/concept/diagram counts

3. **If issues persist**:
   - Check terminal logs for specific validation failures
   - Review the extracted content counts
   - Consider adjusting prompts further based on what's still missing

---

## 📝 Files Modified

1. `src/app/api/notes/route.ts`:
   - Enhanced formula extraction instructions
   - Improved outline generation requirements
   - Strengthened concept extraction requirements
   - Added comprehensive validation checks
   - Lowered temperature to 0.2
   - Added post-processing validation logging

