
import { cleanJSONString } from './utils.js';
import { API_URL } from './config.js';

/**
 * Call Gemini via Google Apps Script Proxy
 * Ensures no direct API Key usage in frontend
 */
export async function callGemini(promptText) {
    try {
        console.log("Sending Prompt to Proxy:", promptText);
        
        const payload = {
            prompt: promptText
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Proxy Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Proxy Raw Response:", data);

        // Strategy 1: Standard Proxy Response { text: "JSON_STRING" }
        if (data && data.text) {
            return parseResult(data.text);
        }

        // Strategy 2: Direct Object Return (Proxy might have parsed it already)
        // Check for key properties expected in our application's responses
        if (data && (data.jtbd || data.items || data.health || data.recommendedScore || data.actions)) {
            console.log("Received direct JSON object from proxy.");
            return data;
        }

        // Strategy 3: Raw Gemini API Response { candidates: [...] }
        if (data && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
             const text = data.candidates[0].content.parts[0].text;
             return parseResult(text);
        }
        
        // Strategy 4: Error Object from Proxy
        if (data && data.error) {
             const msg = data.error.message || JSON.stringify(data.error);
             throw new Error(`Proxy returned error: ${msg}`);
        }

        console.error("Unknown Proxy Response Structure:", data);
        throw new Error("Invalid response structure from proxy. Check console for details.");

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
