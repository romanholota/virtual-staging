"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { editImageAction } from "@/app/actions"; // <- adjust path if needed

const STYLE_OPTIONS = [
    { value: "modern", label: "Moderný" },
    { value: "scandinavian", label: "Škandinávsky" },
    { value: "minimalist", label: "Minimalistický" },
    { value: "industrial", label: "Industriálny" },
    { value: "boho", label: "Boho" },
    { value: "japandi", label: "Japandi" },
    { value: "rustic", label: "Rustikálny" },
    { value: "mid-century modern", label: "Mid-Century Modern" },
    { value: "contemporary", label: "Súčasný" },
];

const COLOR_OPTIONS = [
    { value: "no-change", label: "No Change" },
    { value: "#F8BBD0", label: "Pink" },
    { value: "#B3E5FC", label: "Blue" },
    { value: "#C8E6C9", label: "Green" },
    { value: "#FFF9C4", label: "Yellow" },
    { value: "#E1BEE7", label: "Purple" },
    { value: "#FFCCBC", label: "Orange" },
    { value: "#D7CCC8", label: "Brown" },
    { value: "#CFD8DC", label: "Gray" },
    { value: "#FFFFFF", label: "White" },
];

// Image comparison slider component
function ImageComparisonSlider({ 
    originalImage, 
    generatedImage,
    style,
    wallColor 
}: { 
    originalImage: string; 
    generatedImage: string;
    style: string;
    wallColor: string;
}) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSliderPosition(Number(e.target.value));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        setSliderPosition(Math.min(Math.max(x, 0), 100));
    };

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">Drag the slider to compare original and generated images:</p>
            <div 
                className="relative w-full overflow-hidden rounded border cursor-pointer" 
                ref={containerRef}
                onMouseMove={handleMouseMove}
            >
                {/* Container for both images */}
                <div className="relative">
                    {/* Generated image (base layer) with label */}
                    <div className="relative">
                        <img 
                            src={generatedImage} 
                            alt="Generated" 
                            className="block w-full"
                            style={{ height: 'auto' }}
                        />

                        {/* Generated label - will be clipped when slider moves */}
                        <div 
                            className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                            Generated
                        </div>
                    </div>

                    {/* Original image (overlay) */}
                    <div 
                        className="absolute top-0 left-0 w-full h-full"
                        style={{ 
                            clipPath: `inset(0 ${100-sliderPosition}% 0 0)` 
                        }}
                    >
                        <img 
                            src={originalImage} 
                            alt="Original" 
                            className="block w-full"
                            style={{ height: 'auto' }}
                        />
                        {/* Original label - moves with the original image */}
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                            Original
                        </div>
                    </div>
                </div>

                {/* Vertical divider line with gradient effect */}
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10"
                    style={{ 
                        left: `${sliderPosition}%`,
                        background: 'linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,1), rgba(255,255,255,0.7))',
                        width: '2px'
                    }}
                >
                    {/* Slider handle */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Slider control */}
            <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={handleSliderChange}
                className="w-full"
            />

            {/* Download button */}
            <a
                href={generatedImage}
                download={`visualization-${style}-${wallColor.replace('#', '')}.png`}
                className="inline-block text-sm underline mt-1"
            >
                Download generated image
            </a>
        </div>
    );
}

