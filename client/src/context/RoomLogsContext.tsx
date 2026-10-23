import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
    ReactNode,
} from "react"
import axios from "axios"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { useAuth } from "@/context/AuthContext"
import { SocketEvent } from "@/types/socket"

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || "http://localhost:3000").replace(/\/+$/, "")

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SessionLog {
    username: string
    joinedAt: string // ISO date string
    leftAt: string | null
}

export interface RoomMember {
    username: string
    joinedAt: string
    lastJoinedAt: string
}

interface RoomLogsContextType {
    logs: SessionLog[]
    members: RoomMember[]
    onlineUsernames: string[]
    isFetching: boolean
    refresh: () => Promise<void>
}

// ── Context ────────────────────────────────────────────────────────────────────

const RoomLogsContext = createContext<RoomLogsContextType | null>(null)

export const useRoomLogs = (): RoomLogsContextType => {
    const ctx = useContext(RoomLogsContext)
    if (!ctx) throw new Error("useRoomLogs must be used within RoomLogsProvider")
    return ctx
}

// ── Provider ───────────────────────────────────────────────────────────────────

export const RoomLogsProvider = ({ children }: { children: ReactNode }) => {
    const { currentUser, status } = useAppContext()
    const { socket } = useSocket()
    const { token } = useAuth()

    const [logs, setLogs] = useState<SessionLog[]>([])
    const [members, setMembers] = useState<RoomMember[]>([])
    const [onlineUsernames, setOnlineUsernames] = useState<string[]>([])
    const [isFetching, setIsFetching] = useState(false)

    // keep a stable ref to current roomId so socket callbacks don't stale-close
    const roomIdRef = useRef<string>("")

    const fetchLogs = useCallback(async (roomId: string) => {
        if (!roomId || !roomId.trim()) return
        setIsFetching(true)
        try {
            const savedToken = token || localStorage.getItem("coderoom_token")
            const headers: Record<string, string> = {}
            if (savedToken) {
                headers["Authorization"] = `Bearer ${savedToken}`
            }
            const res = await axios.get(`${SERVER_URL}/api/room/${encodeURIComponent(roomId.trim())}/logs`, {
                headers,
            })
            setLogs(res.data.logs ?? [])
            setMembers(res.data.members ?? [])
            setOnlineUsernames(res.data.onlineUsernames ?? [])
        } catch (err) {
            console.warn("Failed to fetch room logs:", err)
        } finally {
            setIsFetching(false)
        }
    }, [token])

    // Fetch whenever room ID is set or status changes to JOINED
    useEffect(() => {
        const roomId = currentUser.roomId
        roomIdRef.current = roomId
        if (roomId) {
            fetchLogs(roomId)
        }
    }, [status, currentUser.roomId, fetchLogs])

    // Real-time: when a user joins, add a live log entry + mark online
    useEffect(() => {
        const handleUserJoined = ({ user }: { user: { username: string; roomId: string } }) => {
            const now = new Date().toISOString()
            setLogs((prev) => [...prev, { username: user.username, joinedAt: now, leftAt: null }])
            setOnlineUsernames((prev) =>
                prev.includes(user.username) ? prev : [...prev, user.username],
            )
            // Ensure member entry exists
            setMembers((prev) =>
                prev.find((m) => m.username === user.username)
                    ? prev
                    : [...prev, { username: user.username, joinedAt: now, lastJoinedAt: now }],
            )
        }

        const handleUserLeft = ({ user }: { user: { username: string } }) => {
            const now = new Date().toISOString()
            setLogs((prev) => {
                // Close the most recent open log for this user
                const copy = [...prev]
                for (let i = copy.length - 1; i >= 0; i--) {
                    if (copy[i].username === user.username && !copy[i].leftAt) {
                        copy[i] = { ...copy[i], leftAt: now }
                        break
                    }
                }
                return copy
            })
            setOnlineUsernames((prev) => prev.filter((u) => u !== user.username))
        }

        const handleJoinAccepted = () => {
            if (roomIdRef.current) {
                fetchLogs(roomIdRef.current)
            }
        }

        socket.on(SocketEvent.USER_JOINED, handleUserJoined)
        socket.on(SocketEvent.USER_DISCONNECTED, handleUserLeft)
        socket.on(SocketEvent.JOIN_ACCEPTED, handleJoinAccepted)

        return () => {
            socket.off(SocketEvent.USER_JOINED, handleUserJoined)
            socket.off(SocketEvent.USER_DISCONNECTED, handleUserLeft)
            socket.off(SocketEvent.JOIN_ACCEPTED, handleJoinAccepted)
        }
    }, [socket, fetchLogs])

    const refresh = useCallback(() => fetchLogs(roomIdRef.current), [fetchLogs])

    return (
        <RoomLogsContext.Provider value={{ logs, members, onlineUsernames, isFetching, refresh }}>
            {children}
        </RoomLogsContext.Provider>
    )
}

export default RoomLogsContext
