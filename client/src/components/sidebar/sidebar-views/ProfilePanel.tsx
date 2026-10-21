import { useAuth } from "@/context/AuthContext"
import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { IoPersonOutline, IoLogOutOutline, IoTimeOutline } from "react-icons/io5"
import { MdOutlineMeetingRoom } from "react-icons/md"
import { LuCrown, LuUsers, LuExternalLink, LuRefreshCw } from "react-icons/lu"
import { toast } from "react-hot-toast"

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || "http://localhost:3000").replace(/\/+$/, "")

interface RoomEntry {
    roomId: string
    createdBy: string
    isOwner: boolean
    memberCount: number
    lastJoinedAt: string
    lastActiveAt: string
    createdAt: string
}

interface ProfilePanelProps {
    isOpen: boolean
    onClose: () => void
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
}

export default function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
    const { user, token, logout } = useAuth()
    const navigate = useNavigate()
    const panelRef = useRef<HTMLDivElement>(null)

    const [rooms, setRooms] = useState<RoomEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)
    const [filter, setFilter] = useState<"all" | "created" | "joined">("all")

    const fetchRooms = useCallback(async () => {
        if (!token) return
        setLoading(true)
        try {
            const res = await axios.get(`${SERVER_URL}/api/user/rooms`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setRooms(res.data.rooms || [])
            setFetched(true)
        } catch {
            toast.error("Could not load room history")
        } finally {
            setLoading(false)
        }
    }, [token])

    // Fetch rooms when panel opens (once, then manual refresh)
    useEffect(() => {
        if (isOpen && !fetched) {
            fetchRooms()
        }
    }, [isOpen, fetched, fetchRooms])

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [isOpen, onClose])

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    }, [isOpen, onClose])

    const switchRoom = (roomId: string) => {
        onClose()
        navigate(`/editor/${encodeURIComponent(roomId)}`)
    }

    const handleLogout = () => {
        onClose()
        logout()
    }

    const createdCount = rooms.filter((r) => r.isOwner).length
    const joinedCount = rooms.filter((r) => !r.isOwner).length

    const filteredRooms = rooms.filter((r) => {
        if (filter === "created") return r.isOwner
        if (filter === "joined") return !r.isOwner
        return true
    })

    if (!user) return null

    return (
        <>
            {/* Backdrop overlay */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`
                    fixed bottom-[58px] left-[50px] z-50
                    w-[320px] max-h-[80vh]
                    flex flex-col
                    rounded-2xl border border-white/10
                    bg-[#1a1d22]/95 backdrop-blur-xl
                    shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]
                    transition-all duration-300 ease-out origin-bottom-left
                    ${isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 translate-y-4 pointer-events-none"
                    }
                `}
                role="dialog"
                aria-label="User profile panel"
            >
                {/* Header — User Info */}
                <div className="flex items-start gap-3 p-4 pb-3 border-b border-white/[0.07]">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {user.picture ? (
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="h-12 w-12 rounded-xl object-cover ring-2 ring-primary/40"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xl">
                                {user.name ? user.name[0].toUpperCase() : <IoPersonOutline />}
                            </div>
                        )}
                        {/* Online dot using theme primary */}
                        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-[#1a1d22]" />
                    </div>

                    {/* Name + username + email */}
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm leading-tight truncate">{user.name}</p>
                        <p className="text-gray-400 text-xs leading-tight mt-0.5 truncate">@{user.username}</p>
                        {user.email && (
                            <p className="text-gray-500 text-[10px] leading-tight mt-0.5 truncate">{user.email}</p>
                        )}
                    </div>

                    {/* Logout button */}
                    <button
                        onClick={handleLogout}
                        className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                        title="Sign out"
                        aria-label="Sign out"
                    >
                        <IoLogOutOutline size={15} />
                    </button>
                </div>

                {/* Room History Header with filter tabs + counts */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                        <IoTimeOutline size={13} className="text-gray-400" />
                        Room History
                    </span>
                    <div className="flex items-center gap-1">
                        {/* All */}
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                                filter === "all"
                                    ? "bg-primary/20 text-primary"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            All ({rooms.length})
                        </button>
                        {/* Created */}
                        <button
                            onClick={() => setFilter("created")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                                filter === "created"
                                    ? "bg-primary/20 text-primary"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            Created ({createdCount})
                        </button>
                        {/* Joined */}
                        <button
                            onClick={() => setFilter("joined")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                                filter === "joined"
                                    ? "bg-primary/20 text-primary"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            Joined ({joinedCount})
                        </button>
                        {/* Refresh */}
                        <button
                            onClick={fetchRooms}
                            className="ml-1 p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                            title="Refresh"
                            aria-label="Refresh room history"
                        >
                            <LuRefreshCw size={11} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Room List */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                    {loading && !fetched ? (
                        /* Skeleton loading */
                        <div className="space-y-2 py-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
                            ))}
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                            <MdOutlineMeetingRoom size={28} className="text-gray-600" />
                            <p className="text-gray-500 text-xs">
                                {filter === "all"
                                    ? "No rooms yet. Create or join one!"
                                    : `No ${filter} rooms yet.`}
                            </p>
                        </div>
                    ) : (
                        filteredRooms.map((room) => (
                            <RoomCard key={room.roomId} room={room} onSwitch={switchRoom} />
                        ))
                    )}
                </div>
            </div>
        </>
    )
}

/* ── Room card ──────────────────────────────────────────────────────────────── */
function RoomCard({ room, onSwitch }: { room: RoomEntry; onSwitch: (id: string) => void }) {
    return (
        <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-primary/20 transition-all duration-150 cursor-default">
            {/* Icon */}
            <div
                className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
                    room.isOwner
                        ? "bg-primary/10 text-primary"
                        : "bg-white/[0.06] text-gray-400"
                }`}
            >
                {room.isOwner ? <LuCrown size={14} /> : <LuUsers size={14} />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-medium truncate">{room.roomId}</span>
                    {room.isOwner && (
                        <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                            owner
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-500 text-[10px]">
                        {room.memberCount} member{room.memberCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-600 text-[10px]">·</span>
                    <span className="text-gray-500 text-[10px]">{timeAgo(room.lastJoinedAt)}</span>
                </div>
            </div>

            {/* Switch button */}
            <button
                onClick={() => onSwitch(room.roomId)}
                className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
                title={`Switch to ${room.roomId}`}
                aria-label={`Switch to room ${room.roomId}`}
            >
                <LuExternalLink size={10} />
                Switch
            </button>
        </div>
    )
}
