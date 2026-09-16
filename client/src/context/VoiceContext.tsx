import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useSocket } from './SocketContext'
import { useAppContext } from './AppContext'

// Voice Chat specific types
export interface VoiceState {
    isConnected: boolean
    isMuted: boolean
    isDeafened: boolean
    localStream?: MediaStream
    remoteStreams: Map<string, MediaStream>
    participants: Map<string, VoiceParticipant>
}

export interface VoiceParticipant {
    socketId: string
    username: string
    isMuted: boolean
    isConnected: boolean
    audioLevel: number
}

interface VoiceContextType {
    voiceState: VoiceState
    joinVoiceChannel: () => Promise<void>
    leaveVoiceChannel: () => void
    toggleMute: () => void
    toggleDeafen: () => void
    getParticipantAudioLevel: (socketId: string) => number
}

const VoiceContext = createContext<VoiceContextType | null>(null)

export const useVoice = (): VoiceContextType => {
    const context = useContext(VoiceContext)
    if (!context) {
        throw new Error('useVoice must be used within a VoiceProvider')
    }
    return context
}

// WebRTC configuration with both STUN and TURN servers for cross-network support
const voiceRTCConfig: RTCConfiguration = {
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

const VoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { socket } = useSocket()
    const { currentUser } = useAppContext()

    const [voiceState, setVoiceState] = useState<VoiceState>({
        isConnected: false,
        isMuted: false,
        isDeafened: false,
        remoteStreams: new Map(),
        participants: new Map(),
    })

    const localStreamRef = useRef<MediaStream | null>(null)
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
    const audioLevelsRef = useRef<Map<string, number>>(new Map())

    // Keep a ref to isConnected so socket handlers can read it without stale closures
    const isConnectedRef = useRef(false)

    // ─── Cleanup one peer ────────────────────────────────────────────────────────
    const cleanupPeer = useCallback((socketId: string) => {
        // Close peer connection
        const pc = peerConnectionsRef.current.get(socketId)
        if (pc) {
            pc.close()
            peerConnectionsRef.current.delete(socketId)
        }

        // Remove and stop audio element
        const audio = audioElementsRef.current.get(socketId)
        if (audio) {
            audio.srcObject = null
            audio.pause()
            if (audio.parentNode) audio.parentNode.removeChild(audio)
            audioElementsRef.current.delete(socketId)
        }

        audioLevelsRef.current.delete(socketId)

        setVoiceState(prev => {
            const newParticipants = new Map(prev.participants)
            const newRemoteStreams = new Map(prev.remoteStreams)
            newParticipants.delete(socketId)
            newRemoteStreams.delete(socketId)
            return { ...prev, participants: newParticipants, remoteStreams: newRemoteStreams }
        })
    }, [])

    // ─── Cleanup all voice connections ───────────────────────────────────────────
    const cleanupVoiceConnections = useCallback(() => {
        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop())
            localStreamRef.current = null
        }

        // Close all peer connections and remove all audio elements
        peerConnectionsRef.current.forEach((pc, socketId) => {
            pc.close()
            const audio = audioElementsRef.current.get(socketId)
            if (audio) {
                audio.srcObject = null
                audio.pause()
                if (audio.parentNode) audio.parentNode.removeChild(audio)
            }
        })
        peerConnectionsRef.current.clear()
        audioElementsRef.current.clear()
        audioLevelsRef.current.clear()

        isConnectedRef.current = false

        setVoiceState({
            isConnected: false,
            isMuted: false,
            isDeafened: false,
            localStream: undefined,
            remoteStreams: new Map(),
            participants: new Map(),
        })
    }, [])

    // ─── Create peer connection for a user ───────────────────────────────────────
    const createPeerConnection = useCallback((socketId: string, isInitiator: boolean = false) => {
        // Clean up any existing connection first
        const existing = peerConnectionsRef.current.get(socketId)
        if (existing) {
            existing.close()
            peerConnectionsRef.current.delete(socketId)
        }

        const pc = new RTCPeerConnection(voiceRTCConfig)

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('voice-ice-candidate', {
                    targetSocketId: socketId,
                    candidate: event.candidate,
                })
            }
        }

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0]

            setVoiceState(prev => {
                const newRemoteStreams = new Map(prev.remoteStreams)
                newRemoteStreams.set(socketId, remoteStream)
                return { ...prev, remoteStreams: newRemoteStreams }
            })

            // Manage audio element via ref so it can be cleaned up reliably
            let audio = audioElementsRef.current.get(socketId)
            if (!audio) {
                audio = document.createElement('audio')
                audio.setAttribute('playsinline', 'true')
                audio.autoplay = true
                document.body.appendChild(audio)
                audioElementsRef.current.set(socketId, audio)
            }
            audio.srcObject = remoteStream
        }

        pc.onconnectionstatechange = () => {
            console.log(`[Voice] Connection state with ${socketId}:`, pc.connectionState)
            if (pc.connectionState === 'connected') {
                setVoiceState(prev => {
                    const newParticipants = new Map(prev.participants)
                    const participant = newParticipants.get(socketId)
                    if (participant) {
                        newParticipants.set(socketId, { ...participant, isConnected: true })
                    }
                    return { ...prev, participants: newParticipants }
                })
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                cleanupPeer(socketId)
            }
        }

        // Add local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!)
            })
        }

        peerConnectionsRef.current.set(socketId, pc)

        // If we're the initiator, create and send the offer
        if (isInitiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer).then(() => offer))
                .then(offer => {
                    socket.emit('voice-offer', { targetSocketId: socketId, offer })
                })
                .catch(err => console.error('[Voice] Failed to create offer:', err))
        }

        return pc
    }, [socket, cleanupPeer])

    // ─── Join Voice Channel ───────────────────────────────────────────────────────
    const joinVoiceChannel = useCallback(async () => {
        if (isConnectedRef.current) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            })

            localStreamRef.current = stream
            isConnectedRef.current = true

            setVoiceState(prev => ({
                ...prev,
                isConnected: true,
                localStream: stream,
            }))

            // Notify others we joined — they will initiate peer connections to us
            socket.emit('voice-join', { username: currentUser?.username })
            toast.success('Joined voice channel')
        } catch (error) {
            console.error('[Voice] Failed to join voice channel:', error)
            toast.error('Failed to access microphone')
        }
    }, [socket, currentUser])

    // ─── Leave Voice Channel ──────────────────────────────────────────────────────
    const leaveVoiceChannel = useCallback(() => {
        socket.emit('voice-leave')
        cleanupVoiceConnections()
        toast.success('Left voice channel')
    }, [socket, cleanupVoiceConnections])

    // ─── Toggle Mute ─────────────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (!audioTrack) return

        audioTrack.enabled = !audioTrack.enabled
        const newMutedState = !audioTrack.enabled

        setVoiceState(prev => ({ ...prev, isMuted: newMutedState }))
        socket.emit('voice-mute-state', { isMuted: newMutedState })
        toast.success(newMutedState ? 'Microphone muted' : 'Microphone unmuted')
    }, [socket])

    // ─── Toggle Deafen ───────────────────────────────────────────────────────────
    const toggleDeafen = useCallback(() => {
        setVoiceState(prev => {
            const newDeafenState = !prev.isDeafened
            audioElementsRef.current.forEach(audio => {
                audio.muted = newDeafenState
            })
            toast.success(newDeafenState ? 'Deafened' : 'Undeafened')
            return { ...prev, isDeafened: newDeafenState }
        })
    }, [])

    // ─── Get Participant Audio Level ─────────────────────────────────────────────
    const getParticipantAudioLevel = useCallback((socketId: string) => {
        return audioLevelsRef.current.get(socketId) || 0
    }, [])

    // ─── Socket Event Handlers (registered ONCE — use refs for fresh state) ───────
    useEffect(() => {
        const onVoiceUserJoined = ({ user }: { user: { socketId: string; username: string } }) => {
            // Only respond if we are in the voice channel
            if (!isConnectedRef.current) return

            setVoiceState(prev => {
                const newParticipants = new Map(prev.participants)
                newParticipants.set(user.socketId, {
                    socketId: user.socketId,
                    username: user.username,
                    isMuted: false,
                    isConnected: false,
                    audioLevel: 0,
                })
                return { ...prev, participants: newParticipants }
            })

            // We are the existing user — initiate the connection to the newcomer
            createPeerConnection(user.socketId, true)
        }

        const onVoiceUserLeft = ({ socketId }: { socketId: string }) => {
            cleanupPeer(socketId)
        }

        const onVoiceOffer = async ({ fromSocketId, offer }: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
            if (!isConnectedRef.current) return

            // Add participant entry if not yet present
            setVoiceState(prev => {
                if (prev.participants.has(fromSocketId)) return prev
                const newParticipants = new Map(prev.participants)
                newParticipants.set(fromSocketId, {
                    socketId: fromSocketId,
                    username: fromSocketId, // will be updated if we have user info
                    isMuted: false,
                    isConnected: false,
                    audioLevel: 0,
                })
                return { ...prev, participants: newParticipants }
            })

            const pc = createPeerConnection(fromSocketId, false)
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                socket.emit('voice-answer', { targetSocketId: fromSocketId, answer })
            } catch (err) {
                console.error('[Voice] Failed to handle offer:', err)
            }
        }

        const onVoiceAnswer = async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
            const pc = peerConnectionsRef.current.get(fromSocketId)
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer))
                } catch (err) {
                    console.error('[Voice] Failed to set answer:', err)
                }
            }
        }

        const onVoiceIceCandidate = async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
            const pc = peerConnectionsRef.current.get(fromSocketId)
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (err) {
                    console.error('[Voice] Failed to add ICE candidate:', err)
                }
            }
        }

        const onVoiceMuteState = ({ fromSocketId, isMuted }: { fromSocketId: string; isMuted: boolean }) => {
            setVoiceState(prev => {
                const newParticipants = new Map(prev.participants)
                const participant = newParticipants.get(fromSocketId)
                if (participant) {
                    newParticipants.set(fromSocketId, { ...participant, isMuted })
                }
                return { ...prev, participants: newParticipants }
            })
        }

        socket.on('voice-user-joined', onVoiceUserJoined)
        socket.on('voice-user-left', onVoiceUserLeft)
        socket.on('voice-offer', onVoiceOffer)
        socket.on('voice-answer', onVoiceAnswer)
        socket.on('voice-ice-candidate', onVoiceIceCandidate)
        socket.on('voice-mute-state', onVoiceMuteState)

        return () => {
            socket.off('voice-user-joined', onVoiceUserJoined)
            socket.off('voice-user-left', onVoiceUserLeft)
            socket.off('voice-offer', onVoiceOffer)
            socket.off('voice-answer', onVoiceAnswer)
            socket.off('voice-ice-candidate', onVoiceIceCandidate)
            socket.off('voice-mute-state', onVoiceMuteState)
        }
    }, [socket, createPeerConnection, cleanupPeer]) // stable deps only — isConnectedRef is a ref

    // ─── Cleanup on unmount ───────────────────────────────────────────────────────
    useEffect(() => {
        return () => { cleanupVoiceConnections() }
    }, [cleanupVoiceConnections])

    const value: VoiceContextType = {
        voiceState,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
        toggleDeafen,
        getParticipantAudioLevel,
    }

    return (
        <VoiceContext.Provider value={value}>
            {children}
        </VoiceContext.Provider>
    )
}

export default VoiceProvider
