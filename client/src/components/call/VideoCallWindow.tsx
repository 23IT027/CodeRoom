import React, { useRef, useEffect, useCallback, useState } from 'react'
import { 
    FiPhoneOff, 
    FiMic, 
    FiMicOff, 
    FiVideo, 
    FiVideoOff, 
    FiMinimize2, 
    FiMaximize2, 
    FiMove 
} from 'react-icons/fi'
import { useWebRTC } from '@/context/WebRTCContext'
import { CallStatus } from '@/types/webrtc'

const VideoCallWindow: React.FC = () => {
    const { 
        callState, 
        callStatus, 
        localStream,
        endCall, 
        toggleVideo, 
        toggleAudio, 
        isVideoEnabled, 
        isAudioEnabled,
        localMediaState,
        remoteMediaState
    } = useWebRTC()
    
    const [isMinimized, setIsMinimized] = useState<boolean>(false)
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
    const [isDragging, setIsDragging] = useState<boolean>(false)

    const windowRef = useRef<HTMLDivElement | null>(null)
    const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null)

    const localVideoRef = useRef<HTMLVideoElement | null>(null)
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

    const activeLocalStream = localStream || callState.localStream
    const activeRemoteStream = callState.remoteStream

    // Reset minimized state when call terminates
    useEffect(() => {
        if (callStatus === CallStatus.IDLE) {
            setIsMinimized(false)
            setDragPosition(null)
        }
    }, [callStatus])

    // Dragging logic for minimized floating window
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isMinimized || !windowRef.current) return
        
        // Prevent drag on button clicks
        const target = e.target as HTMLElement
        if (target.closest('button')) return

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

        const rect = windowRef.current.getBoundingClientRect()
        dragStartRef.current = {
            mouseX: clientX,
            mouseY: clientY,
            elemX: rect.left,
            elemY: rect.top,
        }
        setIsDragging(true)
    }

    useEffect(() => {
        if (!isDragging) return

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!dragStartRef.current || !windowRef.current) return
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

            const deltaX = clientX - dragStartRef.current.mouseX
            const deltaY = clientY - dragStartRef.current.mouseY

            let newX = dragStartRef.current.elemX + deltaX
            let newY = dragStartRef.current.elemY + deltaY

            const elWidth = windowRef.current.offsetWidth
            const elHeight = windowRef.current.offsetHeight

            // Clamp inside viewport
            newX = Math.max(10, Math.min(newX, window.innerWidth - elWidth - 10))
            newY = Math.max(10, Math.min(newY, window.innerHeight - elHeight - 10))

            setDragPosition({ x: newX, y: newY })
        }

        const handleEnd = () => {
            setIsDragging(false)
            dragStartRef.current = null
        }

        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleEnd)
        window.addEventListener('touchmove', handleMove, { passive: false })
        window.addEventListener('touchend', handleEnd)

        return () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleEnd)
            window.removeEventListener('touchmove', handleMove)
            window.removeEventListener('touchend', handleEnd)
        }
    }, [isDragging])

    // Re-clamp position if browser window resizes
    useEffect(() => {
        const handleResize = () => {
            if (dragPosition && windowRef.current) {
                const elWidth = windowRef.current.offsetWidth
                const elHeight = windowRef.current.offsetHeight
                const clampedX = Math.max(10, Math.min(dragPosition.x, window.innerWidth - elWidth - 10))
                const clampedY = Math.max(10, Math.min(dragPosition.y, window.innerHeight - elHeight - 10))
                if (clampedX !== dragPosition.x || clampedY !== dragPosition.y) {
                    setDragPosition({ x: clampedX, y: clampedY })
                }
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [dragPosition])

    // Robust stream attachment helper: sets DOM properties and triggers play
    const attachStream = useCallback((
        videoEl: HTMLVideoElement | null, 
        stream: MediaStream | null | undefined, 
        isMuted: boolean
    ) => {
        if (!videoEl) return
        if (isMuted) {
            videoEl.muted = true
            videoEl.defaultMuted = true
        }
        if (stream && videoEl.srcObject !== stream) {
            videoEl.srcObject = stream
        }
        if (stream) {
            videoEl.play().catch((err) => {
                console.warn('[WebRTC] Stream play pending/error:', err)
            })
        }
    }, [])

    // Callback refs ensure stream is attached immediately as soon as DOM element mounts
    const setLocalVideoRef = useCallback((node: HTMLVideoElement | null) => {
        localVideoRef.current = node
        if (node && activeLocalStream) {
            attachStream(node, activeLocalStream, true)
        }
    }, [activeLocalStream, attachStream])

    const setRemoteVideoRef = useCallback((node: HTMLVideoElement | null) => {
        remoteVideoRef.current = node
        if (node && activeRemoteStream) {
            attachStream(node, activeRemoteStream, false)
        }
    }, [activeRemoteStream, attachStream])

    // Stream updates effect with event listeners for metadata & canplay
    useEffect(() => {
        const node = localVideoRef.current
        if (!node || !activeLocalStream) return

        attachStream(node, activeLocalStream, true)

        const handleCanPlay = () => {
            node.muted = true
            node.play().catch(() => {})
        }

        node.addEventListener('loadedmetadata', handleCanPlay)
        node.addEventListener('canplay', handleCanPlay)

        return () => {
            node.removeEventListener('loadedmetadata', handleCanPlay)
            node.removeEventListener('canplay', handleCanPlay)
        }
    }, [activeLocalStream, localMediaState.video, attachStream])

    useEffect(() => {
        const node = remoteVideoRef.current
        if (!node || !activeRemoteStream) return

        attachStream(node, activeRemoteStream, false)

        const handleCanPlay = () => {
            node.play().catch(() => {})
        }

        node.addEventListener('loadedmetadata', handleCanPlay)
        node.addEventListener('canplay', handleCanPlay)

        return () => {
            node.removeEventListener('loadedmetadata', handleCanPlay)
            node.removeEventListener('canplay', handleCanPlay)
        }
    }, [activeRemoteStream, remoteMediaState.video, attachStream])

    // Continuous self-healing watchdog: checks every 1.5s to ensure videos are playing
    useEffect(() => {
        const interval = setInterval(() => {
            if (localVideoRef.current && activeLocalStream) {
                if (localVideoRef.current.srcObject !== activeLocalStream) {
                    localVideoRef.current.srcObject = activeLocalStream
                }
                if (localMediaState.video && localVideoRef.current.paused) {
                    localVideoRef.current.muted = true
                    localVideoRef.current.play().catch(() => {})
                }
            }
            if (remoteVideoRef.current && activeRemoteStream) {
                if (remoteVideoRef.current.srcObject !== activeRemoteStream) {
                    remoteVideoRef.current.srcObject = activeRemoteStream
                }
                if (remoteMediaState.video && remoteVideoRef.current.paused) {
                    remoteVideoRef.current.play().catch(() => {})
                }
            }
        }, 1500)

        return () => clearInterval(interval)
    }, [activeLocalStream, activeRemoteStream, localMediaState.video, remoteMediaState.video])

    // Show when in a call OR while connecting (CONNECTING/RINGING phases after accept)
    if (
        callStatus === CallStatus.IDLE ||
        (!callState.isInCall && callStatus !== CallStatus.CONNECTING)
    ) {
        return null
    }

    const isConnected = callStatus === CallStatus.CONNECTED
    const isConnecting = callStatus === CallStatus.CONNECTING
    const otherUsername = callState.isOutgoingCall 
        ? callState.callee?.username 
        : callState.caller?.username

    return (
        <div 
            ref={windowRef}
            style={
                isMinimized && dragPosition 
                    ? { left: `${dragPosition.x}px`, top: `${dragPosition.y}px` } 
                    : undefined
            }
            className={
                isMinimized
                    ? `fixed z-50 flex flex-col rounded-2xl border border-primary/40 bg-[#161820]/95 backdrop-blur-md shadow-2xl overflow-hidden select-none transition-shadow ${
                        !dragPosition ? 'bottom-5 right-5' : ''
                      } w-80 sm:w-96 ${isDragging ? 'shadow-primary/30 cursor-grabbing' : 'shadow-2xl'}`
                    : 'fixed inset-0 z-50 flex flex-col bg-black/95 transition-all'
            }
        >
            {/* Header */}
            {isMinimized ? (
                /* Minimized Floating Header */
                <div 
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-[#12141a] border-b border-gray-800/80 cursor-grab active:cursor-grabbing"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <FiMove className="h-3.5 w-3.5 text-gray-400 shrink-0" title="Drag to reposition" />
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                            <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                                {otherUsername}
                            </span>
                        </div>
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono shrink-0">
                            {isConnected ? 'LIVE' : 'WAIT'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => setIsMinimized(false)}
                            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-md transition-colors"
                            title="Expand to Full Screen"
                        >
                            <FiMaximize2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={endCall}
                            className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-md transition-colors"
                            title="End Call"
                        >
                            <FiPhoneOff className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            ) : (
                /* Fullscreen Header */
                <div className="flex items-center justify-between bg-dark px-6 py-4 border-b border-gray-800">
                    <div className="text-light">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                            <h2 className="text-lg font-bold text-white tracking-wide">
                                {otherUsername}
                            </h2>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isConnected 
                                ? 'Connected • Live Call' 
                                : isConnecting 
                                    ? 'Connecting...' 
                                    : 'In Call'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="flex items-center gap-2 rounded-lg bg-darkHover hover:bg-gray-700 px-3.5 py-2 text-xs md:text-sm font-semibold text-primary border border-primary/30 transition-all hover:scale-105 shadow"
                            title="Minimize to floating window to code & draw together"
                        >
                            <FiMinimize2 className="h-4 w-4" />
                            <span>Minimize to PiP</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Video Container (both modes share the same video elements to prevent stream disruption) */}
            <div className={isMinimized ? 'relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center' : 'flex-1 flex items-center justify-center p-2 md:p-6 overflow-hidden'}>
                <div className={isMinimized ? 'relative w-full h-full bg-black flex items-center justify-center' : 'relative w-full max-w-5xl aspect-video bg-black rounded-lg flex items-center justify-center shadow-inner'}>
                    <video
                        ref={setRemoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full ${isMinimized ? 'object-cover' : 'object-contain rounded-lg'}`}
                        style={{ display: remoteMediaState.video ? 'block' : 'none' }}
                    />
                    {!remoteMediaState.video && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
                            <div className="text-center px-4">
                                <div className={`flex items-center justify-center rounded-full bg-primary font-bold text-dark mx-auto ${isMinimized ? 'h-12 w-12 text-xl mb-1' : 'h-24 w-24 text-3xl mb-4'}`}>
                                    {otherUsername?.charAt(0).toUpperCase()}
                                </div>
                                <p className={`text-light font-medium ${isMinimized ? 'text-xs truncate max-w-[140px]' : 'text-lg mb-1'}`}>
                                    {otherUsername}
                                </p>
                                <p className={`text-gray-400 ${isMinimized ? 'text-[10px]' : 'text-sm'}`}>Video is off</p>
                            </div>
                        </div>
                    )}
                    {!remoteMediaState.audio && (
                        <div className={`absolute ${isMinimized ? 'top-2 left-2' : 'top-3 left-3'}`}>
                            <div className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full shadow">
                                <FiMicOff className={`${isMinimized ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
                                <span className={`text-white ${isMinimized ? 'text-[10px]' : 'text-xs md:text-sm'}`}>Muted</span>
                            </div>
                        </div>
                    )}

                    {/* Picture-in-Picture Local User Video Box */}
                    <div 
                        className={`absolute rounded-md overflow-hidden border-2 border-primary bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-lg cursor-pointer transition-all ${
                            isMinimized 
                                ? 'bottom-2 right-2 w-20 h-14 sm:w-24 sm:h-16' 
                                : 'bottom-3 right-3 w-28 h-20 md:w-40 md:h-28'
                        }`}
                        title="Your video preview (click to refresh if needed)"
                        onClick={() => {
                            if (localVideoRef.current && activeLocalStream) {
                                localVideoRef.current.muted = true
                                localVideoRef.current.srcObject = activeLocalStream
                                localVideoRef.current.play().catch(() => {})
                            }
                        }}
                    >
                        {/* Always keep the video element mounted to prevent hardware decode teardown */}
                        <video
                            ref={setLocalVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`h-full w-full object-cover ${localMediaState.video ? 'block' : 'hidden'}`}
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        {!localMediaState.video && (
                            <div className="flex h-full w-full items-center justify-center bg-gray-800">
                                <FiVideoOff className={`${isMinimized ? 'h-4 w-4' : 'h-6 w-6'} text-gray-400`} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            {isMinimized ? (
                /* Compact Bottom Bar in Minimized Mode */
                <div className="flex items-center justify-center gap-3.5 px-3 py-2 bg-[#12141a] border-t border-gray-800">
                    <button
                        onClick={toggleAudio}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-105 ${
                            isAudioEnabled ? 'bg-darkHover text-white hover:bg-gray-700' : 'bg-red-500 text-white'
                        }`}
                        title={isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
                    >
                        {isAudioEnabled ? <FiMic className="h-3.5 w-3.5" /> : <FiMicOff className="h-3.5 w-3.5" />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-105 ${
                            isVideoEnabled ? 'bg-darkHover text-white hover:bg-gray-700' : 'bg-red-500 text-white'
                        }`}
                        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    >
                        {isVideoEnabled ? <FiVideo className="h-3.5 w-3.5" /> : <FiVideoOff className="h-3.5 w-3.5" />}
                    </button>

                    <button
                        onClick={() => setIsMinimized(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 transition-all hover:scale-105"
                        title="Expand to Full Screen"
                    >
                        <FiMaximize2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={endCall}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-all hover:scale-105"
                        title="End Call"
                    >
                        <FiPhoneOff className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                /* Fullscreen Controls Bar */
                <div className="flex flex-wrap items-center justify-center gap-6 bg-dark p-4 md:p-6 border-t border-gray-800">
                    <button
                        onClick={toggleAudio}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
                            isAudioEnabled 
                                ? 'bg-darkHover text-white' 
                                : 'bg-red-500 text-white'
                        }`}
                        title={isAudioEnabled ? 'Mute' : 'Unmute'}
                    >
                        {isAudioEnabled ? (
                            <FiMic className="h-5 w-5" />
                        ) : (
                            <FiMicOff className="h-5 w-5" />
                        )}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
                            isVideoEnabled 
                                ? 'bg-darkHover text-white' 
                                : 'bg-red-500 text-white'
                        }`}
                        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    >
                        {isVideoEnabled ? (
                            <FiVideo className="h-5 w-5" />
                        ) : (
                            <FiVideoOff className="h-5 w-5" />
                        )}
                    </button>

                    {/* Minimize to PiP */}
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 transition-all hover:scale-105"
                        title="Minimize to floating window (code or draw together)"
                    >
                        <FiMinimize2 className="h-5 w-5" />
                    </button>

                    {/* End Call */}
                    <button
                        onClick={endCall}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-600 hover:scale-105"
                        title="End Call"
                    >
                        <FiPhoneOff className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    )
}

export default VideoCallWindow

