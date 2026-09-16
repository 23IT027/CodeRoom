export interface MediaState {
    video: boolean
    audio: boolean
}

export interface CallState {
    isInCall: boolean
    isIncomingCall: boolean
    isOutgoingCall: boolean
    // Audio-only call type removed; only video calls are supported now
    callType: 'video'
    caller?: {
        username: string
        socketId: string
    }
    callee?: {
        username: string
        socketId: string
    }
    localStream?: MediaStream
    remoteStream?: MediaStream
    peerConnection?: RTCPeerConnection
}

export enum CallStatus {
    IDLE = 'idle',
    INITIATING = 'initiating',
    RINGING = 'ringing',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ENDED = 'ended',
    REJECTED = 'rejected',
    FAILED = 'failed'
}

export interface WebRTCConfig {
    iceServers: RTCIceServer[]
}
