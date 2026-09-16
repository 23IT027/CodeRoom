import React, { useRef, useEffect } from 'react'
import { FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi'
import { useWebRTC } from '@/context/WebRTCContext'
import { CallStatus } from '@/types/webrtc'

const VideoCallWindow: React.FC = () => {
    const { 
        callState, 
        callStatus, 
        endCall, 
        toggleVideo, 
        toggleAudio, 
        isVideoEnabled, 
        isAudioEnabled,
        localMediaState,
        remoteMediaState
    } = useWebRTC()
    
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)

    // Set up video streams
    useEffect(() => {
        if (localVideoRef.current && callState.localStream) {
            localVideoRef.current.srcObject = callState.localStream
        }
    }, [callState.localStream])

    useEffect(() => {
        if (remoteVideoRef.current && callState.remoteStream) {
            remoteVideoRef.current.srcObject = callState.remoteStream
        }
    }, [callState.remoteStream])

    // Only show when in a call
    if (!callState.isInCall || callStatus === CallStatus.IDLE) {
        return null
    }

    const isConnected = callStatus === CallStatus.CONNECTED
    const isConnecting = callStatus === CallStatus.CONNECTING

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            {/* Header */}
            <div className="flex items-center justify-between bg-dark p-4">
                <div className="text-light">
                    <h2 className="text-lg font-semibold">
                        {callState.isOutgoingCall 
                            ? callState.callee?.username 
                            : callState.caller?.username
                        }
                    </h2>
                    <p className="text-sm text-gray-400">
                        {isConnected 
                            ? 'Connected' 
                            : isConnecting 
                                ? 'Connecting...' 
                                : 'In Call'
                        }
                    </p>
                </div>
                <div className="text-primary">
                    <FiVideo className="h-6 w-6" />
                </div>
            </div>

            {/* Video Container */}
            <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-hidden">
                <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg flex items-center justify-center shadow-inner">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain rounded-lg"
                        style={{ display: remoteMediaState.video ? 'block' : 'none' }}
                    />
                    {!remoteMediaState.video && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
                            <div className="text-center px-4">
                                <div className="mb-4 flex justify-center">
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-dark">
                                        {(callState.isOutgoingCall 
                                            ? callState.callee?.username 
                                            : callState.caller?.username
                                        )?.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <p className="text-light text-lg mb-1">
                                    {callState.isOutgoingCall 
                                        ? callState.callee?.username 
                                        : callState.caller?.username
                                    }
                                </p>
                                <p className="text-gray-400 text-sm">Video is off</p>
                            </div>
                        </div>
                    )}
                    {!remoteMediaState.audio && (
                        <div className="absolute top-3 left-3">
                            <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full shadow">
                                <FiMicOff className="h-4 w-4 text-white" />
                                <span className="text-white text-xs md:text-sm">Muted</span>
                            </div>
                        </div>
                    )}
                    <div className="absolute bottom-3 right-3 w-28 h-20 md:w-40 md:h-28 rounded-md overflow-hidden border-2 border-primary bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        {localMediaState.video ? (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="h-full w-full object-cover"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-800">
                                <FiVideoOff className="h-6 w-6 text-gray-400" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-6 bg-dark p-4 md:p-6">
                {/* Toggle Audio */}
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

                {/* Toggle Video */}
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

                {/* End Call */}
                <button
                    onClick={endCall}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-600 hover:scale-105"
                    title="End Call"
                >
                    <FiPhoneOff className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}

export default VideoCallWindow
