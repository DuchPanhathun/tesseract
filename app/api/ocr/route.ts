import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

let tesseractNative: any;

try {
  const nativeModulePath = '/Users/thun/Desktop/Research-Document/Project-Practicum/tesseract/lib/tesseract/build/Release/tesseract_native.node';
  
  if (existsSync(nativeModulePath)) {
    tesseractNative = eval('require')(nativeModulePath);
    console.log('Module loaded successfully:', !!tesseractNative);
  } else {
    throw new Error(`Native module not found at ${nativeModulePath}`);
  }
} catch (error: unknown) {
  console.error('Failed to load tesseract native module:', error);
  if (error instanceof Error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
  throw error;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image || !(image instanceof File)) {
      console.error('No image file received');
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    // Create temp file
    const tempDir = os.tmpdir();
    const fileName = `${Date.now()}_${image.name}`;
    const filePath = path.join(tempDir, fileName);

    try {
      // Save uploaded file
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.writeFile(filePath, buffer);
      console.log('Image saved to:', filePath);

      // Process with tesseract
      try {
        const result = tesseractNative.analyzeImageGrouped(filePath);
        console.log('OCR result:', result);

        return NextResponse.json({
          groupedText: result.groupedBySize.map((group: any) => ({
            fontSize: group.fontSize,
            words: group.words.map((word: any) => ({
              text: word.text,
              language: word.language
            }))
          }))
        });
      } catch (ocrError: unknown) {  // Type the error as unknown
        console.error('OCR processing error:', ocrError);
        return NextResponse.json(
          { error: `OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }

    } finally {
      // Cleanup temp file
      try {
        if (existsSync(filePath)) {
          await fs.unlink(filePath);
          console.log('Temporary file deleted');
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }

  } catch (error: unknown) {  // Type the error as unknown
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error processing image' },
      { status: 500 }
    );
  }
}