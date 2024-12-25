import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[OCR] Incoming request at ${timestamp}`);

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      console.error('[OCR] No image uploaded');
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    // Temporary file setup
    const tempDir = os.tmpdir();
    const fileName = `${Date.now()}_${image.name}`;
    const filePath = path.join(tempDir, fileName);

    try {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.writeFile(filePath, buffer);
      console.log(`[OCR] Image saved to ${filePath}`);

      // Run Tesseract OCR
      const { stdout, stderr } = await execAsync(`tesseract "${filePath}" stdout -l eng+khm --psm 1`);

      if (stderr) {
        console.error(`[OCR] Tesseract Error: ${stderr}`);
      }

      console.log(`[OCR] OCR Output: ${stdout.trim()}`);

      return NextResponse.json({ text: stdout.trim() });
    } finally {
      // Ensure cleanup
      try {
        await fs.unlink(filePath);
        console.log(`[OCR] Temporary file ${filePath} deleted successfully.`);
      } catch (cleanupError) {
        console.error(`[OCR] Cleanup failed for ${filePath}:`, cleanupError);
      }
    }
  } catch (error) {
    console.error(`[OCR] Error processing image:`, error);
    return NextResponse.json({ error: 'Error processing image' }, { status: 500 });
  }
}
