import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseNaturalLanguageTask = async (input: string): Promise<{ title: string; dueDate: string; priority: string } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse the following task request into a structured JSON object. 
      The current date and time is ${new Date().toISOString()}. 
      Calculate the exact ISO dueDate based on the user's relative time (e.g., "in 20 minutes", "tomorrow morning"). 
      If no time is specified, default to 1 hour from now.
      User Input: "${input}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            dueDate: { type: Type.STRING, description: "ISO 8601 date string" },
            priority: { type: Type.STRING, enum: ["low", "medium", "high"] }
          },
          required: ["title", "dueDate", "priority"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
};