export default function GenerateImage() {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
    const [style, setStyle] = useState<string>("modern");
    const [wallColor, setWallColor] = useState<string>(COLOR_OPTIONS[0].value); // Default to "no-change"
    const [file, setFile] = useState<File | null>(null);

    // create a local preview for the selected file
    useEffect(() => {
        if (!file) {
            setLocalPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setLocalPreviewUrl(url);
        setResultUrl(null); // Clear previous result when a new file is selected
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const onSubmit = (formData: FormData) => {
        setError(null);
        setResultUrl(null);

        startTransition(async () => {
            const res = await editImageAction(formData);
            if (res.ok) {
                setResultUrl(res.dataUrl);
            } else {
                setError(res.error);
            }
        });
    };

    // We build a FormData manually so we can validate before submit
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setResultUrl(null);

        if (!file) {
            setError("Please choose an image (PNG/JPEG/WEBP, up to 10MB).");
            return;
        }

        const fd = new FormData();
        fd.append("image", file);
        fd.append("style", style);
        fd.append("wallColor", wallColor);

        onSubmit(fd);
    };

    const resetForm = () => {
        setFile(null);
        setStyle("modern");
        setWallColor(COLOR_OPTIONS[0].value); // Reset to "no-change"
        setLocalPreviewUrl(null);
        setResultUrl(null);
        setError(null);
        // reset underlying <form> inputs by keying the form or using ref if you want
    };

    return (
        <div className="max-w-xl w-full space-y-6">
            <h1 className="mb-4 text-3xl font-extrabold text-gray-900 md:text-5xl lg:text-6xl"><span
                className="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Interiér</span> Na Klik</h1>
            <p className="text-sm text-gray-600">
                Nahrajte fotku miestnosti a vyberte štýl. Získate fotorealistickú vizualizáciu v novom štýle, v ktorej bude zachované pôvodné umiestnenie dverí, okien aj celkové usporiadanie.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image input */}
                <div className="space-y-1">
                    <label htmlFor="image" className="block text-sm font-medium">
                        Obrázok (PNG, JPEG, alebo WEBP)
                    </label>
                    <input
                        id="image"
                        name="image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                            const f = e.currentTarget.files?.[0] || null;
                            setFile(f ?? null);
                        }}
                        className="block w-full text-sm file:mr-3 file:rounded file:border file:px-3 file:py-1.5 file:text-sm file:bg-gray-50 file:border-gray-200"
                        required
                    />
                    <p className="text-xs text-gray-500">Max 10 MB.</p>
                </div>

                {/* Style radio buttons */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium">
                        Štýl interiéru
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {STYLE_OPTIONS.map((o) => (
                            <label
                                key={o.value}
                                className={`flex flex-col items-center p-2 border rounded cursor-pointer transition-colors ${
                                    style === o.value ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="style"
                                    value={o.value}
                                    checked={style === o.value}
                                    onChange={() => setStyle(o.value)}
                                    className="sr-only" // Hide the actual radio button
                                />
                                <img
                                    src={`/styles/${o.value.replace(/ /g, '-')}.svg`}
                                    alt={o.label}
                                    className="w-8 h-8 mb-1"
                                />
                                <span className="text-xs text-center">{o.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Wall Color Picker */}
                {/*<div className="space-y-2">*/}
                {/*    <label className="block text-sm font-medium">*/}
                {/*        Wall Color*/}
                {/*    </label>*/}
                {/*    <div className="grid grid-cols-5 gap-2">*/}
                {/*        {COLOR_OPTIONS.map((color) => (*/}
                {/*            <label */}
                {/*                key={color.value} */}
                {/*                className={`flex flex-col items-center p-2 border rounded cursor-pointer transition-colors ${*/}
                {/*                    wallColor === color.value ? 'border-black' : 'border-gray-200 hover:border-gray-300'*/}
                {/*                }`}*/}
                {/*            >*/}
                {/*                <input*/}
                {/*                    type="radio"*/}
                {/*                    name="wallColor"*/}
                {/*                    value={color.value}*/}
                {/*                    checked={wallColor === color.value}*/}
                {/*                    onChange={() => setWallColor(color.value)}*/}
                {/*                    className="sr-only" // Hide the actual radio button*/}
                {/*                />*/}
                {/*                {color.value === "no-change" ? (*/}
                {/*                    <div */}
                {/*                        className="w-8 h-8 rounded-full mb-1 border border-gray-200 flex items-center justify-center"*/}
                {/*                    >*/}
                {/*                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">*/}
                {/*                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />*/}
                {/*                        </svg>*/}
                {/*                    </div>*/}
                {/*                ) : (*/}
                {/*                    <div */}
                {/*                        className="w-8 h-8 rounded-full mb-1 border border-gray-200" */}
                {/*                        style={{ backgroundColor: color.value }}*/}
                {/*                    ></div>*/}
                {/*                )}*/}
                {/*                <span className="text-xs text-center">{color.label}</span>*/}
                {/*            </label>*/}
                {/*        ))}*/}
                {/*    </div>*/}
                {/*</div>*/}

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={pending}
                        className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-60"
                    >
                        {pending ? "Generujem…" : "Generovať"}
                    </button>
                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={pending}
                        className="rounded border px-4 py-2 text-sm disabled:opacity-60"
                    >
                        Reset
                    </button>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </form>

            {/* Show comparison slider when both images are available */}
            {localPreviewUrl && resultUrl ? (
                <ImageComparisonSlider
                    originalImage={localPreviewUrl}
                    generatedImage={resultUrl}
                    style={style}
                    wallColor={wallColor}
                />
            ) : (
                <>
                    {/* Local preview of the uploaded image */}
                    {localPreviewUrl && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Originál:</p>
                            <img
                                src={localPreviewUrl}
                                alt="Original"
                                className="max-w-full h-auto rounded border"
                            />
                        </div>
                    )}

                    {/* Result */}
                    {resultUrl && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Návrh:</p>
                            <img src={resultUrl} alt="Edited" className="max-w-full h-auto rounded border"/>
                            <a
                                href={resultUrl}
                                download={`visualization-${style}-${wallColor.replace('#', '')}.png`}
                                className="inline-block text-sm underline mt-1"
                            >
                                Stiahnuť vygenerovaný obrázok
                            </a>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
