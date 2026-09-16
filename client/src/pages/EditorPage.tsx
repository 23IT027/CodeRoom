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

function EditorPage() {
    // online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId } = useParams()
    const { status, setCurrentUser, currentUser } = useAppContext()
    const { socket } = useSocket()
    const location = useLocation()

    useEffect(() => {
        if (currentUser.username.length > 0) return
        const username = location.state?.username
        if (username === undefined) {
            navigate("/", {
                state: { roomId },
            })
        } else if (roomId) {
            const user: User = { username, roomId }
            setCurrentUser(user)
            socket.emit(SocketEvent.JOIN_REQUEST, user)
        }
    }, [
        currentUser.username,
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
