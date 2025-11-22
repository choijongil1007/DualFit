
import { GoogleGenAI } from "@google/genai";
import { cleanJSONString } from './utils.js';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function callGemini(prompt) {
    try {
        console.log("Sending Prompt to Gemini:", prompt);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const text = response.text;
        console.log("Gemini Response Text:", text);

        if (!text) {
            throw new Error("Empty response from Gemini");
        }

        return parseResult(text);

    } catch (error) {
        console.error("Gemini API Call Failed:", error);
        throw error;
    }
}

function parseResult(rawText) {
    const cleanedText = cleanJSONString(rawText);
    try {
        return JSON.parse(cleanedText);
    } catch (e) {
        console.warn("JSON Parse failed, returning raw text.", e);
        return rawText; 
    }
}
