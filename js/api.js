
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

        // --- Strategy 0: Handle Google Apps Script Error Object ---
        if (data.status === 'error' || data.error) {
             const msg = data.message || (typeof data.error === 'string' ? data.error : data.error.message) || JSON.stringify(data.error);
             throw new Error(`Proxy returned error: ${msg}`);
        }

        // --- Strategy 1: Standard Proxy Response { text: "JSON_STRING" } ---
        if (data && typeof data.text === 'string') {
            return parseResult(data.text);
        }

        // --- Strategy 2: Common Wrapper Keys ---
        // Expanded list of keys that proxies might use to wrap the content
        const wrapperKey = ['result', 'output', 'content', 'response', 'answer', 'data', 'payload', 'message'].find(key => data[key]);
        if (wrapperKey) {
            const content = data[wrapperKey];
            if (typeof content === 'string') {
                return parseResult(content);
            } else if (typeof content === 'object' && content !== null) {
                return content; // It's already an object
            }
        }

        // --- Strategy 3: Direct Object Return (Heuristic) ---
        // Check if the data itself contains domain-specific keys we expect
        if (data && (data.jtbd || data.items || data.health || data.recommendedScore || data.actions || data.sc || data.todo || data.reason)) {
            console.log("Received direct JSON object from proxy.");
            return data;
        }

        // --- Strategy 4: Raw Gemini API Response { candidates: [...] } ---
        if (data && data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
             const candidate = data.candidates[0];
             if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
                 return parseResult(candidate.content.parts[0].text);
             }
        }
        
        // --- Strategy 5: Fallback - Scan for any JSON-like string ---
        // If the structure is unknown, check if any string value looks like JSON
        for (const key in data) {
            if (typeof data[key] === 'string') {
                const val = data[key].trim();
                // Check if it starts/ends like an Object or Array
                if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
                    console.log(`Found potential JSON in key '${key}', attempting parse.`);
                    try {
                        const parsed = JSON.parse(cleanJSONString(val));
                        return parsed;
                    } catch (e) {
                        // ignore and continue searching
                    }
                }
            }
        }

        // If we reach here, the structure is unknown.
        // Stringify data to show exactly what we got in the error message
        const errorMsg = `Invalid response structure from proxy. Keys: [${Object.keys(data).join(', ')}]. Data: ${JSON.stringify(data)}`;
        console.error(errorMsg);
        throw new Error(errorMsg);

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
