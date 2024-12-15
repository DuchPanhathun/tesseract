import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);

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
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0'
      },
      body: JSON.stringify({
        src_lang: body.src_lang,
        tgt_lang: body.tgt_lang,
        navigator: {
          platform: "MacIntel",
          userAgent: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0"
        },
        input_text: body.input_text
      })
    });

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response:', data);
    } catch (e) {
      throw new Error(`Failed to parse response: ${responseText}`);
    }

    // Map translate_text to tgt_text for compatibility
    const mappedData = {
      ...data,
      tgt_text: data.translate_text
    };

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('Translation Error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
} 