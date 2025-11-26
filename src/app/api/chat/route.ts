import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Conversation from '../../../lib/models/Conversation';

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ Parse request
    const { message, systemPrompt, userId } = await request.json();

    if (!message) return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    if (!userId) return NextResponse.json({ error: 'No userId provided' }, { status: 400 });

    // 2️⃣ Connect to DB
    await dbConnect();

    // 3️⃣ Find or create conversation
    let conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      conversation = new Conversation({ userId, messages: [] });
      console.log('Created new conversation for userId:', userId);
    } else {
      console.log('Found conversation with', conversation.messages.length, 'messages');
    }

    // 4️⃣ Build full messages
    const fullMessages = [...conversation.messages];

    // Default system prompt if none provided
    const defaultSystemPrompt = `मैं चाहता हूं कि तुम मुझे एक साउथ दिल्ली गर्ल की तरह मेरी गर्लफ्रेंड बन कर बात करो Respond in 10 or less words.`;

    if (systemPrompt) {
      fullMessages.unshift({ role: 'user', content: systemPrompt, timestamp: new Date() });
    } else if (fullMessages.length === 0) {
      fullMessages.push({ role: 'user', content: defaultSystemPrompt, timestamp: new Date() });
    }

    // Add current user message
    fullMessages.push({ role: 'user', content: message, timestamp: new Date() });

    // 5️⃣ Call AI
    const aiResponse = await callGroqAI(fullMessages);

    // 6️⃣ Save messages
    conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });
    conversation.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
    // await conversation.save();

    // 7️⃣ Return AI response
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}

// /** Helper: Call Groq AI */
// async function callGroqAI(messages: { role: string; content: string }[]) {
//   const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       model: 'google/gemma-3n-e4b-it:free',
//       messages: messages.map(m => ({ role: m.role, content: m.content })),
//       stream: false,
//       max_tokens: 50, // slightly bigger for better context replies
//       temperature: 0.7,
//     }),
//   });
/** Helper: Call Local Ollama (Gemma 3:4b) */
// async function callGroqAI(messages: { role: string; content: string }[]) {
//   const response = await fetch('http://127.0.0.1:11434/api/chat', {
//     method: 'POST',
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "gemma3:4b",
//       messages: messages.map(m => ({
//         role: m.role,
//         content: m.content,
//       })),
//       stream: false,
//       options: {
//         temperature: 0.7,
//         num_predict: 50, // equivalent to max_tokens
//       }
//     }),
//   });
//   // const data = await response.json();
//   // return data.message?.content ?? ""; 

//   if (!response.ok) throw new Error(`Groq AI API error: ${response.statusText}`);

//   const data = await response.json();
//   return data.message?.content ?? "";
//   // return data.choices?.[0]?.message?.content || 'Sorry, no response from AI.';
// }
/** Helper: Call Local Ollama Super Fast */
async function callGroqAI(messages: { role: string; content: string }[]) {
  // Combine messages into a single prompt (faster for generate endpoint)
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n");

  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive"
    },
    body: JSON.stringify({
      model: "gemma3:4b",
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 80
      }
    }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);

  const data = await response.json();
  return data.response || "";
}
