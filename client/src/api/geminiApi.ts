import { GoogleGenerativeAI } from "@google/generative-ai"

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim()

if (!API_KEY || API_KEY === "paste_your_gemini_key_here") {
    console.error(
        "[Gemini] API key not set. Open client/.env and set VITE_GEMINI_API_KEY from https://aistudio.google.com/apikey",
    )
}

const genAI = new GoogleGenerativeAI(API_KEY || "")

// gemini-1.5-flash / 2.0-flash are shut down — try current Flash aliases
const MODEL_CANDIDATES = [
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
] as const

const getModel = (name: string) => genAI.getGenerativeModel({ model: name })

const isRetryableModelError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status: unknown }).status === "number"
            ? (error as { status: number }).status
            : undefined
    return (
        status === 404 ||
        status === 503 ||
        /404|not found|not supported|high demand|unavailable|overloaded/i.test(
            message,
        )
    )
}

export const generateWithGemini = async (
    systemPrompt: string,
    userPrompt: string,
): Promise<string> => {
    if (!API_KEY) {
        throw new Error(
            "Gemini API key missing. Set VITE_GEMINI_API_KEY in client/.env and restart the Vite server.",
        )
    }

    const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`
    let lastError: unknown

    for (const modelName of MODEL_CANDIDATES) {
        try {
            const result = await getModel(modelName).generateContent(fullPrompt)
            return result.response.text()
        } catch (error) {
            lastError = error
            console.warn(`[Gemini] ${modelName} failed:`, error)
            if (!isRetryableModelError(error)) break
        }
    }

    console.error("Error generating content with Gemini:", lastError)
    throw lastError instanceof Error
        ? lastError
        : new Error("Failed to generate content with Gemini")
}

export const generateWithGeminiStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
): Promise<void> => {
    if (!API_KEY) {
        throw new Error(
            "Gemini API key missing. Set VITE_GEMINI_API_KEY in client/.env and restart the Vite server.",
        )
    }

    const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`
    let lastError: unknown

    for (const modelName of MODEL_CANDIDATES) {
        try {
            const result = await getModel(modelName).generateContentStream(fullPrompt)
            for await (const chunk of result.stream) {
                onChunk(chunk.text())
            }
            return
        } catch (error) {
            lastError = error
            console.warn(`[Gemini] ${modelName} stream failed:`, error)
            if (!isRetryableModelError(error)) break
        }
    }

    console.error("Error generating content with Gemini:", lastError)
    throw lastError instanceof Error
        ? lastError
        : new Error("Failed to generate content with Gemini")
}

export default { generateWithGemini, generateWithGeminiStream }
