import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    // Define the prompt and other parameters
    const prompt = process.env.TTS_PROMPT || "Identity: Girlfriend\n\nAffect: funny and jolly\n\nTone: Festive and welcoming, creating a joyful, holiday atmosphere for the caller.\n\nEmotion: Joyful and playful, filled with holiday spirit, ensuring the caller feels excited and appreciated.\n\nPronunciation: Clear, articulate, and exaggerated in key festive phrases to maintain clarity and fun.\n\nPause: Brief pauses after each option and statement to allow for processing and to add a natural flow to the message.";
    const voice = "nova";
    const generation = "b7e9eb3f-d888-438a-8353-0e8d137aa869";

    // Build query string
    const params = new URLSearchParams({
      input: text,
      prompt,
      voice,
      generation,
    });

    const url = `https://www.openai.fm/api/generate?${params.toString()}`;

    // Call the TTS API directly with GET
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('TTS API error');
    }

    // Stream the response directly
    const { body, headers: respHeaders } = response;
    const contentType = respHeaders.get('content-type') || 'audio/mpeg';

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}