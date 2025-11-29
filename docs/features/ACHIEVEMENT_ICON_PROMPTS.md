# Achievement Icon/Badge Design Prompts for v0

This document contains prompts to generate achievement icons and badges for the Brain Battle achievement system.

## Design Guidelines

- **Style**: Modern, minimalist, game-inspired icons
- **Color Scheme**: Match rarity colors (common: gray, rare: blue, epic: purple, legendary: orange/gold)
- **Format**: SVG or PNG, 128x128px minimum
- **Background**: Transparent or subtle gradient
- **Border**: Thick, cartoon-style border matching rarity

## Achievement Icons Needed

### Win-Based Achievements

1. **First Victory** (Common)
   - Icon: Trophy
   - Prompt: "A simple bronze trophy icon, minimalist style, game-inspired, transparent background, 128x128px"

2. **Decade Warrior** (Rare)
   - Icon: Trophy with "10"
   - Prompt: "A silver trophy icon with the number 10, minimalist game style, blue accents, transparent background"

3. **Century Champion** (Epic)
   - Icon: Crown with "100"
   - Prompt: "A golden crown icon with the number 100, epic game style, purple accents, transparent background"

4. **Undefeated** (Rare)
   - Icon: Shield with checkmark
   - Prompt: "A shield icon with checkmark, minimalist style, blue accents, game-inspired, transparent background"

5. **Unbeatable** (Epic)
   - Icon: Crown with stars
   - Prompt: "A golden crown with stars, epic style, purple accents, game-inspired, transparent background"

### Streak-Based Achievements

6. **Consistency Starter** (Common)
   - Icon: Flame (small)
   - Prompt: "A small flame icon, minimalist style, gray/orange gradient, game-inspired, transparent background"

7. **Week Warrior** (Rare)
   - Icon: Flame with "7"
   - Prompt: "A flame icon with number 7, minimalist style, blue/orange gradient, game-inspired, transparent background"

8. **Fortnight Fighter** (Rare)
   - Icon: Flame with "14"
   - Prompt: "A flame icon with number 14, minimalist style, blue/orange gradient, game-inspired, transparent background"

9. **Monthly Master** (Epic)
   - Icon: Flame with "30"
   - Prompt: "A large flame icon with number 30, epic style, purple/orange gradient, game-inspired, transparent background"

10. **Centurion** (Legendary)
    - Icon: Flame with "100"
    - Prompt: "A legendary flame icon with number 100, epic style, gold/orange gradient, game-inspired, transparent background"

### Accuracy-Based Achievements

11. **Sharp Shooter** (Rare)
    - Icon: Target with arrow
    - Prompt: "A target icon with arrow in center, minimalist style, blue accents, game-inspired, transparent background"

12. **Marksman** (Epic)
    - Icon: Target with multiple arrows
    - Prompt: "A target icon with multiple arrows, epic style, purple accents, game-inspired, transparent background"

13. **Perfect Score** (Epic)
    - Icon: Star with "100%"
    - Prompt: "A star icon with 100% text, epic style, purple/gold gradient, game-inspired, transparent background"

14. **Perfectionist** (Legendary)
    - Icon: Multiple stars
    - Prompt: "Multiple stars icon, legendary style, gold gradient, game-inspired, transparent background"

### Activity-Based Achievements

15. **Knowledge Seeker** (Common)
    - Icon: Book
    - Prompt: "A book icon, minimalist style, gray accents, game-inspired, transparent background"

16. **Scholar** (Rare)
    - Icon: Book with sparkles
    - Prompt: "A book icon with sparkles, minimalist style, blue accents, game-inspired, transparent background"

17. **Master Student** (Epic)
    - Icon: Graduation cap
    - Prompt: "A graduation cap icon, epic style, purple accents, game-inspired, transparent background"

18. **Quiz Master** (Rare)
    - Icon: Book with checkmark
    - Prompt: "A book icon with checkmark, minimalist style, blue accents, game-inspired, transparent background"

19. **Dedicated Learner** (Epic)
    - Icon: Stack of books
    - Prompt: "A stack of books icon, epic style, purple accents, game-inspired, transparent background"

### Level-Based Achievements

20. **Rising Star** (Common)
    - Icon: Star
    - Prompt: "A simple star icon, minimalist style, gray/gold gradient, game-inspired, transparent background"

21. **Experienced** (Rare)
    - Icon: Star with level badge
    - Prompt: "A star icon with level badge, minimalist style, blue accents, game-inspired, transparent background"

22. **Veteran** (Epic)
    - Icon: Multiple stars
    - Prompt: "Multiple stars icon, epic style, purple accents, game-inspired, transparent background"

23. **Legend** (Legendary)
    - Icon: Crown with stars
    - Prompt: "A legendary crown with stars, epic style, gold gradient, game-inspired, transparent background"

### Special Achievements

24. **First Steps** (Common)
    - Icon: Footprints
    - Prompt: "Footprints icon, minimalist style, gray accents, game-inspired, transparent background"

25. **Speed Demon** (Rare)
    - Icon: Zap/lightning bolt
    - Prompt: "A lightning bolt icon, minimalist style, blue/yellow gradient, game-inspired, transparent background"

26. **Social Butterfly** (Rare)
    - Icon: Users/people
    - Prompt: "Users/people icon, minimalist style, blue accents, game-inspired, transparent background"

27. **Team Player** (Epic)
    - Icon: Users with trophy
    - Prompt: "Users icon with trophy, epic style, purple accents, game-inspired, transparent background"

28. **Early Adopter** (Epic)
    - Icon: Rocket
    - Prompt: "A rocket icon, epic style, purple/orange gradient, game-inspired, transparent background"

## Badge Frame Designs

Create badge frames for each rarity level:

1. **Common Badge Frame**
   - Prompt: "A badge frame border, minimalist style, gray color, thick cartoon-style border, transparent center, 128x128px"

2. **Rare Badge Frame**
   - Prompt: "A badge frame border, minimalist style, blue color, thick cartoon-style border, transparent center, 128x128px"

3. **Epic Badge Frame**
   - Prompt: "A badge frame border, minimalist style, purple color, thick cartoon-style border, transparent center, 128x128px"

4. **Legendary Badge Frame**
   - Prompt: "A badge frame border, minimalist style, gold/orange color, thick cartoon-style border with glow effect, transparent center, 128x128px"

## Usage Instructions

1. Use these prompts in v0 to generate each icon
2. Export as SVG for scalability
3. Ensure all icons have transparent backgrounds
4. Match the color scheme to the rarity level
5. Test icons at different sizes (64px, 128px, 256px)

## Integration Notes

- Icons are referenced by name in the `achievement_definitions` table
- The `icon` field stores the icon identifier (e.g., "trophy", "flame", "star")
- Icons are mapped in `src/lib/achievements/achievement-types.ts` using Lucide React icons as fallbacks
- Custom SVG icons can be added to `/public/achievements/` and referenced by filename

