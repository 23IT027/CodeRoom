import React from 'react'
import { FiMic, FiMicOff, FiHeadphones, FiVolumeX, FiPhone, FiPhoneOff } from 'react-icons/fi'
import { useVoice } from '@/context/VoiceContext'

const VoiceControls: React.FC = () => {
    const {
        voiceState,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
        toggleDeafen,
    } = useVoice()

    const { isConnected, isMuted, isDeafened, participants } = voiceState
    const participantCount = participants.size

    return (
        <div className="flex flex-col gap-3 p-4 bg-darkHover rounded-lg border border-dark">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FiHeadphones className="h-5 w-5 text-primary" />
                    <span className="text-light font-medium">Voice Channel</span>
                </div>
                <div className="text-sm text-gray-400">
                    {participantCount + (isConnected ? 1 : 0)} connected
                </div>
            </div>

            {/* Connection Status */}
            <div className={`px-3 py-2 rounded-lg text-sm ${
                isConnected 
                    ? 'bg-green-900/30 text-green-400 border border-green-700/30' 
                    : 'bg-gray-800 text-gray-400'
            }`}>
                {isConnected ? '🔊 Connected to voice' : '🔇 Not connected'}
            </div>

            {/* Voice Controls */}
            <div className="flex gap-2">
                {/* Join/Leave Voice */}
                <button
                    onClick={isConnected ? leaveVoiceChannel : joinVoiceChannel}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        isConnected
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-primary hover:bg-primary/90 text-dark'
                    }`}
                    title={isConnected ? 'Leave Voice Channel' : 'Join Voice Channel'}
                >
                    {isConnected ? (
                        <>
                            <FiPhoneOff className="h-4 w-4" />
                            <span>Leave</span>
                        </>
                    ) : (
                        <>
                            <FiPhone className="h-4 w-4" />
                            <span>Join Voice</span>
                        </>
                    )}
                </button>
            </div>

            {/* Audio Controls (only when connected) */}
            {isConnected && (
                <div className="flex gap-2">
                    {/* Mute/Unmute */}
                    <button
                        onClick={toggleMute}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            isMuted
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-darkHover hover:bg-dark text-light border border-gray-600'
                        }`}
                        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                        {isMuted ? (
                            <FiMicOff className="h-4 w-4" />
                        ) : (
                            <FiMic className="h-4 w-4" />
                        )}
                        <span className="text-sm">{isMuted ? 'Muted' : 'Live'}</span>
                    </button>

                    {/* Deafen/Undeafen */}
                    <button
                        onClick={toggleDeafen}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            isDeafened
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-darkHover hover:bg-dark text-light border border-gray-600'
                        }`}
                        title={isDeafened ? 'Undeafen' : 'Deafen (Mute All)'}
                    >
                        {isDeafened ? (
                            <FiVolumeX className="h-4 w-4" />
                        ) : (
                            <FiHeadphones className="h-4 w-4" />
                        )}
                        <span className="text-sm">{isDeafened ? 'Deaf' : 'Audio'}</span>
                    </button>
                </div>
            )}

            {/* Participants List */}
            {isConnected && participantCount > 0 && (
                <div className="mt-2">
                    <div className="text-sm text-gray-400 mb-2">In Voice:</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Array.from(participants.values()).map((participant) => (
                            <div 
                                key={participant.socketId}
                                className="flex items-center justify-between px-2 py-1 bg-dark rounded text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                                    <span className="text-light">{participant.username}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {participant.isMuted && (
                                        <FiMicOff className="h-3 w-3 text-red-400" />
                                    )}
                                    {participant.isConnected && (
                                        <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Help text */}
            <div className="text-xs text-gray-500 mt-2">
                💡 Voice chat stays connected while you code together
            </div>
        </div>
    )
}

export default VoiceControls
