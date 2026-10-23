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
    localStream: MediaStream | null
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
// Uses multiple reliable public STUN/TURN servers as fallbacks
const webRTCConfig: WebRTCConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.voip.blackberry.com:3478' },
        {
            urls: [
                'turn:global.relay.metered.ca:80',
                'turn:global.relay.metered.ca:443',
                'turn:global.relay.metered.ca:443?transport=tcp',
                'turns:global.relay.metered.ca:443',
            ],
            username: 'e499a98a2a36b8b2c7b77c0d',
            credential: 'TxOXSXjcmpV2k+ot',
        },
        {
            urls: [
                'turn:relay1.expressturn.com:3478',
            ],
            username: 'efIBGOGBIPBMYFQGOM',
            credential: 'qrOkEIriNqFDu2Ek',
        },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
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
    // Buffer ICE candidates that arrive before remote description is set
    const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([])
    const remoteDescriptionSetRef = useRef<boolean>(false)
    const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isVideoEnabled = localMediaState.video
    const isAudioEnabled = localMediaState.audio

    // ─── Cleanup ────────────────────────────────────────────────────────────────
    const cleanupWebRTC = useCallback(() => {
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
            connectionTimeoutRef.current = null
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop())
            localStreamRef.current = null
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        iceCandidateBufferRef.current = []
        remoteDescriptionSetRef.current = false
        setCallState({ isInCall: false, isIncomingCall: false, isOutgoingCall: false, callType: 'video' })
        setCallStatus(CallStatus.IDLE)
        setLocalMediaState({ video: true, audio: true })
        setRemoteMediaState({ video: true, audio: true })
    }, [])

    // ─── Create Peer Connection ──────────────────────────────────────────────────
    const createPeerConnection = useCallback(() => {
        remoteDescriptionSetRef.current = false
        iceCandidateBufferRef.current = []

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
            const stream = event.streams[0] || new MediaStream([event.track])
            setCallState(prev => ({ ...prev, remoteStream: stream }))
        }

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState)
            if (pc.connectionState === 'connected') {
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current)
                    connectionTimeoutRef.current = null
                }
                setCallStatus(CallStatus.CONNECTED)
                setCallState(prev => ({ ...prev, isInCall: true }))
            } else if (pc.connectionState === 'failed') {
                toast.error('Call connection failed — network issue or TURN server unavailable')
                cleanupWebRTC()
            }
        }

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState)
            if (pc.iceConnectionState === 'failed') {
                console.warn('[WebRTC] ICE failed, attempting restart...')
                pc.restartIce()
            }
        }

        // Start connection timeout (30s)
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = setTimeout(() => {
            if (peerConnectionRef.current?.connectionState !== 'connected') {
                console.warn('[WebRTC] Connection timed out after 30s')
                toast.error('Call timed out — could not establish connection')
                cleanupWebRTC()
            }
        }, 30000)

        return pc
    }, [socket, cleanupWebRTC])

    // ─── Get User Media (video+audio, fallback to audio-only) ───────────────────
    const getUserMedia = useCallback(async () => {
        let stream: MediaStream
        try {
            // Try with ideal constraints first (better resolution and framerate)
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
            })
        } catch {
            try {
                // Fallback to basic constraints
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            } catch (videoErr: unknown) {
                const name = (videoErr as { name?: string }).name
                if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                    // No camera — fall back to audio only
                    toast('No camera found — joining with audio only 🎙️', { icon: '⚠️' })
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                    } catch (audioErr: unknown) {
                        const aName = (audioErr as { name?: string }).name
                        if (aName === 'NotAllowedError' || aName === 'PermissionDeniedError') {
                            throw new Error('PERMISSION_DENIED')
                        }
                        throw audioErr
                    }
                } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    throw new Error('PERMISSION_DENIED')
                } else if (name === 'NotReadableError' || name === 'TrackStartError') {
                    throw new Error('DEVICE_IN_USE')
                } else {
                    throw videoErr
                }
            }
        }

        // Guarantee all tracks are enabled and active
        const hasVideo = stream.getVideoTracks().length > 0
        const hasAudio = stream.getAudioTracks().length > 0
        stream.getVideoTracks().forEach(track => { track.enabled = true })
        stream.getAudioTracks().forEach(track => { track.enabled = true })

        setLocalMediaState({ video: hasVideo, audio: hasAudio })
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
            setCallState(prev => ({ ...prev, localStream: stream }))

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
            const msg = (error as Error).message
            if (msg === 'PERMISSION_DENIED') {
                toast.error('Camera/microphone access denied. Click the 🔒 icon in your browser address bar and allow permissions, then try again.')
            } else if (msg === 'DEVICE_IN_USE') {
                toast.error('Camera or microphone is already in use by another app. Close other video apps and try again.')
            } else {
                toast.error('Could not access camera/microphone. Make sure devices are connected and browser has permission.')
            }
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
            setCallState(prev => ({ ...prev, isInCall: true, isIncomingCall: false, localStream: stream }))
            socket.emit(SocketEvent.CALL_ACCEPTED, makeTarget(cs.caller))
            toast.success('Call accepted')
        } catch (error) {
            console.error('[WebRTC] Failed to accept call:', error)
            const msg = (error as Error).message
            if (msg === 'PERMISSION_DENIED') {
                toast.error('Camera/microphone access denied — allow permissions in browser and try again.')
            } else if (msg === 'DEVICE_IN_USE') {
                toast.error('Camera is already in use by another app. Close it and try again.')
            } else {
                toast.error('Could not access camera/microphone.')
            }
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
        const newEnabled = !track.enabled
        track.enabled = newEnabled
        setLocalMediaState(prev => {
            const updated: MediaState = { ...prev, video: newEnabled }
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
        const newEnabled = !track.enabled
        track.enabled = newEnabled
        setLocalMediaState(prev => {
            const updated: MediaState = { ...prev, audio: newEnabled }
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
                const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                })
                await pc.setLocalDescription(offer)
                socket.emit(SocketEvent.CALL_OFFER, {
                    ...makeTarget(from),
                    offer: pc.localDescription, // use finalised local description
                    callType: 'video',
                })
                // Keep isOutgoingCall=true until fully connected so we can route ICE candidates
                setCallState(prev => ({ ...prev, isInCall: true }))
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
                remoteDescriptionSetRef.current = true

                // Flush buffered ICE candidates that arrived before remote description
                for (const buffered of iceCandidateBufferRef.current) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(buffered)) } catch {}
                }
                iceCandidateBufferRef.current = []

                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                socket.emit(SocketEvent.CALL_ANSWER, {
                    ...makeTarget(from),
                    answer: pc.localDescription,
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
                remoteDescriptionSetRef.current = true

                // Flush buffered ICE candidates
                for (const buffered of iceCandidateBufferRef.current) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(buffered)) } catch {}
                }
                iceCandidateBufferRef.current = []
            } catch (err) {
                console.error('[WebRTC] Failed to set answer:', err)
            }
        }

        // ICE candidate exchange — buffer if remote description not yet set
        const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
            const pc = peerConnectionRef.current
            if (!pc || !candidate) return
            if (!remoteDescriptionSetRef.current) {
                // Buffer until remote description is applied
                iceCandidateBufferRef.current.push(candidate)
                return
            }
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
            localStream: callState.localStream || localStreamRef.current,
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
