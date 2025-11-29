// Cloudflare Worker proxy URL (set after deployment)
const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL || 'http://localhost:8787';

// Helper function to call Gemini via Cloudflare Worker
async function callGeminiViaProxy(prompt: string, schema: any) {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Extract text from Gemini response structure
  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }
  
  return null;
}

export const parseNaturalLanguageTask = async (input: string): Promise<{ title: string; dueDate: string; priority: string } | null> => {
  try {
    const prompt = `Parse the following task request into a structured JSON object. 
      The current date and time is ${new Date().toISOString()}. 
      Calculate the exact ISO dueDate based on the user's relative time (e.g., "in 20 minutes", "tomorrow morning"). 
      If no time is specified, default to 1 hour from now.
      User Input: "${input}"`;

    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        dueDate: { type: "string", description: "ISO 8601 date string" },
        priority: { type: "string", enum: ["low", "medium", "high"] }
      },
      required: ["title", "dueDate", "priority"]
    };

    return await callGeminiViaProxy(prompt, schema);
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
};

export const getTimeZoneInfo = async (cityQuery: string): Promise<{ name: string; timeZone: string } | null> => {
  try {
    const prompt = `Identify the correct IANA time zone identifier and a standard display name (City, Country Code) for the location described as: "${cityQuery}".
      Return a JSON object with keys "name" and "timeZone".
      Example: { "name": "Paris, FR", "timeZone": "Europe/Paris" }
      If the location is invalid or cannot be determined, return null.`;

    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        timeZone: { type: "string" }
      },
      required: ["name", "timeZone"]
    };

    return await callGeminiViaProxy(prompt, schema);
  } catch (error) {
    console.error("Gemini TimeZone Error:", error);
    return null;
  }
};