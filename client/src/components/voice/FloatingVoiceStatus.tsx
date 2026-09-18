import React from 'react'
import { FiMic, FiMicOff, FiHeadphones, FiVolumeX } from 'react-icons/fi'
import { useVoice } from '@/context/VoiceContext'

const FloatingVoiceStatus: React.FC = () => {
    const { voiceState, toggleMute, toggleDeafen } = useVoice()
    const { isConnected, isMuted, isDeafened, participants } = voiceState

    if (!isConnected) {
        return null
    }

    const participantCount = participants.size

    return (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-dark/90 backdrop-blur-sm border border-darkHover rounded-lg p-3 shadow-lg">
            {/* Voice indicator */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-light">{participantCount + 1} in voice</span>
                </div>
            </div>

            {/* Quick controls */}
            <div className="flex items-center gap-1 border-l border-darkHover pl-2">
                {/* Mute button */}
                <button
                    onClick={toggleMute}
                    className={`p-1.5 rounded transition-colors ${
                        isMuted
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-darkHover text-light hover:bg-gray-600'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <FiMicOff className="h-3 w-3" />
                    ) : (
                        <FiMic className="h-3 w-3" />
                    )}
                </button>

                {/* Deafen button */}
                <button
                    onClick={toggleDeafen}
                    className={`p-1.5 rounded transition-colors ${
                        isDeafened
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-darkHover text-light hover:bg-gray-600'
                    }`}
                    title={isDeafened ? 'Undeafen' : 'Deafen'}
                >
                    {isDeafened ? (
                        <FiVolumeX className="h-3 w-3" />
                    ) : (
                        <FiHeadphones className="h-3 w-3" />
                    )}
                </button>
            </div>
        </div>
    )
}

export default FloatingVoiceStatus
