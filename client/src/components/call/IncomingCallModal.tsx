import React from 'react'
import { FiPhone, FiPhoneOff, FiVideo } from 'react-icons/fi'
import { useWebRTC } from '@/context/WebRTCContext'
import { CallStatus } from '@/types/webrtc'

const IncomingCallModal: React.FC = () => {
    const { callState, callStatus, acceptCall, rejectCall } = useWebRTC()

    if (!callState.isIncomingCall || callStatus !== CallStatus.RINGING) {
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="w-96 rounded-lg bg-dark p-6 shadow-2xl animate-fade-in-up">
                <div className="text-center">
                    {/* Caller Avatar */}
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-dark">
                            {callState.caller?.username.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    {/* Caller Name */}
                    <h2 className="mb-2 text-xl font-semibold text-light">
                        {callState.caller?.username}
                    </h2>

                    {/* Call Type */}
                    <p className="mb-6 text-gray-400">
                        Incoming video call...
                    </p>

                    {/* Call Type Icon */}
                    <div className="mb-6 flex justify-center">
                        <FiVideo className="h-8 w-8 text-primary" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-6">
                        {/* Reject Call Button */}
                        <button
                            onClick={rejectCall}
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-600 hover:scale-105"
                            title="Reject Call"
                        >
                            <FiPhoneOff className="h-6 w-6" />
                        </button>

                        {/* Accept Call Button */}
                        <button
                            onClick={acceptCall}
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white transition-all hover:bg-green-600 hover:scale-105"
                            title="Accept Call"
                        >
                            <FiPhone className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IncomingCallModal
