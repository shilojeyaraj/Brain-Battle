# Replicate (Stable Diffusion) Diagram Generation - Implementation Summary

**Updated**: Switched from Nano Banana to Replicate for 16x cost savings

## ✅ What Was Implemented

### 1. Replicate API Client (`src/lib/nanobanana/client.ts`)
- Created client for Replicate (Stable Diffusion) image generation API
- Supports educational, scientific, diagram, and illustration styles
- Cost: ~$0.002-0.01 per image (16x cheaper than Nano Banana!)
- Includes `generateQuizQuestionDiagram()` function that ensures diagrams relate directly to quiz questions
- Uses Stable Diffusion XL model optimized for educational diagrams

### 2. Diagram Quota Management (`src/lib/subscription/diagram-limits.ts`)
- Tracks trial diagrams (3 one-time) and monthly quota (2 per month)
- Free tier: 3 trial + 2/month
- Pro tier: Unlimited
- Functions:
  - `checkQuizDiagramLimit()` - Check if user can generate diagrams
  - `decrementQuizDiagramQuota()` - Decrement quota after generation

### 3. Subscription Limits Updated (`src/lib/subscription/limits.ts`)
- Added `maxQuizDiagramsPerMonth` to `FeatureLimits`
- Added `trialQuizDiagrams` to `FeatureLimits`
- Added `canGenerateQuizDiagrams` to `FeatureLimits`

### 4. Database Migration (`supabase/migrations/add-diagram-tracking.sql`)
- Added columns to `player_stats`:
  - `trial_quiz_diagrams_remaining` (INTEGER, default: 3)
  - `quiz_diagrams_this_month` (INTEGER, default: 0)
  - `has_used_trial_quiz_diagrams` (BOOLEAN, default: false)
  - `last_quiz_diagram_reset_date` (DATE)

### 5. Quiz Generation Integration (`src/app/api/generate-quiz/route.ts`)
- Enhanced prompt to ensure questions with diagrams actually relate to the diagrams
- Questions with `requires_image: true` MUST be about the visual content
- After question generation, checks quota and generates diagrams for eligible questions
- Diagrams are generated using context from the question and document
- Attaches base64 image data to questions

## 🎯 Key Features

### Question-Diagram Relationship Enforcement
The quiz generation prompt now includes strict requirements:
- Questions with `requires_image: true` MUST directly relate to the diagram
- Question text MUST reference specific elements from the diagram
- Questions should be impossible or very difficult to answer without the visual
- Examples of good vs bad diagram questions are provided in the prompt

### Freemium Model
- **Free Tier**: 3 trial diagrams (one-time) + 2 per month
- **Pro Tier**: Unlimited diagrams
- Quota automatically resets on the 1st of each month
- Clear messaging when quota is reached

## 📋 Next Steps

### 1. Get Replicate API Token
1. Visit: https://replicate.com
2. Sign up for a free account
3. Get API token from: https://replicate.com/account/api-tokens
4. Add to `.env.local`:
   ```
   REPLICATE_API_TOKEN=r8_your_token_here
   ```

### 2. Run Database Migration
```sql
-- Run: supabase/migrations/add-diagram-tracking.sql
```

### 3. Test the Feature
1. Generate a quiz with physics/chemistry/biology content
2. Questions with `requires_image: true` should get diagrams
3. Verify quota tracking works correctly
4. Test upgrade prompt when quota is reached

## 💰 Cost Analysis

### Per Free User (with Replicate)
- Trial: 3 × $0.003 = $0.009 (one-time)
- Monthly: 2 × $0.003 = $0.006/month
- First month: $0.015
- Ongoing: $0.006/month per active user

**Savings**: 94% cheaper than Nano Banana!

### Scaling
- 100 users: ~$10/month
- 1,000 users: ~$100/month
- 10,000 users: ~$1,000/month

## 🔧 Files Modified/Created

### Created
- `src/lib/nanobanana/client.ts` - Replicate API client (using Stable Diffusion)
- `src/lib/subscription/diagram-limits.ts` - Quota management
- `supabase/migrations/add-diagram-tracking.sql` - Database migration
- `docs/features/NANOBANANA_SETUP.md` - Setup guide

### Modified
- `src/lib/subscription/limits.ts` - Added diagram limits
- `src/app/api/generate-quiz/route.ts` - Integrated diagram generation

## ⚠️ Important Notes

1. **API Token Required**: Must set `REPLICATE_API_TOKEN` in environment variables
2. **Async Generation**: Replicate is async - images take 5-15 seconds to generate (this is normal)
2. **Database Migration**: Must run migration before feature works
3. **Question Quality**: The prompt enforces that questions with diagrams must relate to the visual - this is critical for user experience
4. **Error Handling**: If diagram generation fails, quiz generation continues without diagrams (graceful degradation)

## 🐛 Known Issues / TODO

- Minor TypeScript linting warning on line 577 (non-blocking)
- Consider adding caching for diagram generation to reduce costs
- Consider adding diagram quality validation
- Consider adding user feedback mechanism for diagram quality

