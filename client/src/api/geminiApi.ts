import { GoogleGenerativeAI } from "@google/generative-ai"

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string

if (!API_KEY || API_KEY === "paste_your_gemini_key_here") {
    console.error(
        "[Gemini] API key not set. Open client/.env and replace 'paste_your_gemini_key_here' with your key from https://aistudio.google.com",
    )
}

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(API_KEY)

// gemini-1.5-flash is free tier — no billing required
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

export const generateWithGemini = async (
    systemPrompt: string,
    userPrompt: string,
): Promise<string> => {
    try {
        // Combine system and user prompts
        const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`

        // Generate content
        const result = await model.generateContent(fullPrompt)
        const response = result.response
        const text = response.text()

        return text
    } catch (error) {
        console.error("Error generating content with Gemini:", error)
        throw error
    }
}

export const generateWithGeminiStream = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
): Promise<void> => {
    try {
        // Combine system and user prompts
        const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`

        // Generate content with streaming
        const result = await model.generateContentStream(fullPrompt)

        // Process the stream
        for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            onChunk(chunkText)
        }
    } catch (error) {
        console.error("Error generating content with Gemini:", error)
        throw error
    }
}

export default { generateWithGemini, generateWithGeminiStream }
