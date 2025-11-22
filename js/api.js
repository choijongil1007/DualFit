
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

        // Use text/plain to avoid CORS preflight issues with Google Apps Script
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

        // --- Strategy 1: Standard Proxy Response { text: "JSON_STRING" } ---
        if (data && data.text) {
            return parseResult(data.text);
        }

        // --- Strategy 2: Common Wrapper Keys (result, output, content, response) ---
        // Some proxies wrap the string in these keys
        const wrapperKey = ['result', 'output', 'content', 'response', 'answer'].find(key => data[key]);
        if (wrapperKey) {
            const content = data[wrapperKey];
            if (typeof content === 'string') {
                return parseResult(content);
            } else if (typeof content === 'object') {
                return content; // It's already an object
            }
        }

        // --- Strategy 3: Direct Object Return ---
        // Check if the data itself is the result (contains expected keys)
        // Common keys in our app: jtbd, items, health, actions, recommendedScore
        if (data && (data.jtbd || data.items || data.health || data.recommendedScore || data.actions || data.sc || data.todo)) {
            console.log("Received direct JSON object from proxy.");
            return data;
        }

        // --- Strategy 4: Raw Gemini API Response { candidates: [...] } ---
        if (data && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
             const text = data.candidates[0].content.parts[0].text;
             return parseResult(text);
        }
        
        // --- Strategy 5: Error Object from Proxy ---
        if (data && data.error) {
             const msg = data.error.message || JSON.stringify(data.error);
             throw new Error(`Proxy returned error: ${msg}`);
        }

        // If we reach here, the structure is unknown.
        console.error("Unknown Proxy Response Structure. Keys:", Object.keys(data));
        console.error("Full Data:", JSON.stringify(data, null, 2));
        throw new Error(`Invalid response structure from proxy. Keys found: ${Object.keys(data).join(', ')}`);

    } catch (error) {
        console.error("Gemini API Call Failed:", error);
        throw error;
    }
}

function parseResult(rawText) {
    if (typeof rawText !== 'string') return rawText;
    
    const cleanedText = cleanJSONString(rawText);
    try {
        return JSON.parse(cleanedText);
    } catch (e) {
        console.warn("JSON Parse failed in frontend. Returning raw text.", e);
        // If it fails to parse but looks like it might be the answer, return it anyway or handle graceful failure
        return rawText; 
    }
}
