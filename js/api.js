
import { API_URL } from './config.js';
import { cleanJSONString } from './utils.js';

export async function callGemini(prompt) {
    try {
        console.log("Sending Prompt to Gemini:", prompt);
        
        // Using 'text/plain' to avoid CORS preflight (OPTIONS) request which GAS Web Apps don't support.
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Proxy Response Data:", data); // Debugging

        // 1. Standard Proxy Format: { text: "..." }
        if (data.text) {
            return parseResult(data.text);
        }

        // 2. Raw Gemini API Format (fallback): { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
            const text = data.candidates[0].content.parts[0].text;
            return parseResult(text);
        }

        // 3. Error Handling
        if (data.error) {
             const msg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
             throw new Error("Gemini API Error: " + msg);
        }

        throw new Error("Invalid response format: " + JSON.stringify(data));

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

function parseResult(rawText) {
    const cleanedText = cleanJSONString(rawText);
    try {
        return JSON.parse(cleanedText);
    } catch (e) {
        // If parsing fails, return the raw text. 
        // This is useful if the model returns plain text instead of JSON.
        console.warn("Failed to parse JSON from AI response, returning text:", e);
        return cleanedText;
    }
}
