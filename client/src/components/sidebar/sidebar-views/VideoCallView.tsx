import React from 'react'
import { FiUsers, FiVideo } from 'react-icons/fi'
import { useAppContext } from '@/context/AppContext'
import { useWebRTC } from '@/context/WebRTCContext'
import { USER_CONNECTION_STATUS } from '@/types/user'
import useResponsive from '@/hooks/useResponsive'
import CallButtons from '@/components/call/CallButtons'
import VoiceControls from '@/components/voice/VoiceControls'

const VideoCallView: React.FC = () => {
    const { users, currentUser } = useAppContext()
    const { callStatus } = useWebRTC()
    const { viewHeight } = useResponsive()

    // Filter out current user and offline users
    const availableUsers = users.filter(
        user => 
            user.username !== currentUser?.username && 
            user.status === USER_CONNECTION_STATUS.ONLINE
    )

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-4 p-4"
            style={{ height: viewHeight }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b">
                <FiVideo className="h-5 w-5 text-primary" />
                <h1 className="view-title mb-0 border-b-0">Communications</h1>
            </div>

            {/* Voice Controls Section */}
            <div>
                <VoiceControls />
            </div>

            {/* Video Calls Section */}
            <div className="flex-1 overflow-y-auto">
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <FiVideo className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-light">Video Calls</span>
                    </div>
                    
                
                    <div className={`px-3 py-2 rounded-lg text-sm mb-4 ${
                        callStatus === 'idle' 
                            ? 'bg-darkHover text-light' 
                            : 'bg-primary text-dark'
                    }`}>
                        Video Status: {callStatus === 'idle' ? 'Available' : callStatus}
                    </div>
                </div>

                {/* Available Users for Video Calls */}
                <div className="mb-3 flex items-center gap-2">
                    <FiUsers className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                        Available for Video ({availableUsers.length})
                    </span>
                </div>

                {availableUsers.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="mb-4 flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-darkHover flex items-center justify-center">
                                <FiUsers className="h-8 w-8 text-gray-400" />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">No users available for video calls</p>
                        <p className="text-gray-500 text-xs">
                            Other users need to be online to start a video call
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {availableUsers.map((user) => (
                            <div
                                key={user.socketId}
                                className="flex items-center justify-between p-3 rounded-lg bg-darkHover hover:bg-dark transition-colors"
                            >
                                {/* User Info */}
                                <div className="flex items-center gap-3">
                                    {/* User Avatar */}
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-dark">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    
                                    {/* User Details */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-light font-medium">
                                                {user.username}
                                            </span>
                                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            {user.typing && (
                                                <span>Typing...</span>
                                            )}
                                            {user.currentFile && !user.typing && (
                                                <span>Editing: {user.currentFile}</span>
                                            )}
                                            {!user.typing && !user.currentFile && (
                                                <span>Online</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Call Buttons */}
                                <CallButtons user={user} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Help Text */}
            <div className="mt-4 p-3 rounded-lg bg-dark border border-darkHover">
                <div className="flex items-center gap-2 mb-2">
                    <FiVideo className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-light">Communication Guide</span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                    <p>• <strong>Voice Chat:</strong> Always-on voice for team communication</p>
                    <p>• <strong>Video Calls:</strong> 1-on-1 video calls for deeper collaboration</p>
                </div>
            </div>
        </div>
    )
}

export default VideoCallView
