export const getTSCode = `import fs from "fs";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: "https://api.inference.net/v1",
    apiKey: process.env.INFERENCE_API_KEY,
});

// Define the response schema using Zod
const ClipTaggerResponseSchema = z.object({
    description: z.string(),
    objects: z.array(z.string()).max(10),
    actions: z.array(z.string()).max(5),
    environment: z.string(),
    content_type: z.string(),
    specific_style: z.string(),
    production_quality: z.string(),
    summary: z.string(),
    logos: z.array(z.string())
});

// Type inference from the schema
type ClipTaggerResponse = z.infer<typeof ClipTaggerResponseSchema>;

// System and user prompts (use exactly as shown for best results)
const SYSTEM_PROMPT = "You are an image annotation API trained to analyze YouTube video keyframes. You will be given instructions on the output format, what to caption, and how to perform your job. Follow those instructions. For descriptions and summaries, provide them directly and do not lead them with 'This image shows' or 'This keyframe displays...', just get right into the details.";

const USER_PROMPT = \`You are an image annotation API trained to analyze YouTube video keyframes. You must respond with a valid JSON object matching the exact structure below.

Your job is to extract detailed **factual elements directly visible** in the image. Do not speculate or interpret artistic intent, camera focus, or composition. Do not include phrases like "this appears to be", "this looks like", or anything about the image itself. Describe what **is physically present in the frame**, and nothing more.

Return JSON in this structure:

{
    "description": "A detailed, factual account of what is visibly happening (4 sentences max). Only mention concrete elements or actions that are clearly shown. Do not include anything about how the image is styled, shot, or composed. Do not lead the description with something like 'This image shows' or 'this keyframe is...', just get right into the details.",
    "objects": ["object1 with relevant visual details", "object2 with relevant visual details", ...],
    "actions": ["action1 with participants and context", "action2 with participants and context", ...],
    "environment": "Detailed factual description of the setting and atmosphere based on visible cues (e.g., interior of a classroom with fluorescent lighting, or outdoor forest path with snow-covered trees).",
    "content_type": "The type of content it is, e.g. 'real-world footage', 'video game', 'animation', 'cartoon', 'CGI', 'VTuber', etc.",
    "specific_style": "Specific genre, aesthetic, or platform style (e.e., anime, 3D animation, mobile gameplay, vlog, tutorial, news broadcast, etc.)",
    "production_quality": "Visible production level: e.g., 'professional studio', 'amateur handheld', 'webcam recording', 'TV broadcast', etc.",
    "summary": "One clear, comprehensive sentence summarizing the visual content of the frame. Like the description, get right to the point.",
    "logos": ["logo1 with visual description", "logo2 with visual description", ...]
}

Rules:
- Be specific and literal. Focus on what is explicitly visible.
- Do NOT include interpretations of emotion, mood, or narrative unless it's visually explicit.
- No artistic or cinematic analysis.
- Always include the language of any text in the image if present as an object, e.g. "English text", "Japanese text", "Russian text", etc.
- Maximum 10 objects and 5 actions.
- Return an empty array for 'logos' if none are present.
- Always output strictly valid JSON with proper escaping.
- Output **only the JSON**, no extra text or explanation.\`;

// Function to encode image from URL
async function encodeImageUrl(imageUrl) {
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('base64');
}

// Example usage
const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg";
const base64Image = await encodeImageUrl(imageUrl);

const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
        role: "user",
        content: [
            { type: "text", text: USER_PROMPT },
            {
                type: "image_url",
                image_url: {
                    url: \`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII=\`,
                    detail: "high"
                },
            },
        ],
    },
];

const response = await openai.chat.completions.create({
    model: "inference-net/cliptagger-12b",
    messages: messages,
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: "json_object" },
});

// Parse and validate the JSON response
const rawResult = JSON.parse(response.choices[0].message.content);
const result = ClipTaggerResponseSchema.parse(rawResult); // This will throw if the response doesn't match the schema

// Now 'result' is fully typed as ClipTaggerResponse
console.log(JSON.stringify(result, null, 2));

// You can access typed properties
console.log(\`Description: \${result.description}\`);
console.log(\`Objects found: \${result.objects.length}\`);`