import { useAppContext } from "@/context/AppContext"
import { useChatRoom } from "@/context/ChatContext"
import { ChatAttachment } from "@/types/chat"
import { formatFileSize } from "@/utils/fileAttachment"
import { saveAs } from "file-saver"
import { SyntheticEvent, useEffect, useRef, useState } from "react"
import {
    LuDownload,
    LuEye,
    LuFile,
    LuFileText,
    LuMusic,
    LuX,
} from "react-icons/lu"

function ChatList() {
    const {
        messages,
        isNewMessage,
        setIsNewMessage,
        lastScrollHeight,
        setLastScrollHeight,
    } = useChatRoom()
    const { currentUser } = useAppContext()
    const messagesContainerRef = useRef<HTMLDivElement | null>(null)

    // Lightbox modal state for full-screen image preview
    const [lightboxImage, setLightboxImage] = useState<ChatAttachment | null>(null)

    const handleScroll = (e: SyntheticEvent) => {
        const container = e.target as HTMLDivElement
        setLastScrollHeight(container.scrollTop)
    }

    // Scroll to bottom when messages change
    useEffect(() => {
        if (!messagesContainerRef.current) return
        messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight
    }, [messages])

    useEffect(() => {
        if (isNewMessage) {
            setIsNewMessage(false)
        }
        if (messagesContainerRef.current)
            messagesContainerRef.current.scrollTop = lastScrollHeight
    }, [isNewMessage, setIsNewMessage, lastScrollHeight])

    const handleDownload = (e: React.MouseEvent, attachment: ChatAttachment) => {
        e.stopPropagation()
        saveAs(attachment.url, attachment.name)
    }

    return (
        <>
            <div
                className="flex-grow overflow-auto rounded-md bg-darkHover p-2 space-y-3"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs text-gray-600 mt-1">
                            Send text, photos, audio, videos, or documents!
                        </p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isSelf = message.username === currentUser.username
                        const attachment = message.attachment

                        return (
                            <div
                                key={message.id}
                                className={`flex flex-col max-w-[85%] rounded-lg p-3 text-sm shadow-md transition-all ${
                                    isSelf
                                        ? "ml-auto bg-dark border border-primary/30 text-white"
                                        : "mr-auto bg-dark/95 border border-gray-700/60 text-white"
                                }`}
                            >
                                {/* Header: Username & Timestamp */}
                                <div className="flex items-center justify-between gap-4 pb-1 border-b border-gray-800">
                                    <span className="text-xs font-semibold text-primary">
                                        {isSelf ? "You" : message.username}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {message.timestamp}
                                    </span>
                                </div>

                                {/* Attachment Rendering */}
                                {attachment && (
                                    <div className="mt-2 space-y-2">
                                        {/* Image Attachment */}
                                        {attachment.type === "image" && (
                                            <div className="group relative overflow-hidden rounded-md border border-gray-800 bg-black/40">
                                                <img
                                                    src={attachment.url}
                                                    alt={attachment.name}
                                                    className="max-h-56 w-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                                                    onClick={() => setLightboxImage(attachment)}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setLightboxImage(attachment)}
                                                        className="rounded-full bg-dark/90 p-2 text-white hover:text-primary transition-colors shadow"
                                                        title="View full size"
                                                    >
                                                        <LuEye size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDownload(e, attachment)}
                                                        className="rounded-full bg-dark/90 p-2 text-white hover:text-primary transition-colors shadow"
                                                        title="Download image"
                                                    >
                                                        <LuDownload size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Video Attachment */}
                                        {attachment.type === "video" && (
                                            <div className="overflow-hidden rounded-md border border-gray-800 bg-black">
                                                <video
                                                    controls
                                                    preload="metadata"
                                                    className="max-h-56 w-full rounded-md object-contain"
                                                    src={attachment.url}
                                                />
                                                <div className="flex items-center justify-between p-2 bg-dark/80 text-xs text-gray-400">
                                                    <span className="truncate max-w-[180px]">
                                                        {attachment.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDownload(e, attachment)}
                                                        className="hover:text-primary transition-colors flex items-center gap-1"
                                                        title="Download video"
                                                    >
                                                        <LuDownload size={14} />
                                                        <span className="text-[10px]">
                                                            {formatFileSize(attachment.size)}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Audio Attachment */}
                                        {attachment.type === "audio" && (
                                            <div className="flex flex-col rounded-md border border-gray-800 bg-black/30 p-2">
                                                <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <LuMusic className="text-primary" size={16} />
                                                        <span className="truncate max-w-[160px] font-medium">
                                                            {attachment.name}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDownload(e, attachment)}
                                                        className="text-gray-400 hover:text-primary transition-colors"
                                                        title="Download audio"
                                                    >
                                                        <LuDownload size={14} />
                                                    </button>
                                                </div>
                                                <audio
                                                    controls
                                                    className="w-full h-8 mt-1 rounded"
                                                    src={attachment.url}
                                                />
                                            </div>
                                        )}

                                        {/* Document Attachment */}
                                        {attachment.type === "document" && (
                                            <div
                                                onClick={(e) => handleDownload(e, attachment)}
                                                className="flex items-center justify-between gap-3 rounded-md border border-gray-700/60 bg-dark/70 p-3 hover:border-primary/60 transition-all cursor-pointer group"
                                                title="Click to download document"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                                                        {attachment.name.endsWith(".pdf") ? (
                                                            <LuFileText size={22} />
                                                        ) : (
                                                            <LuFile size={22} />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden text-left">
                                                        <span className="truncate text-xs font-medium text-white group-hover:text-primary transition-colors">
                                                            {attachment.name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {formatFileSize(attachment.size)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDownload(e, attachment)}
                                                    className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-darkHover hover:text-primary transition-colors"
                                                    title="Download file"
                                                >
                                                    <LuDownload size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Message text caption (if present and distinct from filename) */}
                                {message.message &&
                                    (!attachment || message.message !== attachment.name) && (
                                        <p className="mt-1 break-words py-1 text-gray-200">
                                            {message.message}
                                        </p>
                                    )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Lightbox Fullscreen Image Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setLightboxImage(null)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-dark border border-gray-800 shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-800 bg-dark px-4 py-2">
                            <span className="truncate text-xs text-gray-300 font-medium max-w-[250px]">
                                {lightboxImage.name} ({formatFileSize(lightboxImage.size)})
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={(e) => handleDownload(e, lightboxImage)}
                                    className="flex items-center gap-1 rounded bg-primary/20 px-2 py-1 text-xs text-primary hover:bg-primary/30 transition-colors"
                                >
                                    <LuDownload size={14} /> Download
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLightboxImage(null)}
                                    className="rounded p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                    <LuX size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Full-size Image */}
                        <div className="flex items-center justify-center p-2 overflow-auto max-h-[80vh]">
                            <img
                                src={lightboxImage.url}
                                alt={lightboxImage.name}
                                className="max-h-[75vh] w-auto max-w-full rounded object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ChatList
