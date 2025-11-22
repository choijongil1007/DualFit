
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
            const errText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        console.log("Proxy Response Data:", data); // Debugging

        // 1. Standard Proxy Format: { text: "..." }
        if (data.text) {
            return parseResult(data.text);
        }

        // 2. Raw Gemini API Format: { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            // Check for safety blocking
            if (candidate.finishReason && candidate.finishReason !== "STOP") {
                throw new Error(`Gemini Generation Stopped: ${candidate.finishReason}`);
            }
            
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                const text = candidate.content.parts[0].text;
                return parseResult(text);
            }
        }

        // 3. Explicit Error from Proxy
        if (data.error) {
             const msg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
             throw new Error("Gemini API Error: " + msg);
        }

        // 4. Fallback: The data IS the payload (e.g. proxy returned the object directly)
        // If it's a non-empty object, return it as-is.
        if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
            console.log("Returning data object directly as payload.");
            return data;
        }

        throw new Error("Unknown response format: " + JSON.stringify(data));

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
        console.warn("Failed to parse JSON from AI response, returning text. Raw:", rawText);
        return rawText; // Return raw string so UI can at least display it
    }
}
