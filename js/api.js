import { API_URL } from './config.js';
import { cleanJSONString } from './utils.js';

export async function callGemini(prompt) {
    try {
        console.log("Sending Prompt to Gemini:", prompt);
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // The proxy returns structure like { text: "..." }
        if (!data.text) {
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