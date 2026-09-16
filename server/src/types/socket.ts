import { Socket } from "socket.io"

type SocketId = string

enum SocketEvent {
	JOIN_REQUEST = "join-request",
	JOIN_ACCEPTED = "join-accepted",
	USER_JOINED = "user-joined",
	USER_DISCONNECTED = "user-disconnected",
	SYNC_FILE_STRUCTURE = "sync-file-structure",
	DIRECTORY_CREATED = "directory-created",
	DIRECTORY_UPDATED = "directory-updated",
	DIRECTORY_RENAMED = "directory-renamed",
	DIRECTORY_DELETED = "directory-deleted",
	FILE_CREATED = "file-created",
	FILE_UPDATED = "file-updated",
	FILE_RENAMED = "file-renamed",
	FILE_DELETED = "file-deleted",
	USER_OFFLINE = "offline",
	USER_ONLINE = "online",
	SEND_MESSAGE = "send-message",
	RECEIVE_MESSAGE = "receive-message",
	TYPING_START = "typing-start",
	TYPING_PAUSE = "typing-pause",
	USERNAME_EXISTS = "username-exists",
	REQUEST_DRAWING = "request-drawing",
	SYNC_DRAWING = "sync-drawing",
	DRAWING_UPDATE = "drawing-update",
	// WebRTC Video Call Events (audio-only calls removed)
	CALL_INITIATE = "call-initiate",
	CALL_OFFER = "call-offer",
	CALL_ANSWER = "call-answer",
	ICE_CANDIDATE = "ice-candidate",
	CALL_REJECT = "call-reject",
	CALL_END = "call-end",
	CALL_ACCEPTED = "call-accepted",
	USER_MEDIA_STATE = "user-media-state",
}

interface SocketContext {
	socket: Socket
}

export { SocketEvent, SocketContext, SocketId }
