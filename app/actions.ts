"use server";

import { GoogleGenAI } from "@google/genai";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function editImageAction(
    formData: FormData
): Promise<{ ok: true; dataUrl: string; mimeType: string } | { ok: false; error: string }> {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return { ok: false, error: "Missing GOOGLE_API_KEY env var." };

        const file = formData.get("image");

        if (!(file instanceof File)) return { ok: false, error: "No image uploaded." };

        const mimeType = file.type || "application/octet-stream";
        if (!ALLOWED_TYPES.has(mimeType)) {
            return { ok: false, error: `Unsupported file type: ${mimeType}` };
        }
        if (file.size > MAX_BYTES) {
            return { ok: false, error: "Image too large (max 10MB)." };
        }

        const bytes = Buffer.from(await file.arrayBuffer());
        const base64Image = bytes.toString("base64");

        const ai = new GoogleGenAI({ apiKey });

        const style = formData.get("style")?.toString().trim() || "modern";
        const wallColor = formData.get("wallColor")?.toString().trim() || "#F8BBD0"; // Default to pastel pink if not provided

        // Create the prompt text, conditionally including the wall color sentence
        let promptText = `Transform this photo of an interior into a visualization of how it would look after a full reconstruction in a ${style} style. Keep all main construction elements — doors, windows, walls, ceiling height, and overall layout — in the exact same place. Do not replace windows. `;

        // Only include the wall color sentence if not "no-change"
        if (wallColor !== "no-change") {
            promptText += `Paint the walls in ${wallColor} color. `;
        }

        promptText += `Replace old or damaged surfaces, including walls and ceilings with clean, renovated materials in line with the chosen style. Replace old furniture and lamps from ceiling. Use realistic textures, natural lighting, and high-quality interior design details to show a professional, photorealistic result. Do not include any text on the photograph.`;

        // Ask the model to return an IMAGE
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: [
                { inlineData: { mimeType, data: base64Image } },
                {
                    text: `Photorealistic interior design rendering of a fully renovated room in a ${style} style. Use the provided image as a strict structural reference.

                            Structural Constraints:
                            
                            Maintain the existing architectural layout perfectly. All walls, doors, and windows must remain in their original positions and sizes.
                            
                            Do not alter the window frames or ceiling height. Do not add or remove any walls, doors or windows. Do not remove staircases.
                            
                            Renovation Details:
                            
                            Replace all furniture, decor, and ceiling light fixtures with new, high-end items that fit the ${style} aesthetic.
                            
                            Refinish all surfaces: Apply new, clean materials to the walls, floor, and ceiling. Ensure materials are appropriate for the chosen style (e.g., light wood floors and white walls for Scandinavian; polished concrete and exposed brick for Industrial).
                            
                            Aesthetic Goals:
                            
                            Photography: Professional interior design magazine quality, natural lighting streaming from the windows, hyperrealistic, 8K resolution.
                            
                            Atmosphere: Clean, professionally staged, inviting, high-end.
                            
                            Negative Prompt: --no text, --no watermarks, --no people, --no clutter, --no distorted perspectives`,
                },
            ],
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
        if (!part?.inlineData?.data) throw new Error("Model did not return an image.");
        const outBase64 = part.inlineData.data;
        const outMime = part.inlineData.mimeType || "image/png";
        const dataUrl = `data:${outMime};base64,${outBase64}`;

        return { ok: true, dataUrl, mimeType: outMime };
    } catch (e: unknown) {
        console.error(e);
        let message = "Unknown error";
        if (e instanceof Error) message = e.message;
        return { ok: false, error: message};
    }
}
