import * as FileSystem from "expo-file-system/legacy";

export async function scanIngredients(imageUri: string): Promise<string[]> {
  const env = process.env as Record<string, string | undefined>;
  const apiKey = env.EXPO_PUBLIC_GEMINI_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Read the image as base64
  const base64Data = await FileSystem.readAsStringAsync(imageUri, {
    encoding: "base64",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `You are a food ingredient detector.

Analyze this image and return ONLY a JSON array of ingredients.

Example:
[
  "egg",
  "onion",
  "tomato"
]

Return ingredients only.
No explanations.`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Vision API error: ${response.status} - ${errorText}`);
  }

  interface GeminiResponse {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  }

  console.log("Response OK:", response.ok);
  console.log("Response Status:", response.status);

  const responseText = await response.text();

  console.log("RAW GEMINI RESPONSE:");
  console.log(responseText);

  const data = JSON.parse(responseText) as GeminiResponse;
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error("No text generated in response candidates.");
  }

  let cleanText = generatedText.trim();
  // Remove markdown formatting
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  cleanText = cleanText.trim();

  try {
    const parsed = JSON.parse(cleanText);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => String(item));
    }
    return [];
  } catch (parseError) {
    console.error("Failed to parse Gemini Vision response:", generatedText, parseError);
    throw new Error("Failed to parse detected ingredients JSON.");
  }
}
