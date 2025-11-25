/**
 * Replicate API Client for Diagram Generation
 * 
 * Handles image generation using Stable Diffusion via Replicate
 * Cost: ~$0.002-0.01 per image (16x cheaper than Nano Banana)
 * 
 * API Documentation: https://replicate.com/docs
 * API Access: https://replicate.com
 */

export interface DiagramGenerationOptions {
  prompt: string
  aspectRatio?: "16:9" | "1:1" | "original"
  style?: "educational" | "scientific" | "diagram" | "illustration"
}

export interface GeneratedDiagram {
  image_data_b64: string
  width: number
  height: number
}

/**
 * Generate a diagram/image using Replicate API (Stable Diffusion)
 * 
 * @param options - Generation options including prompt and style
 * @returns Base64 encoded image data with dimensions
 */
export async function generateDiagram(
  options: DiagramGenerationOptions
): Promise<GeneratedDiagram> {
  const apiToken = process.env.REPLICATE_API_TOKEN

  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN is not set in environment variables')
  }

  const { prompt, aspectRatio = "16:9", style = "educational" } = options

  // Enhance prompt based on style - optimized for educational diagrams
  const enhancedPrompt = style === "educational" || style === "scientific"
    ? `Educational ${style} diagram: ${prompt}. Clear, simple line drawing, black and white, suitable for students, with clear labels and scientific notation.`
    : style === "diagram"
    ? `Technical diagram: ${prompt}. Clean line drawing, black and white, with labels, arrows, and clear visual elements.`
    : `Educational illustration: ${prompt}. Simple, clear, black and white line drawing.`

  // Negative prompt to avoid unwanted elements
  const negativePrompt = "photorealistic, complex artwork, colorful, artistic style, shadows, gradients, 3D rendering, realistic textures"

  try {
    // Create prediction
    const createResponse = await fetch(
      'https://api.replicate.com/v1/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // Stable Diffusion XL
          input: {
            prompt: enhancedPrompt,
            negative_prompt: negativePrompt,
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: 20, // Lower steps = faster/cheaper (20 is good for diagrams)
            width: aspectRatio === "1:1" ? 1024 : 1024,
            height: aspectRatio === "1:1" ? 1024 : 768,
          }
        })
      }
    )

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('❌ [REPLICATE] API Error:', createResponse.status, errorText)
      throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`)
    }

    const prediction = await createResponse.json()

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [REPLICATE] Prediction created: ${prediction.id}`)
    }

    // Poll for completion (Replicate is async)
    let result = prediction
    let attempts = 0
    const maxAttempts = 60 // 60 seconds max wait

    while (result.status === 'starting' || result.status === 'processing') {
      if (attempts >= maxAttempts) {
        throw new Error('Replicate prediction timed out')
      }

      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${apiToken}`,
          }
        }
      )

      if (!statusResponse.ok) {
        throw new Error(`Failed to check prediction status: ${statusResponse.status}`)
      }

      result = await statusResponse.json()
      attempts++

      if (process.env.NODE_ENV === 'development' && attempts % 5 === 0) {
        console.log(`⏳ [REPLICATE] Still processing... (${attempts}s)`)
      }
    }

    if (result.status === 'failed') {
      console.error('❌ [REPLICATE] Prediction failed:', result.error)
      throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`)
    }

    if (!result.output || !result.output[0]) {
      console.error('❌ [REPLICATE] No output in response:', JSON.stringify(result, null, 2))
      throw new Error('No image data returned from Replicate API')
    }

    // Download image from URL
    const imageUrl = result.output[0]
    const imageResponse = await fetch(imageUrl)

    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from Replicate: ${imageResponse.status}`)
    }

    // Convert to base64
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Data = Buffer.from(imageBuffer).toString('base64')

    // Determine dimensions based on aspect ratio
    let width = 1024
    let height = 768

    if (aspectRatio === "1:1") {
      width = 1024
      height = 1024
    } else if (aspectRatio === "16:9") {
      width = 1024
      height = 576
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [REPLICATE] Generated diagram: ${width}x${height}px (cost: ~$0.003)`)
    }

    return {
      image_data_b64: base64Data,
      width,
      height
    }
  } catch (error) {
    console.error('❌ [REPLICATE] Error generating diagram:', error)
    throw error
  }
}

/**
 * Generate a diagram specifically for a quiz question
 * Creates a prompt that ensures the diagram directly relates to the question
 * 
 * @param question - The quiz question object
 * @param documentContext - Context from the source document
 * @param subject - Subject area (physics, chemistry, etc.)
 * @returns Generated diagram
 */
export async function generateQuizQuestionDiagram(
  question: {
    question: string
    type: string
    options?: string[]
    explanation?: string
  },
  documentContext: string,
  subject?: string
): Promise<GeneratedDiagram> {
  // Extract key concepts from the question
  const questionText = question.question
  const explanation = question.explanation || ''
  
  // Create a detailed prompt optimized for Stable Diffusion
  // Keep it concise and focused for better results
  const prompt = `Educational diagram illustrating: ${questionText}

${explanation ? `Shows: ${explanation.substring(0, 200)}` : ''}

${subject ? `Subject: ${subject}. ` : ''}Clear line drawing, black and white, with labels and annotations. Suitable for students.`

  return generateDiagram({
    prompt,
    aspectRatio: "16:9",
    style: subject === "physics" || subject === "chemistry" || subject === "biology" 
      ? "scientific" 
      : "educational"
  })
}

