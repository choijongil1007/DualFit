
import { API_URL } from './config.js';
import { cleanJSONString } from './utils.js';

export async function callGemini(prompt) {
    try {
        console.log("Sending Prompt to Gemini:", prompt);
        
        // GAS Web App은 CORS OPTIONS 요청을 지원하지 않으므로
        // Content-Type을 text/plain으로 설정하여 Preflight를 우회합니다.
        // GAS 코드의 doPost(e)에서 JSON.parse(e.postData.contents)를 수행하므로 동작합니다.
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

        // 1. Check for Error Object (Gemini API Native Error OR GAS Catch Block Error)
        // GAS catch block returns { error: "string", candidates: ... }
        // Gemini API returns { error: { code: ..., message: ... } }
        if (data.error) {
            const msg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
            // If GAS returned a candidate with the error, we might want to throw that text instead if it's cleaner,
            // but usually data.error is sufficient.
            throw new Error(`Gemini API Error: ${msg}`);
        }

        // 2. Check for Candidates (Standard Gemini Response)
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            
            // Check for Safety Blocking or other stop reasons
            if (candidate.finishReason && candidate.finishReason !== "STOP") {
                throw new Error(`Gemini Generation Stopped: ${candidate.finishReason}`);
            }
            
            const part = candidate.content?.parts?.[0];
            if (part && part.text) {
                // 3. Check for GAS-specific error text convention
                // The provided GAS script puts "오류: " prefix in the text part when it catches an exception.
                if (part.text.startsWith("오류:") || part.text.startsWith("Error:")) {
                    throw new Error(part.text);
                }

                return parseResult(part.text);
            }
        }

        // 4. Fallback for unexpected structures
        if (data.text) {
            return parseResult(data.text);
        }

        console.error("Unknown structure:", data);
        throw new Error("Invalid response format: API returned data but no 'candidates' or 'text' found.");

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
        // If parsing fails, it might be a plain text response (e.g., Analysis text).
        // Return the raw text so the UI can display it instead of crashing.
        console.warn("JSON Parse failed, returning raw text.", e);
        return rawText; 
    }
}
