import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const cache = new Map();

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const body = await request.json();
    const { summaries } = body;
    
    if (!Array.isArray(summaries) || summaries.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid summaries array'
      }, { status: 400 });
    }

    // Create cache key from summaries
    const cacheKey = JSON.stringify(summaries);
    if (cache.has(cacheKey)) {
      return NextResponse.json({ summary: cache.get(cacheKey) });
    }

    const pythonScript = process.env.PYTHON_SCRIPT_PATH || '/Users/thun/Desktop/Research-Document/Project-Practicum/llm_summary/chat.py';
    
    // Write summaries to a temporary file instead of passing as command argument
    const fs = require('fs');
    const tempFile = `/tmp/summaries-${requestId}.json`;
    
    try {
      fs.writeFileSync(tempFile, JSON.stringify(summaries));
      const command = `python3 "${pythonScript}" --combine "${tempFile}"`;
      
      console.log(`[${requestId}] Executing command:`, command);
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr) {
        console.error(`[${requestId}] Python stderr:`, stderr);
      }

      // Clean up temp file
      fs.unlinkSync(tempFile);

      // Cache the result
      cache.set(cacheKey, stdout);
      
      return NextResponse.json({ summary: stdout });
    } finally {
      // Ensure temp file is cleaned up even if there's an error
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        console.error(`[${requestId}] Error cleaning up temp file:`, e);
      }
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'Combined summary failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 