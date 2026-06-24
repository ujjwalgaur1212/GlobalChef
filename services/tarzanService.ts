import type { ChatMessage } from "@/types/tarzan";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function getAiResponse(userMessage: string): Promise<string> {
  const env = process.env as Record<string, string | undefined>;
  const apiKey = env.EXPO_PUBLIC_GEMINI_API_KEY || env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in the environment variables.");
    return "Oops! It seems I can't connect to my virtual kitchen right now because the API key is missing. Please check the environment variables! 🍳🔑";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    console.log("Sending prompt to Gemini 2.5 Flash:", userMessage);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: userMessage,
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: `You are Tarzan, a real-time conversational voice chef assistant. Speak naturally, warmly, and concisely, like a helpful human chef in a kitchen.

CRITICAL GUIDELINES:
1. Keep responses extremely concise: maximum 2-4 sentences.
2. Avoid robotic, repetitive, or overly enthusiastic introductions and filler phrases, such as:
   - "Excellent!"
   - "Certainly!"
   - "I'd be happy to help!"
   - "Knowing that will help me give the best instructions."
   - "Absolutely!"
3. Speak directly and conversationally. For example, if the user says "Let's make tea", do not say "Excellent! Making tea is wonderfully simple..." instead say "Great. Do you want Indian chai, black tea, green tea, or herbal tea?".
4. Focus on practical, voice-friendly answers that are easy to listen to. Avoid long markdown lists or blocks of text.
5. If asked non-cooking questions, answer normally, intelligently, and concisely. Keep the voice-first assistant tone.`,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No text generated in response candidates.");
    }

    return generatedText;
  } catch (error) {
    console.error("Error in getAiResponse:", error);
    return "Oops! I encountered an issue in my virtual kitchen. Please try again. 🍳";
  }
}
