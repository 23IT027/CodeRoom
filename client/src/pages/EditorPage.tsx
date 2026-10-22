import SplitterComponent from "@/components/SplitterComponent"
import ConnectionStatusPage from "@/components/connection/ConnectionStatusPage"
import Sidebar from "@/components/sidebar/Sidebar"
import WorkSpace from "@/components/workspace"
import IncomingCallModal from "@/components/call/IncomingCallModal"
import VideoCallWindow from "@/components/call/VideoCallWindow"
import FloatingVoiceStatus from "@/components/voice/FloatingVoiceStatus"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useFullScreen from "@/hooks/useFullScreen"
import useUserActivity from "@/hooks/useUserActivity"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS, User } from "@/types/user"
import { useEffect, useRef } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { toast } from "react-hot-toast"
import { useFileSystem } from "@/context/FileContext"
import { useVoice } from "@/context/VoiceContext"
import { useWebRTC } from "@/context/WebRTCContext"
import { useChatRoom } from "@/context/ChatContext"

function EditorPage() {
    // online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId: roomIdParam } = useParams()
    const roomId = roomIdParam ? decodeURIComponent(roomIdParam) : undefined
    const { status, setCurrentUser, currentUser, setUsers, setDrawingData, setStatus } = useAppContext()
    const { socket } = useSocket()
    const { user: authUser, isAuthenticated, isLoading } = useAuth()
    const { resetWorkspace } = useFileSystem()
    const { leaveVoiceChannel, voiceState } = useVoice()
    const { endCall, callState } = useWebRTC()
    const { setMessages } = useChatRoom()
    const location = useLocation()
    const prevRoomRef = useRef<string | undefined>(undefined)

    useEffect(() => {
        if (isLoading) return

        // Guard against unauthenticated access
        if (!isAuthenticated || !authUser) {
            toast.error("Please sign in or create an account to enter this room")
            navigate("/login", {
                state: { redirectTo: roomId ? `/editor/${encodeURIComponent(roomId)}` : "/" },
                replace: true,
            })
            return
        }

        if (!roomId) return

        const username = location.state?.username || authUser.username || authUser.name

        // Check if user is switching from a previous room to a different room
        if (prevRoomRef.current !== undefined && prevRoomRef.current !== roomId) {
            console.log(`[RoomSwitch] Switching from "${prevRoomRef.current}" to "${roomId}"`)

            // 1. Leave any active voice channel
            try {
                if (voiceState.isConnected) {
                    leaveVoiceChannel()
                }
            } catch (err) {
                console.error("Error leaving voice on room switch:", err)
            }

            // 2. End any active WebRTC call
            try {
                if (callState.isInCall) {
                    endCall()
                }
            } catch (err) {
                console.error("Error ending call on room switch:", err)
            }

            // 3. Clear chat messages from the old room
            setMessages([])

            // 4. Reset workspace files & open tabs for the new room (opens index.js by default)
            resetWorkspace()

            // 5. Reset whiteboard drawing & users list
            setDrawingData(null)
            setUsers([])
            setStatus(USER_STATUS.INITIAL)

            toast.success(`Switched to room: ${roomId}`, { id: "room-switch" })
        }

        // Join room if new room or not yet registered
        if (prevRoomRef.current !== roomId || !currentUser.username || currentUser.roomId !== roomId) {
            prevRoomRef.current = roomId
            const user: User = { username, roomId }
            setCurrentUser(user)
            const token = localStorage.getItem("coderoom_token")
            if (!socket.connected) {
                socket.connect()
            }
            socket.emit(SocketEvent.JOIN_REQUEST, { ...user, token })
        }
    }, [
        authUser,
        callState.isInCall,
        currentUser.roomId,
        currentUser.username,
        endCall,
        isAuthenticated,
        isLoading,
        leaveVoiceChannel,
        location.state?.username,
        navigate,
        resetWorkspace,
        roomId,
        setCurrentUser,
        setDrawingData,
        setMessages,
        setStatus,
        setUsers,
        socket,
        voiceState.isConnected,
    ])

    if (status === USER_STATUS.CONNECTION_FAILED) {
        return <ConnectionStatusPage />
    }

    return (
        <>
            <SplitterComponent>
                <Sidebar />
                <WorkSpace/>
            </SplitterComponent>
            
            {/* Voice & Video Call Components */}
            <IncomingCallModal />
            <VideoCallWindow />
            <FloatingVoiceStatus />
        </>
    )
}

export default EditorPage
