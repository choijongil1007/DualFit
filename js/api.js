import { API_URL } from './config.js';
import { cleanJSONString } from './utils.js';

export async function callGemini(prompt) {
    try {
        console.log("Sending Prompt to Gemini:", prompt);
        
        // Google Apps Script Web Apps do not support OPTIONS (preflight) requests.
        // Using 'application/json' triggers a preflight check which fails with CORS errors.
        // We must use 'text/plain' or 'application/x-www-form-urlencoded' to skip the preflight.
        // The script backend will still receive the body string which contains our JSON.
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
        
        // The proxy returns structure like { text: "..." }
        if (!data.text) {
             if (data.error) throw new Error(data.error);
            throw new Error("Invalid response format from proxy");
        }

        // Try to parse the text as JSON if possible, or return raw text
        const cleanedText = cleanJSONString(data.text);
        try {
            return JSON.parse(cleanedText);
        } catch (e) {
            // If it's not JSON, return the text string (sometimes useful for raw summaries)
            return cleanedText;
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}