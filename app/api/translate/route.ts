import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const cache = new Map();
const lastRequestTime = new Map();
const DELAY_BETWEEN_REQUESTS = 30000; // 30 seconds in milliseconds
const MAX_RETRIES = 3;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeTranslationRequest(body: any, retryCount = 0): Promise<Response> {
  try {
    console.log(`Making translation request attempt ${retryCount + 1}`, {
      src_lang: body.src_lang,
      tgt_lang: body.tgt_lang,
      text_length: body.input_text?.[0]?.length
    });

    const response = await fetch('https://translatekh.mptc.gov.kh/', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'cookie': '_ga_D6SBLZ6DWW=GS1.1.1736496100.1.0.1736496100.0.0.0; _ga=GA1.1.679404825.1736496101',
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
        src_lang: body.src_lang || "kh",
        tgt_lang: body.tgt_lang || "eng",
        navigator: {
          platform: "MacIntel",
          userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0"
        },
        input_text: body.input_text || [""]
      })
    });

    if (!response.ok) {
      console.error(`Request failed with status ${response.status}`);
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Attempt ${retryCount + 1} failed, waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds before retry...`);
        await delay(DELAY_BETWEEN_REQUESTS);
        return makeTranslationRequest(body, retryCount + 1);
      }
      throw new Error(`Translation API error (${response.status}): ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error(`Translation attempt ${retryCount + 1} error:`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Attempt ${retryCount + 1} failed, waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds before retry...`);
      await delay(DELAY_BETWEEN_REQUESTS);
      return makeTranslationRequest(body, retryCount + 1);
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  console.log(`[${requestId}] Incoming request`);

  try {
    const rawText = await request.text();
    const body = rawText ? JSON.parse(rawText) : {};

    // Add a small initial delay to avoid overwhelming the server
    await delay(1000);

    if (!body?.input_text?.[0]?.trim()) {
      console.log(`[${requestId}] Empty input text, skipping translation`);
      return NextResponse.json({ tgt_text: [''] });
    }

    const cacheKey = JSON.stringify(body);
    if (cache.has(cacheKey)) {
      console.log(`[${requestId}] Returning cached result`);
      return NextResponse.json(cache.get(cacheKey));
    }

    // Check if we need to wait before making a new request
    const now = Date.now();
    const lastRequest = lastRequestTime.get('translate') || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < DELAY_BETWEEN_REQUESTS) {
      const waitTime = DELAY_BETWEEN_REQUESTS - timeSinceLastRequest;
      console.log(`[${requestId}] Rate limiting: waiting ${waitTime}ms`);
      await delay(waitTime);
    }

    // Update last request time
    lastRequestTime.set('translate', Date.now());

    const response = await makeTranslationRequest(body);
    const responseText = await response.text();
    let data = JSON.parse(responseText);

    const mappedData = {
      ...data,
      tgt_text: data.translate_text,
      waitTime: timeSinceLastRequest < DELAY_BETWEEN_REQUESTS ? DELAY_BETWEEN_REQUESTS - timeSinceLastRequest : 0
    };

    cache.set(cacheKey, mappedData);
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