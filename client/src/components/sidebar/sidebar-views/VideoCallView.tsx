import React from 'react'
import { FiVideo, FiMic, FiMicOff, FiHeadphones, FiVolumeX, FiPhone, FiPhoneOff } from 'react-icons/fi'
import { LuUsers } from 'react-icons/lu'
import { useAppContext } from '@/context/AppContext'
import { useWebRTC } from '@/context/WebRTCContext'
import { useVoice } from '@/context/VoiceContext'
import { CallStatus } from '@/types/webrtc'
import useResponsive from '@/hooks/useResponsive'

const VideoCallView: React.FC = () => {
    const { users, currentUser } = useAppContext()
    const { initiateCall, callStatus } = useWebRTC()
    const {
        voiceState,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
        toggleDeafen,
    } = useVoice()
    const { viewHeight } = useResponsive()
    const { isConnected, isMuted, isDeafened, participants } = voiceState

    // All users in the room except self (no status filter — if they're in the room they're online)
    const roommates = users.filter(u => u.username !== currentUser?.username)
    const isCallInProgress = callStatus !== CallStatus.IDLE

    return (
        <div
            className="flex max-h-full w-full flex-col gap-3 p-4 overflow-y-auto"
            style={{ height: viewHeight }}
        >
            {/* ── Header ── */}
            <div className="flex items-center gap-2 pb-2 border-b border-darkHover">
                <FiPhone className="h-5 w-5 text-primary" />
                <h1 className="view-title mb-0 border-b-0">Communications</h1>
            </div>

            {/* ══ VOICE CHANNEL ══════════════════════════════════════════ */}
            <div className="rounded-xl border border-darkHover bg-[#1a1c22] overflow-hidden">
                {/* Voice header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#161820] border-b border-darkHover">
                    <div className="flex items-center gap-2">
                        <FiHeadphones className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-light">Voice Channel</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}>
                        {participants.size + (isConnected ? 1 : 0)} / ∞ online
                    </span>
                </div>

                <div className="p-3 flex flex-col gap-2">
                    {/* Join / Leave button */}
                    <button
                        onClick={isConnected ? leaveVoiceChannel : joinVoiceChannel}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${isConnected
                                ? 'bg-red-500/90 hover:bg-red-600 text-white'
                                : 'bg-primary hover:bg-primary/80 text-dark'
                            }`}
                    >
                        {isConnected ? (
                            <><FiPhoneOff className="h-4 w-4" /> Leave Voice</>
                        ) : (
                            <><FiPhone className="h-4 w-4" /> Join Voice</>
                        )}
                    </button>

                    {/* Mute & Deafen (only when connected) */}
                    {isConnected && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={toggleMute}
                                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${isMuted
                                        ? 'bg-red-500 text-white'
                                        : 'bg-darkHover text-light hover:bg-dark border border-gray-600'
                                    }`}
                            >
                                {isMuted ? <FiMicOff className="h-3.5 w-3.5" /> : <FiMic className="h-3.5 w-3.5" />}
                                {isMuted ? 'Muted' : 'Live'}
                            </button>
                            <button
                                onClick={toggleDeafen}
                                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${isDeafened
                                        ? 'bg-red-500 text-white'
                                        : 'bg-darkHover text-light hover:bg-dark border border-gray-600'
                                    }`}
                            >
                                {isDeafened ? <FiVolumeX className="h-3.5 w-3.5" /> : <FiHeadphones className="h-3.5 w-3.5" />}
                                {isDeafened ? 'Deafened' : 'Audio'}
                            </button>
                        </div>
                    )}

                    {/* Active voice participants */}
                    {isConnected && (
                        <div className="mt-1">
                            {/* Self */}
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-primary/10 mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-dark">
                                        {currentUser?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs text-light font-medium">{currentUser?.username} (you)</span>
                                </div>
                                {isMuted && <FiMicOff className="h-3 w-3 text-red-400" />}
                            </div>

                            {/* Remote participants */}
                            {Array.from(participants.values()).map(p => (
                                <div key={p.socketId} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-darkHover mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-darkHover border border-gray-600 flex items-center justify-center text-[10px] font-bold text-light">
                                            {p.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs text-light">{p.username}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {p.isMuted && <FiMicOff className="h-3 w-3 text-red-400" />}
                                        <div className={`h-1.5 w-1.5 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                                    </div>
                                </div>
                            ))}

                            {participants.size === 0 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                    No one else in voice yet
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ VIDEO CALLS ════════════════════════════════════════════ */}
            <div className="rounded-xl border border-darkHover bg-[#1a1c22] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#161820] border-b border-darkHover">
                    <div className="flex items-center gap-2">
                        <FiVideo className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-light">Video Calls</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCallInProgress
                            ? 'bg-primary/20 text-primary'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}>
                        {isCallInProgress ? callStatus : 'idle'}
                    </span>
                </div>

                <div className="p-3">
                    {roommates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
                            <div className="h-14 w-14 rounded-full bg-darkHover flex items-center justify-center">
                                <LuUsers className="h-7 w-7 opacity-40" />
                            </div>
                            <p className="text-xs text-center text-gray-500">
                                No other users in the room.<br />Share the room ID to invite someone.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {roommates.map(user => (
                                <div
                                    key={user.socketId}
                                    className="flex items-center justify-between rounded-lg bg-darkHover/60 px-3 py-2.5 hover:bg-darkHover transition-colors"
                                >
                                    {/* Avatar + Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-dark">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-light truncate">{user.username}</p>
                                            <p className="text-xs text-gray-400">
                                                {user.typing ? 'Typing…' : user.currentFile ? `Editing ${user.currentFile}` : 'Online'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Video call button */}
                                    <button
                                        onClick={() => initiateCall(user)}
                                        disabled={isCallInProgress}
                                        title={isCallInProgress ? 'Already in a call' : `Video call ${user.username}`}
                                        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${isCallInProgress
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-primary text-dark hover:bg-primary/80 hover:scale-105'
                                            }`}
                                    >
                                        <FiVideo className="h-3.5 w-3.5" />
                                        Call
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tip ── */}
            <p className="text-center text-[11px] text-gray-600 px-2">
                💡 Voice stays on while you code. Video calls open a fullscreen window.
            </p>
        </div>
    )
}

export default VideoCallView
