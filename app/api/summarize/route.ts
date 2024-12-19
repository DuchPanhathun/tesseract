import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const cache = new Map();
const processingRequests = new Set();
const DELAY_BETWEEN_REQUESTS = 30000; // 30 seconds delay
const lastRequestTime = new Map();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const rawText = await request.text();
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
    
    if (!text?.trim()) {
      return NextResponse.json({ summary: '' });
    }

    const cacheKey = text.trim();

    // Check cache first
    if (cache.has(cacheKey)) {
      console.log(`[${requestId}] Returning cached summary`);
      return NextResponse.json({ summary: cache.get(cacheKey) });
    }

    // Check if we need to wait before processing
    const now = Date.now();
    const lastRequest = lastRequestTime.get('summarize') || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < DELAY_BETWEEN_REQUESTS) {
      const waitTime = DELAY_BETWEEN_REQUESTS - timeSinceLastRequest;
      console.log(`[${requestId}] Queue delay: waiting ${Math.ceil(waitTime/1000)}s`);
      await delay(waitTime);
    }

    // Mark this request as being processed
    lastRequestTime.set('summarize', Date.now());

    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      console.log(`[${requestId}] Processing summary request`);

      const pythonScript = process.env.PYTHON_SCRIPT_PATH || '/Users/thun/Desktop/Research-Document/llm_summary/chat.py';
      // Properly escape the text for shell command
      const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
      const command = `python3 "${pythonScript}" "${escapedText}"`;
      
      console.log(`[${requestId}] Executing command:`, command);
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr) {
        console.error(`[${requestId}] Python stderr:`, stderr);
      }
      
      console.log(`[${requestId}] Python stdout:`, stdout);

      const result = { 
        summary: stdout.trim(),
        waitTime: timeSinceLastRequest < DELAY_BETWEEN_REQUESTS ? DELAY_BETWEEN_REQUESTS - timeSinceLastRequest : 0
      };
      
      // Cache the result
      cache.set(cacheKey, result.summary);
      
      return NextResponse.json(result);
    } catch (error) {
      console.error(`[${requestId}] Execution error:`, error);
      throw error;
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'Summarization failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
