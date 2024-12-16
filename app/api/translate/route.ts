import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const cache = new Map(); // In-memory cache for rate limiting and deduplication

export async function POST(request: NextRequest) {
  const requestId = uuidv4(); // Generate a unique ID for each request
  console.log(`[${requestId}] Incoming request`);

  try {
    const body = await request.json();
    console.log(`[${requestId}] Request body:`, body);

    // Generate a cache key based on the request body
    const cacheKey = JSON.stringify(body);

    // Check if a cached result exists for this input
    if (cache.has(cacheKey)) {
      console.log(`[${requestId}] Returning cached result`);
      return NextResponse.json(cache.get(cacheKey));
    }

    // Make the external API request
    const response = await fetch('https://translatekh.mptc.gov.kh/', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'origin': 'https://translatekh.mptc.gov.kh',
        'priority': 'u=1, i',
        'referer': 'https://translatekh.mptc.gov.kh/',
        'sec-ch-ua': '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0',
      },
      body: JSON.stringify({
        src_lang: body.src_lang,
        tgt_lang: body.tgt_lang,
        navigator: {
          platform: "MacIntel",
          userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0",
        },
        input_text: body.input_text,
      }),
    });

    const responseText = await response.text();
    console.log(`[${requestId}] Raw API response:`, responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[${requestId}] Parsed response:`, data);
    } catch (e) {
      throw new Error(`[${requestId}] Failed to parse response: ${responseText}`);
    }

    // Map translate_text to tgt_text for compatibility
    const mappedData = {
      ...data,
      tgt_text: data.translate_text,
    };

    // Cache the result
    cache.set(cacheKey, mappedData);
    console.log(`[${requestId}] Result cached`);

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error(`[${requestId}] Translation Error:`, error);
    return NextResponse.json(
      { 
        error: 'Translation failed', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
