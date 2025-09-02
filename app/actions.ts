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

        // Ask the model to return an IMAGE
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: [
                { inlineData: { mimeType, data: base64Image } },
                {
                    text: `Transform this photo of an interior into a visualization of how it would look after a full reconstruction in a ${style} style. Keep all main construction elements — doors, windows, walls, ceiling height, and overall layout — in the exact same place. Do not replace windows. Paint the walls in ${wallColor} color. Replace old or damaged surfaces, including walls and ceilings with clean, renovated materials in line with the chosen style. Replace old furniture and lamps from ceiling. Use realistic textures, natural lighting, and high-quality interior design details to show a professional, photorealistic result. Do not include any text on the photograph.`,
                },
            ],
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
        if (!part?.inlineData?.data) throw new Error("Model did not return an image.");
        const outBase64 = part.inlineData.data;
        const outMime = part.inlineData.mimeType || "image/png";
        const dataUrl = `data:${outMime};base64,${outBase64}`;

        return { ok: true, dataUrl, mimeType: outMime };
    } catch (e: any) {
        console.error(e);
        return { ok: false, error: e?.message ?? "Unknown error" };
    }
}
