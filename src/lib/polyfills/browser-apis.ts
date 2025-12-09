/**
 * Browser API Polyfills for Serverless Environments
 * 
 * Provides polyfills for browser APIs that don't exist in Node.js/serverless environments
 * but are required by pdfjs-dist and pdf-parse for PDF parsing.
 * 
 * These polyfills must be loaded BEFORE any PDF parsing code runs.
 */

let polyfillsInitialized = false

/**
 * Initialize browser API polyfills for serverless environments
 * This must be called before any PDF parsing operations
 */
export function initializeBrowserPolyfills() {
  // Only initialize once
  if (polyfillsInitialized) {
    return
  }

  // Polyfill DOMMatrix
  if (typeof globalThis.DOMMatrix === 'undefined') {
    try {
      // Try to use @napi-rs/canvas DOMMatrix if available
      // Use dynamic require with try-catch to handle missing module gracefully
      let canvas: any = null
      try {
        canvas = require('@napi-rs/canvas')
      } catch (requireError) {
        // @napi-rs/canvas not available - use fallback polyfill
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [POLYFILLS] @napi-rs/canvas not available, using fallback polyfills')
        }
      }

      if (canvas && canvas.DOMMatrix) {
        (globalThis as any).DOMMatrix = canvas.DOMMatrix
        (globalThis as any).DOMMatrixReadOnly = canvas.DOMMatrixReadOnly || canvas.DOMMatrix
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [POLYFILLS] Using @napi-rs/canvas DOMMatrix')
        }
      } else {
        // Fallback: Simple DOMMatrix polyfill
        class DOMMatrixPolyfill {
          a: number = 1
          b: number = 0
          c: number = 0
          d: number = 1
          e: number = 0
          f: number = 0
          m11: number = 1
          m12: number = 0
          m21: number = 0
          m22: number = 1
          m41: number = 0
          m42: number = 0

          constructor(init?: string | number[]) {
            if (init) {
              if (typeof init === 'string') {
                // Parse matrix string (simplified)
                const values = init.match(/[\d.-]+/g)?.map(Number) || []
                if (values.length >= 6) {
                  this.a = values[0]
                  this.b = values[1]
                  this.c = values[2]
                  this.d = values[3]
                  this.e = values[4]
                  this.f = values[5]
                  this.m11 = values[0]
                  this.m12 = values[1]
                  this.m21 = values[2]
                  this.m22 = values[3]
                  this.m41 = values[4]
                  this.m42 = values[5]
                }
              } else if (Array.isArray(init)) {
                if (init.length >= 6) {
                  this.a = init[0]
                  this.b = init[1]
                  this.c = init[2]
                  this.d = init[3]
                  this.e = init[4]
                  this.f = init[5]
                  this.m11 = init[0]
                  this.m12 = init[1]
                  this.m21 = init[2]
                  this.m22 = init[3]
                  this.m41 = init[4]
                  this.m42 = init[5]
                }
              }
            }
          }

          multiply(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
            const result = new DOMMatrixPolyfill()
            result.a = this.a * other.a + this.c * other.b
            result.b = this.b * other.a + this.d * other.b
            result.c = this.a * other.c + this.c * other.d
            result.d = this.b * other.c + this.d * other.d
            result.e = this.a * other.e + this.c * other.f + this.e
            result.f = this.b * other.e + this.d * other.f + this.f
            return result
          }

          translate(x: number, y: number): DOMMatrixPolyfill {
            const translate = new DOMMatrixPolyfill([1, 0, 0, 1, x, y])
            return this.multiply(translate)
          }

          scale(x: number, y?: number): DOMMatrixPolyfill {
            const scaleY = y !== undefined ? y : x
            const scale = new DOMMatrixPolyfill([x, 0, 0, scaleY, 0, 0])
            return this.multiply(scale)
          }

          rotate(angle: number): DOMMatrixPolyfill {
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)
            const rotate = new DOMMatrixPolyfill([cos, sin, -sin, cos, 0, 0])
            return this.multiply(rotate)
          }
        }

        (globalThis as any).DOMMatrix = DOMMatrixPolyfill as any
        (globalThis as any).DOMMatrixReadOnly = DOMMatrixPolyfill as any
      }
    } catch (error) {
      // If @napi-rs/canvas is not available, use the polyfill
      class DOMMatrixPolyfill {
        a: number = 1
        b: number = 0
        c: number = 0
        d: number = 1
        e: number = 0
        f: number = 0
        m11: number = 1
        m12: number = 0
        m21: number = 0
        m22: number = 1
        m41: number = 0
        m42: number = 0

        constructor(init?: string | number[]) {
          if (init) {
            if (typeof init === 'string') {
              const values = init.match(/[\d.-]+/g)?.map(Number) || []
              if (values.length >= 6) {
                this.a = values[0]
                this.b = values[1]
                this.c = values[2]
                this.d = values[3]
                this.e = values[4]
                this.f = values[5]
                this.m11 = values[0]
                this.m12 = values[1]
                this.m21 = values[2]
                this.m22 = values[3]
                this.m41 = values[4]
                this.m42 = values[5]
              }
            } else if (Array.isArray(init)) {
              if (init.length >= 6) {
                this.a = init[0]
                this.b = init[1]
                this.c = init[2]
                this.d = init[3]
                this.e = init[4]
                this.f = init[5]
                this.m11 = init[0]
                this.m12 = init[1]
                this.m21 = init[2]
                this.m22 = init[3]
                this.m41 = init[4]
                this.m42 = init[5]
              }
            }
          }
        }

        multiply(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
          const result = new DOMMatrixPolyfill()
          result.a = this.a * other.a + this.c * other.b
          result.b = this.b * other.a + this.d * other.b
          result.c = this.a * other.c + this.c * other.d
          result.d = this.b * other.c + this.d * other.d
          result.e = this.a * other.e + this.c * other.f + this.e
          result.f = this.b * other.e + this.d * other.f + this.f
          return result
        }

        translate(x: number, y: number): DOMMatrixPolyfill {
          const translate = new DOMMatrixPolyfill([1, 0, 0, 1, x, y])
          return this.multiply(translate)
        }

        scale(x: number, y?: number): DOMMatrixPolyfill {
          const scaleY = y !== undefined ? y : x
          const scale = new DOMMatrixPolyfill([x, 0, 0, scaleY, 0, 0])
          return this.multiply(scale)
        }

        rotate(angle: number): DOMMatrixPolyfill {
          const cos = Math.cos(angle)
          const sin = Math.sin(angle)
          const rotate = new DOMMatrixPolyfill([cos, sin, -sin, cos, 0, 0])
          return this.multiply(rotate)
        }
      }

      (globalThis as any).DOMMatrix = DOMMatrixPolyfill as any
      (globalThis as any).DOMMatrixReadOnly = DOMMatrixPolyfill as any
    }
  }

  // Polyfill ImageData
  if (typeof globalThis.ImageData === 'undefined') {
    try {
      let canvas: any = null
      try {
        canvas = require('@napi-rs/canvas')
      } catch (requireError) {
        // @napi-rs/canvas not available - use fallback polyfill
      }

      if (canvas && canvas.ImageData) {
        (globalThis as any).ImageData = canvas.ImageData
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [POLYFILLS] Using @napi-rs/canvas ImageData')
        }
      } else {
        // Fallback: Simple ImageData polyfill
        class ImageDataPolyfill {
          data: Uint8ClampedArray
          width: number
          height: number

          constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
            if (dataOrWidth instanceof Uint8ClampedArray) {
              this.data = dataOrWidth
              this.width = widthOrHeight || 0
              this.height = height || 0
            } else {
              this.width = dataOrWidth
              this.height = widthOrHeight || 0
              this.data = new Uint8ClampedArray(this.width * this.height * 4)
            }
          }
        }

        (globalThis as any).ImageData = ImageDataPolyfill
      }
    } catch (error) {
      // Fallback polyfill
      class ImageDataPolyfill {
        data: Uint8ClampedArray
        width: number
        height: number

        constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
          if (dataOrWidth instanceof Uint8ClampedArray) {
            this.data = dataOrWidth
            this.width = widthOrHeight || 0
            this.height = height || 0
          } else {
            this.width = dataOrWidth
            this.height = widthOrHeight || 0
            this.data = new Uint8ClampedArray(this.width * this.height * 4)
          }
        }
      }

      (globalThis as any).ImageData = ImageDataPolyfill
    }
  }

  // Polyfill Path2D
  if (typeof globalThis.Path2D === 'undefined') {
    try {
      let canvas: any = null
      try {
        canvas = require('@napi-rs/canvas')
      } catch (requireError) {
        // @napi-rs/canvas not available - use fallback polyfill
      }

      if (canvas && canvas.Path2D) {
        (globalThis as any).Path2D = canvas.Path2D
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [POLYFILLS] Using @napi-rs/canvas Path2D')
        }
      } else {
        // Fallback: Simple Path2D polyfill (minimal implementation)
        class Path2DPolyfill {
          constructor(path?: string | Path2DPolyfill) {
            // Minimal implementation - just needs to exist
          }

          addPath(path: Path2DPolyfill, transform?: any): void {
            // Stub implementation
          }

          closePath(): void {
            // Stub implementation
          }

          moveTo(x: number, y: number): void {
            // Stub implementation
          }

          lineTo(x: number, y: number): void {
            // Stub implementation
          }

          bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
            // Stub implementation
          }

          quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
            // Stub implementation
          }

          arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
            // Stub implementation
          }

          arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
            // Stub implementation
          }

          ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
            // Stub implementation
          }

          rect(x: number, y: number, width: number, height: number): void {
            // Stub implementation
          }
        }

        (globalThis as any).Path2D = Path2DPolyfill
      }
    } catch (error) {
      // Fallback polyfill
      class Path2DPolyfill {
        constructor(path?: string | Path2DPolyfill) {
          // Minimal implementation
        }

        addPath(path: Path2DPolyfill, transform?: any): void {}
        closePath(): void {}
        moveTo(x: number, y: number): void {}
        lineTo(x: number, y: number): void {}
        bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {}
        quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {}
        arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {}
        arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {}
        ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {}
        rect(x: number, y: number, width: number, height: number): void {}
      }

      (globalThis as any).Path2D = Path2DPolyfill
    }
  }

  polyfillsInitialized = true

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ [POLYFILLS] Browser API polyfills initialized')
  }
}

