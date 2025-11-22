
import { API_URL } from './config.js';
import { cleanJSONString } from './utils.js';

export async function callGemini(prompt) {
    try {
        console.log("Sending Prompt to Gemini via Proxy:", prompt);
        
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
        console.log("Gemini Response Data:", data);

        // 1. Check for Explicit Error (API Error or GAS Error)
        if (data.error) {
            const msg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
            throw new Error(`Gemini API Error: ${msg}`);
        }

        // 2. Check for Safety Blocking (Common cause of 'no candidates')
        if (data.promptFeedback && data.promptFeedback.blockReason) {
            throw new Error(`Gemini Safety Block: ${data.promptFeedback.blockReason}`);
        }

        // 3. Check for Candidates (Standard Success Response)
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            
            if (candidate.finishReason && candidate.finishReason !== "STOP") {
                // finishReason might be SAFETY, RECITATION, etc.
                throw new Error(`Gemini Generation Stopped: ${candidate.finishReason}`);
            }
            
            const part = candidate.content?.parts?.[0];
            if (part && part.text) {
                // Check if GAS caught an exception and returned it as text
                if (part.text.trim().startsWith("오류:") || part.text.trim().startsWith("Error:")) {
                    throw new Error(part.text);
                }
                return parseResult(part.text);
            }
        }

        // 4. Fallback: Check if 'text' property exists directly (Simple Proxy Response)
        if (data.text) {
            return parseResult(data.text);
        }

        // 5. Fatal: Unknown Format
        console.error("Unknown response structure:", data);
        throw new Error(`Invalid response format: ${JSON.stringify(data)}`);

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
