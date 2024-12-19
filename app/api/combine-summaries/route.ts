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

    const pythonScript = process.env.PYTHON_SCRIPT_PATH || '/Users/thun/Desktop/Research-Document/llm_summary/chat.py';
    const summariesJson = JSON.stringify(summaries).replace(/"/g, '\\"');
    const command = `python3 "${pythonScript}" --combine "${summariesJson}"`;
    
    console.log(`[${requestId}] Executing command:`, command);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`[${requestId}] Python stderr:`, stderr);
    }

    // Cache the result
    cache.set(cacheKey, stdout);
    
    return NextResponse.json({ summary: stdout });
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'Combined summary failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 