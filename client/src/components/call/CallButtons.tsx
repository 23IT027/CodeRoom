import React from 'react'
import { FiVideo } from 'react-icons/fi'
import { RemoteUser } from '@/types/user'
import { useWebRTC } from '@/context/WebRTCContext'
import { CallStatus } from '@/types/webrtc'

interface CallButtonsProps {
    user: RemoteUser
}

const CallButtons: React.FC<CallButtonsProps> = ({ user }) => {
    const { initiateCall, callStatus } = useWebRTC()

    const isCallInProgress = callStatus !== CallStatus.IDLE

    const handleVideoCall = () => {
        if (!isCallInProgress) {
            initiateCall(user)
        }
    }

    return (
        <div className="flex gap-1">
            {/* Video Call Button */}
            <button
                onClick={handleVideoCall}
                disabled={isCallInProgress}
                className={`p-1.5 rounded-full transition-all ${
                    isCallInProgress
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-darkHover text-primary hover:bg-primary hover:text-dark hover:scale-105'
                }`}
                title={`Video call ${user.username}`}
            >
                <FiVideo className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

export default CallButtons
