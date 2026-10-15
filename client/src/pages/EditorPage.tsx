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
import { useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Toaster } from 'react-hot-toast'

import { useAuth } from "@/context/AuthContext"
import { toast } from "react-hot-toast"

function EditorPage() {
    // online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId: roomIdParam } = useParams()
    const roomId = roomIdParam ? decodeURIComponent(roomIdParam) : undefined
    const { status, setCurrentUser, currentUser } = useAppContext()
    const { socket } = useSocket()
    const { user: authUser, isAuthenticated, isLoading } = useAuth()
    const location = useLocation()

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

        const username = location.state?.username || authUser.username || authUser.name
        if (roomId && (!currentUser.username || !currentUser.roomId)) {
            const user: User = { username, roomId }
            setCurrentUser(user)
            const token = localStorage.getItem("coderoom_token")
            socket.emit(SocketEvent.JOIN_REQUEST, { ...user, token })
        }
    }, [
        authUser,
        currentUser.roomId,
        currentUser.username,
        isAuthenticated,
        isLoading,
        location.state?.username,
        navigate,
        roomId,
        setCurrentUser,
        socket,
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
            
            {/* Toast Notifications */}
            <Toaster 
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#212429',
                        color: '#f5f5f5',
                        border: '1px solid #3D404A',
                    },
                    success: {
                        iconTheme: {
                            primary: '#39E079',
                            secondary: '#212429',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#212429',
                        },
                    },
                }}
            />
        </>
    )
}

export default EditorPage
