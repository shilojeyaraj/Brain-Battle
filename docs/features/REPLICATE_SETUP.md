# Replicate API Setup Guide (Stable Diffusion)

## Getting Your API Token

1. **Visit Replicate**
   - Go to: https://replicate.com
   - Sign up for a free account

2. **Get API Token**
   - Navigate to your account settings: https://replicate.com/account/api-tokens
   - Click "Create token"
   - Copy your API token

3. **Add to Environment Variables**
   - Add `REPLICATE_API_TOKEN` to your `.env.local` file:
   ```
   REPLICATE_API_TOKEN=r8_your_token_here
   ```

## API Documentation

- **Full Documentation**: https://replicate.com/docs
- **Stable Diffusion Models**: https://replicate.com/collections/stable-diffusion
- **Cost**: ~$0.002-0.01 per image (16x cheaper than Nano Banana!)

## How It Works in Brain Battle

### Free Tier Limits
- **Trial**: 3 AI-generated quiz diagrams (one-time)
- **Monthly**: 2 AI-generated quiz diagrams per month
- **Total**: ~5 diagrams to try the feature, then 2/month

### Pro Tier
- **Unlimited** AI-generated quiz diagrams
- Priority generation
- Higher quality options

## Cost Comparison

### Replicate vs Nano Banana
| Service | Cost per Image | Monthly (100 images) |
|---------|----------------|---------------------|
| **Replicate (SD)** | $0.002-0.01 | $0.20-1.00 |
| **Nano Banana** | $0.05 | $5.00 |

**Savings: ~16x cheaper!**

### Per Free User
- Trial (one-time): 3 diagrams × $0.003 = $0.009
- Monthly: 2 diagrams × $0.003 = $0.006/month
- First month total: $0.015 (vs $0.25 with Nano Banana)
- Ongoing: $0.006/month per active user (vs $0.10 with Nano Banana)

## Implementation Details

### Diagram Generation Flow

1. **Quiz Generation**
   - User generates quiz questions
   - Questions with `requires_image: true` are identified
   - System checks user's diagram quota
   - If quota available, diagrams are generated using Replicate (Stable Diffusion)
   - Diagrams are attached to questions as base64 images

2. **Question-Diagram Relationship**
   - Questions with diagrams MUST directly relate to the visual
   - The question text references specific elements from the diagram
   - Questions are impossible or very difficult to answer without seeing the visual

3. **Quota Tracking**
   - Trial diagrams tracked in `player_stats.trial_quiz_diagrams_remaining`
   - Monthly diagrams tracked in `player_stats.quiz_diagrams_this_month`
   - Resets on the 1st of each month

## Model Used

- **Model**: Stable Diffusion XL (SDXL)
- **Version**: `39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b`
- **Inference Steps**: 20 (optimized for speed/cost while maintaining quality)
- **Guidance Scale**: 7.5 (good balance for educational diagrams)

## Database Schema

The following columns are used in `player_stats`:
- `trial_quiz_diagrams_remaining` (INTEGER, default: 3)
- `quiz_diagrams_this_month` (INTEGER, default: 0)
- `has_used_trial_quiz_diagrams` (BOOLEAN, default: false)
- `last_quiz_diagram_reset_date` (DATE)

Migration: `supabase/migrations/add-diagram-tracking.sql`

## Troubleshooting

### API Token Not Working
- Verify the token is correctly set in `.env.local`
- Check that the token is active in your Replicate dashboard
- Ensure no extra spaces or quotes around the token
- Token should start with `r8_`

### Diagrams Not Generating
- Check user's quota using `checkQuizDiagramLimit()`
- Verify questions have `requires_image: true`
- Check API logs for Replicate errors
- Replicate predictions are async - allow 5-15 seconds for generation

### Slow Generation
- Replicate is async and takes 5-15 seconds per image
- This is normal - images are generated on-demand
- Consider adding a loading state in the UI

### Quality Issues
- Adjust `num_inference_steps` (higher = better quality but slower/more expensive)
- Modify prompts to be more specific
- Use negative prompts to exclude unwanted elements

## Free Tier

Replicate offers a free tier with:
- Limited credits per month
- Good for testing and low-volume usage
- Upgrade to paid for production use

## Cost Optimization Tips

1. **Lower Inference Steps**: 20 steps is good for diagrams (default is 50)
2. **Smaller Images**: 1024x768 is sufficient for educational diagrams
3. **Efficient Prompts**: Shorter, focused prompts generate faster
4. **Batch Processing**: Generate multiple diagrams in parallel when possible

