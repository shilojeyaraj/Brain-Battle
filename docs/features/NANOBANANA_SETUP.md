# ⚠️ DEPRECATED: Nano Banana Setup Guide

**Note**: This implementation has been switched to Replicate (Stable Diffusion) for cost savings.

**See**: `REPLICATE_SETUP.md` for current setup instructions.

## Why the Switch?

- **Replicate**: ~$0.003 per image (16x cheaper!)
- **Nano Banana**: ~$0.05 per image
- **Quality**: Replicate's Stable Diffusion is perfectly adequate for educational diagrams
- **Savings**: ~$0.047 per image = 94% cost reduction

## Migration

The codebase now uses Replicate instead of Nano Banana. All functionality remains the same, just with much lower costs.

## How It Works in Brain Battle

### Free Tier Limits
- **Trial**: 3 AI-generated quiz diagrams (one-time)
- **Monthly**: 2 AI-generated quiz diagrams per month
- **Total**: ~5 diagrams to try the feature, then 2/month

### Pro Tier
- **Unlimited** AI-generated quiz diagrams
- Priority generation
- Higher quality options

## Implementation Details

### Diagram Generation Flow

1. **Quiz Generation**
   - User generates quiz questions
   - Questions with `requires_image: true` are identified
   - System checks user's diagram quota
   - If quota available, diagrams are generated using Nano Banana
   - Diagrams are attached to questions as base64 images

2. **Question-Diagram Relationship**
   - Questions with diagrams MUST directly relate to the visual
   - The question text references specific elements from the diagram
   - Questions are impossible or very difficult to answer without seeing the visual

3. **Quota Tracking**
   - Trial diagrams tracked in `player_stats.trial_quiz_diagrams_remaining`
   - Monthly diagrams tracked in `player_stats.quiz_diagrams_this_month`
   - Resets on the 1st of each month

## Database Schema

The following columns were added to `player_stats`:
- `trial_quiz_diagrams_remaining` (INTEGER, default: 3)
- `quiz_diagrams_this_month` (INTEGER, default: 0)
- `has_used_trial_quiz_diagrams` (BOOLEAN, default: false)
- `last_quiz_diagram_reset_date` (DATE)

Run the migration:
```sql
-- See: supabase/migrations/add-diagram-tracking.sql
```

## Cost Analysis

### Per Free User
- Trial (one-time): 3 diagrams × $0.05 = $0.15
- Monthly: 2 diagrams × $0.05 = $0.10/month
- First month total: $0.25
- Ongoing: $0.10/month per active user

### Scaling Example
- 100 free users: ~$10/month (after trial period)
- 1,000 free users: ~$100/month
- 10,000 free users: ~$1,000/month

## Troubleshooting

### API Key Not Working
- Verify the key is correctly set in `.env.local`
- Check that the key is active in your Nano Banana dashboard
- Ensure no extra spaces or quotes around the key

### Diagrams Not Generating
- Check user's quota using `checkQuizDiagramLimit()`
- Verify questions have `requires_image: true`
- Check API logs for Nano Banana errors

### Questions Not Relating to Diagrams
- The quiz generation prompt enforces that questions with `requires_image: true` must directly relate to the diagram
- Questions should reference specific elements from the visual
- If issues persist, review the prompt in `src/app/api/generate-quiz/route.ts`

