import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    ReactNode,
} from 'react'
import { toast } from 'react-hot-toast'
import { CallState, CallStatus, MediaState, WebRTCConfig } from '@/types/webrtc'
import { SocketEvent } from '@/types/socket'
import { RemoteUser } from '@/types/user'
import { useSocket } from './SocketContext'
import { useAppContext } from './AppContext'

interface WebRTCContextType {
    callState: CallState
    callStatus: CallStatus
    localMediaState: MediaState
    remoteMediaState: MediaState
    initiateCall: (targetUser: RemoteUser) => void
    acceptCall: () => void
    rejectCall: () => void
    endCall: () => void
    toggleVideo: () => void
    toggleAudio: () => void
    isVideoEnabled: boolean
    isAudioEnabled: boolean
}

const WebRTCContext = createContext<WebRTCContextType | null>(null)

export const useWebRTC = (): WebRTCContextType => {
    const context = useContext(WebRTCContext)
    if (!context) {
        throw new Error('useWebRTC must be used within a WebRTCProvider')
    }
    return context
}

// WebRTC Configuration with STUN + TURN servers for cross-device / cross-network support
const webRTCConfig: WebRTCConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
}

// Helper: emit both socketId and username so server can fall back to username lookup
function makeTarget(user: { socketId: string; username: string }) {
    return { targetUserId: user.socketId, targetUsername: user.username }
}

const WebRTCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { socket } = useSocket()
    const { currentUser } = useAppContext()

    const [callState, setCallState] = useState<CallState>({
        isInCall: false,
        isIncomingCall: false,
        isOutgoingCall: false,
        callType: 'video',
    })

    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.IDLE)
    const [localMediaState, setLocalMediaState] = useState<MediaState>({ video: true, audio: true })
    const [remoteMediaState, setRemoteMediaState] = useState<MediaState>({ video: true, audio: true })

    // Refs so socket handlers always see fresh state without re-registering
    const callStateRef = useRef<CallState>(callState)
    const callStatusRef = useRef<CallStatus>(callStatus)
    const currentUserRef = useRef(currentUser)
    useEffect(() => { callStateRef.current = callState }, [callState])
    useEffect(() => { callStatusRef.current = callStatus }, [callStatus])
    useEffect(() => { currentUserRef.current = currentUser }, [currentUser])

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)

    const isVideoEnabled = localMediaState.video
    const isAudioEnabled = localMediaState.audio

    // ─── Cleanup ────────────────────────────────────────────────────────────────
    const cleanupWebRTC = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop())
            localStreamRef.current = null
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        setCallState({ isInCall: false, isIncomingCall: false, isOutgoingCall: false, callType: 'video' })
        setCallStatus(CallStatus.IDLE)
        setLocalMediaState({ video: true, audio: true })
        setRemoteMediaState({ video: true, audio: true })
    }, [])

    // ─── Create Peer Connection ──────────────────────────────────────────────────
    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection(webRTCConfig)

        pc.onicecandidate = (event) => {
            if (!event.candidate) return
            const cs = callStateRef.current
            const target = cs.isOutgoingCall ? cs.callee : cs.caller
            if (target) {
                socket.emit(SocketEvent.ICE_CANDIDATE, {
                    ...makeTarget(target),
                    candidate: event.candidate,
                })
            }
        }

        pc.ontrack = (event) => {
            setCallState(prev => ({ ...prev, remoteStream: event.streams[0] }))
        }

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState)
            if (pc.connectionState === 'connected') {
                setCallStatus(CallStatus.CONNECTED)
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                toast.error('Call connection failed')
                cleanupWebRTC()
            }
        }

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState)
        }

        return pc
    }, [socket, cleanupWebRTC])

    // ─── Get User Media ──────────────────────────────────────────────────────────
    const getUserMedia = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        setCallState(prev => ({ ...prev, localStream: stream }))
        return stream
    }, [])

    // ─── Initiate Call ───────────────────────────────────────────────────────────
    const initiateCall = useCallback(async (targetUser: RemoteUser) => {
        const user = currentUserRef.current
        if (!user) return
        try {
            console.log('[WebRTC] Initiating call to:', targetUser.username, targetUser.socketId)
            setCallStatus(CallStatus.INITIATING)
            setCallState({
                isInCall: false,
                isIncomingCall: false,
                isOutgoingCall: true,
                callType: 'video',
                caller: { username: user.username, socketId: socket.id || '' },
                callee: targetUser,
            })

            const stream = await getUserMedia()
            const pc = createPeerConnection()
            peerConnectionRef.current = pc
            stream.getTracks().forEach(track => pc.addTrack(track, stream))

            // Send both socketId AND username so server can route reliably
            socket.emit(SocketEvent.CALL_INITIATE, {
                ...makeTarget(targetUser),
                callType: 'video',
            })
            console.log('[WebRTC] CALL_INITIATE sent to:', targetUser.username, targetUser.socketId)
            setCallStatus(CallStatus.RINGING)
            toast.success(`Calling ${targetUser.username}...`)
        } catch (error) {
            console.error('[WebRTC] Failed to initiate call:', error)
            toast.error('Failed to access camera/microphone')
            cleanupWebRTC()
        }
    }, [socket, getUserMedia, createPeerConnection, cleanupWebRTC])

    // ─── Accept Call ─────────────────────────────────────────────────────────────
    const acceptCall = useCallback(async () => {
        const cs = callStateRef.current
        if (!cs.isIncomingCall || !cs.caller) return
        try {
            setCallStatus(CallStatus.CONNECTING)
            const stream = await getUserMedia()
            const pc = createPeerConnection()
            peerConnectionRef.current = pc
            stream.getTracks().forEach(track => pc.addTrack(track, stream))
            setCallState(prev => ({ ...prev, isInCall: true, isIncomingCall: false }))
            socket.emit(SocketEvent.CALL_ACCEPTED, makeTarget(cs.caller))
            toast.success('Call accepted')
        } catch (error) {
            console.error('[WebRTC] Failed to accept call:', error)
            toast.error('Failed to access camera/microphone')
            // reject using the ref so we don't need rejectCall in deps
            const caller = callStateRef.current.caller
            if (caller) socket.emit(SocketEvent.CALL_REJECT, makeTarget(caller))
            cleanupWebRTC()
        }
    }, [socket, getUserMedia, createPeerConnection, cleanupWebRTC])

    // ─── Reject Call ─────────────────────────────────────────────────────────────
    const rejectCall = useCallback(() => {
        const caller = callStateRef.current.caller
        if (caller) socket.emit(SocketEvent.CALL_REJECT, makeTarget(caller))
        cleanupWebRTC()
    }, [socket, cleanupWebRTC])

    // ─── End Call ────────────────────────────────────────────────────────────────
    const endCall = useCallback(() => {
        const cs = callStateRef.current
        const target = cs.isOutgoingCall ? cs.callee : cs.caller
        if (target) socket.emit(SocketEvent.CALL_END, makeTarget(target))
        cleanupWebRTC()
    }, [socket, cleanupWebRTC])

    // ─── Toggle Video ────────────────────────────────────────────────────────────
    const toggleVideo = useCallback(() => {
        if (!localStreamRef.current) return
        const track = localStreamRef.current.getVideoTracks()[0]
        if (!track) return
        track.enabled = !track.enabled
        setLocalMediaState(prev => {
            const updated: MediaState = { ...prev, video: !prev.video }
            const cs = callStateRef.current
            const target = cs.isOutgoingCall ? cs.callee : cs.caller
            if (target) socket.emit(SocketEvent.USER_MEDIA_STATE, { targetUserId: target.socketId, mediaState: updated })
            return updated
        })
    }, [socket])

    // ─── Toggle Audio ────────────────────────────────────────────────────────────
    const toggleAudio = useCallback(() => {
        if (!localStreamRef.current) return
        const track = localStreamRef.current.getAudioTracks()[0]
        if (!track) return
        track.enabled = !track.enabled
        setLocalMediaState(prev => {
            const updated: MediaState = { ...prev, audio: !prev.audio }
            const cs = callStateRef.current
            const target = cs.isOutgoingCall ? cs.callee : cs.caller
            if (target) socket.emit(SocketEvent.USER_MEDIA_STATE, { targetUserId: target.socketId, mediaState: updated })
            return updated
        })
    }, [socket])

    // ─── Socket Listeners (registered ONCE) ─────────────────────────────────────
    useEffect(() => {
        const onCallInitiate = ({ from, targetUsername }: { from: RemoteUser; targetUsername?: string; callType: string }) => {
            const myUsername = currentUserRef.current?.username
            console.log('[WebRTC] CALL_INITIATE from:', from.username, '→ target:', targetUsername, '| me:', myUsername, '| status:', callStatusRef.current)

            // If targetUsername is specified and doesn't match me, ignore this broadcast
            if (targetUsername && myUsername && targetUsername !== myUsername) {
                console.log('[WebRTC] Not my call, ignoring')
                return
            }

            if (callStatusRef.current !== CallStatus.IDLE) {
                console.log('[WebRTC] Already in a call, ignoring')
                return
            }

            setCallState({
                isInCall: false,
                isIncomingCall: true,
                isOutgoingCall: false,
                callType: 'video',
                caller: from,
            })
            setCallStatus(CallStatus.RINGING)
            toast.success(`📹 Incoming video call from ${from.username}`)
        }

        // Callee accepted → caller creates offer
        const onCallAccepted = async ({ from }: { from: RemoteUser }) => {
            console.log('[WebRTC] CALL_ACCEPTED from:', from.username)
            const pc = peerConnectionRef.current
            if (!pc || !callStateRef.current.isOutgoingCall) return
            try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                socket.emit(SocketEvent.CALL_OFFER, {
                    ...makeTarget(from),
                    offer,
                    callType: 'video',
                })
                setCallState(prev => ({ ...prev, isInCall: true, isOutgoingCall: false }))
                setCallStatus(CallStatus.CONNECTING)
            } catch (err) {
                console.error('[WebRTC] Failed to create offer:', err)
            }
        }

        // Callee receives offer → sends answer
        const onCallOffer = async ({ from, offer }: { from: RemoteUser; offer: RTCSessionDescriptionInit }) => {
            console.log('[WebRTC] CALL_OFFER from:', from.socketId)
            const pc = peerConnectionRef.current
            if (!pc) return
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                socket.emit(SocketEvent.CALL_ANSWER, {
                    ...makeTarget(from),
                    answer,
                })
            } catch (err) {
                console.error('[WebRTC] Failed to handle offer:', err)
            }
        }

        // Caller receives answer
        const onCallAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
            console.log('[WebRTC] CALL_ANSWER received')
            const pc = peerConnectionRef.current
            if (!pc) return
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
            } catch (err) {
                console.error('[WebRTC] Failed to set answer:', err)
            }
        }

        // ICE candidate exchange
        const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
            const pc = peerConnectionRef.current
            if (!pc || !candidate) return
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (err) {
                console.error('[WebRTC] Failed to add ICE candidate:', err)
            }
        }

        const onCallReject = ({ from }: { from: RemoteUser }) => {
            toast.error(`${from.username} rejected the call`)
            cleanupWebRTC()
        }

        const onCallEnd = ({ from }: { from: RemoteUser }) => {
            toast.success(`Call ended by ${from.username}`)
            cleanupWebRTC()
        }

        const onUserMediaState = ({ mediaState }: { mediaState: MediaState }) => {
            setRemoteMediaState(mediaState)
        }

        socket.on(SocketEvent.CALL_INITIATE, onCallInitiate)
        socket.on(SocketEvent.CALL_ACCEPTED, onCallAccepted)
        socket.on(SocketEvent.CALL_OFFER, onCallOffer)
        socket.on(SocketEvent.CALL_ANSWER, onCallAnswer)
        socket.on(SocketEvent.ICE_CANDIDATE, onIceCandidate)
        socket.on(SocketEvent.CALL_REJECT, onCallReject)
        socket.on(SocketEvent.CALL_END, onCallEnd)
        socket.on(SocketEvent.USER_MEDIA_STATE, onUserMediaState)

        return () => {
            socket.off(SocketEvent.CALL_INITIATE, onCallInitiate)
            socket.off(SocketEvent.CALL_ACCEPTED, onCallAccepted)
            socket.off(SocketEvent.CALL_OFFER, onCallOffer)
            socket.off(SocketEvent.CALL_ANSWER, onCallAnswer)
            socket.off(SocketEvent.ICE_CANDIDATE, onIceCandidate)
            socket.off(SocketEvent.CALL_REJECT, onCallReject)
            socket.off(SocketEvent.CALL_END, onCallEnd)
            socket.off(SocketEvent.USER_MEDIA_STATE, onUserMediaState)
        }
    }, [socket, cleanupWebRTC]) // Stable deps only — handlers use refs for fresh state

    useEffect(() => () => { cleanupWebRTC() }, [cleanupWebRTC])

    return (
        <WebRTCContext.Provider value={{
            callState,
            callStatus,
            localMediaState,
            remoteMediaState,
            initiateCall,
            acceptCall,
            rejectCall,
            endCall,
            toggleVideo,
            toggleAudio,
            isVideoEnabled,
            isAudioEnabled,
        }}>
            {children}
        </WebRTCContext.Provider>
    )
}

export default WebRTCProvider
