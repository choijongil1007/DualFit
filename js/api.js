
import { cleanJSONString } from './utils.js';
import { API_URL } from './config.js';

/**
 * Call Gemini via Google Apps Script Proxy
 * Ensures no direct API Key usage in frontend
 */
export async function callGemini(promptText) {
    try {
        console.log("Sending Prompt to Proxy:", promptText);
        
        // Construct the payload
        const payload = {
            prompt: promptText
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            // mode: 'no-cors', // DO NOT use no-cors if you want to read the response
            headers: {
                "Content-Type": "text/plain;charset=utf-8", // GAS sometimes prefers this or text/plain
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Proxy Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // The Apps Script should return { text: "..." }
        if (!data || !data.text) {
            console.error("Invalid Proxy Response:", data);
            throw new Error("Invalid response structure from proxy");
        }

        console.log("Gemini Response Text:", data.text);
        return parseResult(data.text);

    } catch (error) {
        console.error("Gemini API Call Failed:", error);
        // Fallback or re-throw
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