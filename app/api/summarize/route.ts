import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// Cache for storing results and preventing duplicate processing
const cache = new Map();
const processingRequests = new Set();

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    // Get the raw request text
    const rawText = await request.text();
    
    // Try to parse the JSON
    let body;
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return NextResponse.json({ 
        error: 'Invalid JSON in request'
      }, { status: 400 });
    }

    const { text } = body;
    
    // Skip empty text
    if (!text?.trim()) {
      return NextResponse.json({ summary: '' });
    }

    // Generate cache key from the text
    const cacheKey = text.trim();

    // Check cache first
    if (cache.has(cacheKey)) {
      console.log(`[${requestId}] Returning cached summary`);
      return NextResponse.json(cache.get(cacheKey));
    }

    // Check if this text is already being processed
    if (processingRequests.has(cacheKey)) {
      console.log(`[${requestId}] Request already in progress, waiting...`);
      // Wait for a short time and check cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      if (cache.has(cacheKey)) {
        return NextResponse.json(cache.get(cacheKey));
      }
    }

    // Mark this request as being processed
    processingRequests.add(cacheKey);

    try {
      // Your existing summarization logic here
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      console.log('Received text for summarization:', text);

      const pythonScript = process.env.PYTHON_SCRIPT_PATH || '/Users/thun/Desktop/Research-Document/llm_summary/chat.py';
      const command = `python3 "${pythonScript}" "${text.replace(/"/g, '\\"')}"`;
      
      console.log('Executing command:', command);
      
      const { stdout, stderr } = await execPromise(command);
      
      console.log('Python stdout:', stdout);
      console.log('Python stderr:', stderr);
      
      const result = { summary: stdout };
      
      // Cache the result
      cache.set(cacheKey, result);
      
      return NextResponse.json(result);
    } finally {
      // Remove from processing set when done
      processingRequests.delete(cacheKey);
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'Summarization failed', details: error.message },
      { status: 500 }
    );
  }
}
