import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';

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

async function saveToDocx(results: any, outputPath: string) {
  // Group words by line number
  const lineGroups = results.words.reduce((acc: any, word: any) => {
    if (!acc[word.lineNumber]) {
      acc[word.lineNumber] = [];
    }
    acc[word.lineNumber].push(word);
    return acc;
  }, {});

  // Sort lines and words within lines by position
  const sortedLines = Object.entries(lineGroups)
    .sort(([lineA], [lineB]) => parseInt(lineA) - parseInt(lineB))
    .map(([_, words]) => {
      const lineWords = words as any[];
      // Sort words by x position within each line
      lineWords.sort((a, b) => a.x - b.x);
      
      // Determine line alignment based on position
      const firstWord = lineWords[0];
      const lastWord = lineWords[lineWords.length - 1];
      const lineStart = firstWord.x;
      const lineEnd = lastWord.x + lastWord.width;
      const pageCenter = firstWord.pageWidth / 2;
      const lineCenter = lineStart + (lineEnd - lineStart) / 2;

      let alignment: keyof typeof AlignmentType = 'LEFT';
      
      // Calculate alignment based on position
      if (Math.abs(lineCenter - pageCenter) < 50) {
        alignment = 'CENTER';
      } else if (lineStart > pageCenter) {
        alignment = 'RIGHT';
      }

      // Calculate indentation
      const indentationInches = (lineStart / firstWord.pageWidth) * 6; // Assuming 6 inches page width

      return { 
        words: lineWords, 
        alignment: AlignmentType[alignment],
        indentation: indentationInches
      };
    });

  const doc = new Document({
    sections: [{
      properties: {},
      children: sortedLines.map(line => {
        return new Paragraph({
          children: line.words.map((word: any) => 
            new TextRun({
              text: word.text + ' ',
              size: word.fontSize * 2, // Convert to half-points (1pt = 2 half-points)
              bold: word.bold,
              italics: word.italic,
              underline: word.underlined ? {} : undefined,
              font: word.fontName !== "Unknown" ? word.fontName : 
                    word.language === "khm" ? "Khmer OS Battambang" : "Arial"
            })
          ),
          alignment: line.alignment,
          spacing: {
            before: 200, // Add space before paragraph
            after: 200,  // Add space after paragraph
            line: 360,   // Line spacing (360 = 1.5 lines)
          },
          indent: {
            left: Math.max(0, line.indentation * 720) // Convert inches to twips (1 inch = 720 twips)
          }
        });
      })
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
  return outputPath;
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
        console.log('OCR result structure:', JSON.stringify(result, null, 2)); // Debug log

        // Generate unique filename for the DOCX
        const docxFileName = `ocr_result_${Date.now()}.docx`;
        const docxPath = path.join(os.tmpdir(), docxFileName);

        // Save to DOCX
        await saveToDocx(result, docxPath);

        // Read the generated DOCX file
        const docxBuffer = await fs.readFile(docxPath);

        // Clean up the DOCX file
        await fs.unlink(docxPath);

        return NextResponse.json({
          words: result.words.map((word: any) => ({
            text: word.text,
            language: word.language,
            fontName: word.fontName,
            fontFamily: word.fontFamily,
            fontSize: word.fontSize,
            bold: word.bold,
            italic: word.italic,
            underlined: word.underlined,
            monospace: word.monospace,
            serif: word.serif,
            smallcaps: word.smallcaps,
            isSymbol: word.isSymbol,
            confidence: word.confidence,
            lineNumber: word.lineNumber,
            wordPosition: word.wordPosition,
            x: word.x,
            y: word.y,
            width: word.width,
            height: word.height,
            pageWidth: word.pageWidth
          })),
          docxFile: Buffer.from(docxBuffer).toString('base64')
        });

      } catch (ocrError: unknown) {
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

  } catch (error: unknown) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error processing image' },
      { status: 500 }
    );
  }
}