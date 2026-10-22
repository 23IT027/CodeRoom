import { useAppContext } from "@/context/AppContext"
import { useChatRoom } from "@/context/ChatContext"
import { useSocket } from "@/context/SocketContext"
import { ChatAttachment, ChatMessage } from "@/types/chat"
import { SocketEvent } from "@/types/socket"
import { formatDate } from "@/utils/formateDate"
import {
    detectAttachmentType,
    fileToDataURL,
    formatFileSize,
} from "@/utils/fileAttachment"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import {
    LuFile,
    LuFilm,
    LuMic,
    LuMusic,
    LuPaperclip,
    LuSendHorizonal,
    LuSquare,
    LuX,
} from "react-icons/lu"
import { v4 as uuidV4 } from "uuid"

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB

function ChatInput() {
    const { currentUser } = useAppContext()
    const { socket } = useSocket()
    const { setMessages } = useChatRoom()
    const inputRef = useRef<HTMLInputElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
    const [isUploading, setIsUploading] = useState<boolean>(false)

    // Voice recording states & refs
    const [isRecording, setIsRecording] = useState<boolean>(false)
    const [recordingTime, setRecordingTime] = useState<number>(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Clean up media recorder stream & timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
            }
        }
    }, [])

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > MAX_FILE_SIZE) {
            toast.error("File is too large. Maximum size is 15 MB.")
            if (fileInputRef.current) fileInputRef.current.value = ""
            return
        }

        try {
            setIsUploading(true)
            const dataUrl = await fileToDataURL(file)
            const type = detectAttachmentType(file.type, file.name)
            setAttachment({
                name: file.name,
                type,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
                url: dataUrl,
            })
        } catch (error) {
            console.error("Failed to read file:", error)
            toast.error("Failed to process file.")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    // Voice Note Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
            audioChunksRef.current = []

            const mimeType = MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : MediaRecorder.isTypeSupported("audio/ogg")
                  ? "audio/ogg"
                  : "audio/mp4"

            const recorder = new MediaRecorder(stream, { mimeType })
            mediaRecorderRef.current = recorder

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
                if (audioBlob.size > 0) {
                    try {
                        const dataUrl = await fileToDataURL(audioBlob)
                        setAttachment({
                            name: `Voice note ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.webm`,
                            type: "audio",
                            mimeType,
                            size: audioBlob.size,
                            url: dataUrl,
                        })
                    } catch (err) {
                        console.error("Failed to convert audio:", err)
                        toast.error("Failed to attach voice recording.")
                    }
                }
                // Stop tracks
                stream.getTracks().forEach((track) => track.stop())
                streamRef.current = null
            }

            recorder.start(200)
            setIsRecording(true)
            setRecordingTime(0)

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)
        } catch (err) {
            console.error("Microphone access denied:", err)
            toast.error("Microphone access denied or unavailable.")
        }
    }

    const stopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
    }

    const cancelRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            // Discard chunks before stopping
            audioChunksRef.current = []
            mediaRecorderRef.current.stop()
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }
        setIsRecording(false)
        setRecordingTime(0)
    }

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const inputVal = inputRef.current?.value.trim() || ""

        // Must have either text or attachment
        if (!inputVal && !attachment) return

        const message: ChatMessage = {
            id: uuidV4(),
            message: inputVal,
            username: currentUser.username,
            timestamp: formatDate(new Date().toISOString()),
            attachment: attachment || undefined,
        }

        socket.emit(SocketEvent.SEND_MESSAGE, { message })
        setMessages((messages) => [...messages, message])

        // Reset
        if (inputRef.current) inputRef.current.value = ""
        setAttachment(null)
    }

    return (
        <div className="flex flex-col gap-2 pt-2">
            {/* Attachment Preview Card */}
            {attachment && (
                <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-dark px-3 py-2 shadow-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {attachment.type === "image" && (
                            <img
                                src={attachment.url}
                                alt="preview"
                                className="h-10 w-10 rounded object-cover border border-gray-700"
                            />
                        )}
                        {attachment.type === "video" && (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-900/40 text-purple-400">
                                <LuFilm size={20} />
                            </div>
                        )}
                        {attachment.type === "audio" && (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-900/40 text-blue-400">
                                <LuMusic size={20} />
                            </div>
                        )}
                        {attachment.type === "document" && (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-amber-900/40 text-amber-400">
                                <LuFile size={20} />
                            </div>
                        )}
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-xs font-medium text-white max-w-[170px]">
                                {attachment.name}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {formatFileSize(attachment.size)} • {attachment.type.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="rounded-full p-1 text-gray-400 hover:bg-darkHover hover:text-red-400 transition-colors"
                        title="Remove attachment"
                    >
                        <LuX size={16} />
                    </button>
                </div>
            )}

            {/* Hidden native file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.tar,.gz,.json,.js,.ts,.py,.cpp,.java"
            />

            {/* Voice Recording Mode */}
            {isRecording ? (
                <div className="flex items-center justify-between rounded-md border border-red-500 bg-dark p-2 animate-pulse">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-xs text-red-400 font-semibold">
                            Recording ({formatTimer(recordingTime)})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={cancelRecording}
                            className="rounded p-1 text-xs text-gray-400 hover:bg-darkHover hover:text-white"
                            title="Cancel recording"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 shadow"
                            title="Done recording"
                        >
                            <LuSquare size={14} /> Stop
                        </button>
                    </div>
                </div>
            ) : (
                /* Standard Message Form */
                <form
                    onSubmit={handleSendMessage}
                    className="flex items-center rounded-md border border-primary bg-dark focus-within:ring-1 focus-within:ring-primary"
                >
                    {/* Attachment button */}
                    <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                        title="Attach photo, video, audio, or document"
                    >
                        <LuPaperclip size={20} />
                    </button>

                    {/* Text input */}
                    <input
                        type="text"
                        className="w-full flex-grow border-none bg-transparent p-2 text-sm text-white placeholder-gray-500 outline-none"
                        placeholder={
                            attachment
                                ? "Add a caption or send..."
                                : "Type message or attach media..."
                        }
                        ref={inputRef}
                    />

                    {/* Voice note record button */}
                    <button
                        type="button"
                        onClick={startRecording}
                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                        title="Record a voice note"
                    >
                        <LuMic size={20} />
                    </button>

                    {/* Send button */}
                    <button
                        className="flex items-center justify-center rounded-r-md bg-primary px-3 py-2 text-black hover:bg-primary/90 transition-colors disabled:opacity-50"
                        type="submit"
                        disabled={isUploading}
                        title="Send message"
                    >
                        <LuSendHorizonal size={20} />
                    </button>
                </form>
            )}
        </div>
    )
}

export default ChatInput
