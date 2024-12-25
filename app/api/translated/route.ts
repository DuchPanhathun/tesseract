import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import request from 'request';
import { promisify } from 'util';

export const runtime = 'nodejs';

const cache = new Map();
const requestPromise = promisify(request);

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text?.trim()) {
      return NextResponse.json({ translatedText: '' });
    }

    // Check cache first
    const cacheKey = text.trim();
    if (cache.has(cacheKey)) {
      console.log(`[${requestId}] Returning cached translation`);
      return NextResponse.json({ translatedText: cache.get(cacheKey) });
    }

    console.log(`[${requestId}] Translating text:`, text);

    const options = {
      method: 'POST',
      url: 'https://translatekh.mptc.gov.kh/',
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
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0'
      },
      body: JSON.stringify({
        src_lang: "eng",
        tgt_lang: "kh",
        navigator: {
          platform: "MacIntel",
          userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0"
        },
        input_text: [text]
      })
    };

    console.log(`[${requestId}] Sending request with options:`, JSON.stringify(options, null, 2));

    const response = await requestPromise(options);
    
    console.log(`[${requestId}] Raw response:`, {
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body
    });

    if (response.statusCode !== 200) {
      throw new Error(`Translation API responded with status: ${response.statusCode}`);
    }

    let data;
    try {
      data = JSON.parse(response.body);
      console.log(`[${requestId}] Parsed response data:`, data);
    } catch (e) {
      console.error(`[${requestId}] Failed to parse response:`, response.body);
      throw new Error('Invalid JSON response from translation API');
    }

    if (!data) {
      throw new Error('Empty response from translation API');
    }

    // Check if data has the expected structure
    if (!data.translate_text) {
      console.error(`[${requestId}] Unexpected response structure:`, data);
      throw new Error('Response missing translate_text field');
    }

    const translatedText = Array.isArray(data.translate_text) 
      ? data.translate_text[0] 
      : data.translate_text;

    if (!translatedText) {
      throw new Error('Empty translation received');
    }

    // Cache the result
    cache.set(cacheKey, translatedText);
    
    return NextResponse.json({ translatedText });
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { 
        error: 'Translation failed', 
        details: error instanceof Error ? error.message : String(error),
        requestId
      },
      { status: 500 }
    );
  }
}