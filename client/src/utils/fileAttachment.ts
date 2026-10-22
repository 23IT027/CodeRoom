import { AttachmentType } from "@/types/chat"

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function detectAttachmentType(mimeType: string, fileName: string): AttachmentType {
    const mime = (mimeType || "").toLowerCase()
    const name = (fileName || "").toLowerCase()

    if (
        mime.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name)
    ) {
        return "image"
    }

    if (
        mime.startsWith("video/") ||
        /\.(mp4|webm|ogg|mov|mkv|avi|wmv)$/i.test(name)
    ) {
        return "video"
    }

    if (
        mime.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(name)
    ) {
        return "audio"
    }

    return "document"
}

export function fileToDataURL(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result)
            } else {
                reject(new Error("Failed to read file as data URL"))
            }
        }
        reader.onerror = () => reject(reader.error || new Error("File reading error"))
        reader.readAsDataURL(file)
    })
}
