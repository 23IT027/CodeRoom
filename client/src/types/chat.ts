export type AttachmentType = 'image' | 'video' | 'audio' | 'document'

export interface ChatAttachment {
    name: string
    type: AttachmentType
    mimeType: string
    size: number
    url: string
}

export interface ChatMessage {
    id: string
    message: string
    username: string
    timestamp: string
    attachment?: ChatAttachment
}

export interface ChatContext {
    messages: ChatMessage[]
    setMessages: (
        messages: ChatMessage[] | ((messages: ChatMessage[]) => ChatMessage[]),
    ) => void
    isNewMessage: boolean
    setIsNewMessage: (isNewMessage: boolean) => void
    lastScrollHeight: number
    setLastScrollHeight: (lastScrollHeight: number) => void
}
