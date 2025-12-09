import * as fs from 'fs';
import { Buffer } from 'node:buffer';

async function test() {
  console.log('🔍 Testing pdf-parse import and worker configuration...');
  
  try {
    const pdfParseModule = await import('pdf-parse');
    console.log('✅ Import successful');
    
    // Simulate the fix logic
    const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule.default;
    
    if (!PDFParse) {
      console.error('❌ PDFParse class not found!');
      return;
    }
    
    console.log('✅ PDFParse class found');
    
    if (typeof PDFParse.setWorker === 'function') {
      console.log('✅ setWorker method found');
      try {
        // Set to dummy value to disable worker
        const result = PDFParse.setWorker('data:application/javascript,void(0);');
        console.log('✅ setWorker executed successfully. Result:', result);
      } catch (e) {
        console.error('❌ setWorker failed:', e);
      }
    } else {
      console.error('⚠️ setWorker method NOT found');
    }
    
    // Try to instantiate and verify no worker error
    console.log('🔄 Attempting to instantiate PDFParse with serverless options...');
    const buffer = Buffer.from('%PDF-1.0\n%EOF'); 
    const parser = new PDFParse({ 
      data: buffer,
      useSystemFonts: true,
      disableAutoFetch: true,
      useWorkerFetch: false,
      isEvalSupported: false
    });
    console.log('✅ PDFParse instantiated');
    
    // Cleanup
    if (parser.destroy) {
        await parser.destroy();
        console.log('✅ PDFParse destroyed');
    }

  } catch (e) {
    console.error('❌ Test failed:', e);
    process.exit(1);
  }
}

test();

