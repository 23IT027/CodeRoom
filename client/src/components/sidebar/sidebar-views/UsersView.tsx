import { useState } from "react"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { useRoomLogs, SessionLog, RoomMember } from "@/context/RoomLogsContext"
import useResponsive from "@/hooks/useResponsive"
import { USER_STATUS } from "@/types/user"
import toast from "react-hot-toast"
import { GoSignOut } from "react-icons/go"
import { IoShareOutline, IoArrowBack, IoRefreshOutline } from "react-icons/io5"
import { LuCopy } from "react-icons/lu"
import { MdOutlineHistory } from "react-icons/md"
import { useNavigate } from "react-router-dom"
import Avatar from "react-avatar"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function formatTime(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatDuration(joinedIso: string, leftIso: string | null): string {
    const start = new Date(joinedIso).getTime()
    const end = leftIso ? new Date(leftIso).getTime() : Date.now()
    const secs = Math.floor((end - start) / 1000)
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ${secs % 60}s`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ${mins % 60}m`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface MemberCardProps {
    member: RoomMember
    isOnline: boolean
    isCurrentUser: boolean
    onClick: () => void
    logCount: number
}

const MemberCard = ({ member, isOnline, isCurrentUser, onClick, logCount }: MemberCardProps) => (
    <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-darkHover/60 p-3 text-left transition-all duration-200 hover:border-primary/30 hover:bg-darkHover active:scale-[0.98] cursor-pointer"
        title={`View ${member.username}'s session logs`}
    >
        <div className="relative shrink-0">
            <Avatar name={member.username} size="42" round="10px" />
            <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-dark ${
                    isOnline ? "bg-green-400" : "bg-gray-500"
                }`}
            />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-white">
                    {member.username}
                    {isCurrentUser && (
                        <span className="ml-1.5 text-[10px] font-normal text-primary">(you)</span>
                    )}
                </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
                <span
                    className={`text-[11px] font-medium ${isOnline ? "text-green-400" : "text-gray-400"}`}
                >
                    {isOnline ? "● Active" : "○ Deactive"}
                </span>
                <span className="text-[11px] text-gray-500">·</span>
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <MdOutlineHistory size={12} />
                    {logCount} session{logCount !== 1 ? "s" : ""}
                </span>
            </div>
        </div>
        <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    </button>
)

interface LogRowProps {
    log: SessionLog
    isOnline: boolean
    index: number
}

const LogRow = ({ log, isOnline, index }: LogRowProps) => {
    const isOpen = !log.leftAt
    return (
        <div
            className={`rounded-xl border p-3 text-sm transition-all duration-200 ${
                isOpen && isOnline
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-white/5 bg-darkHover/40"
            }`}
        >
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Session #{index + 1}
                </span>
                <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOpen && isOnline
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-600/30 text-gray-400"
                    }`}
                >
                    {isOpen && isOnline ? "ACTIVE" : "ENDED"}
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                    <span className="text-primary font-medium">Joined</span>
                    <span className="text-gray-400">{formatDate(log.joinedAt)}</span>
                    <span className="text-gray-500">{formatTime(log.joinedAt)}</span>
                </div>
                {log.leftAt ? (
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="text-red-400 font-medium">Left</span>
                        <span className="text-gray-400">{formatDate(log.leftAt)}</span>
                        <span className="text-gray-500">{formatTime(log.leftAt)}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-400 font-medium">Still in room</span>
                    </div>
                )}
                <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                    <MdOutlineHistory size={12} />
                    <span>Duration: {formatDuration(log.joinedAt, log.leftAt)}</span>
                </div>
            </div>
        </div>
    )
}

// ── Main component ─────────────────────────────────────────────────────────────

function UsersView() {
    const navigate = useNavigate()
    const { viewHeight } = useResponsive()
    const { setStatus, currentUser } = useAppContext()
    const { socket } = useSocket()
    const { logs, members, onlineUsernames, isFetching, refresh } = useRoomLogs()

    // "null" = members list view  |  string = per-member logs view
    const [selectedMember, setSelectedMember] = useState<string | null>(null)

    // ── Room actions ───────────────────────────────────────────────────────────

    const copyURL = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            toast.success("URL copied to clipboard")
        } catch {
            toast.error("Unable to copy URL to clipboard")
        }
    }

    const shareURL = async () => {
        const url = window.location.href
        try {
            await navigator.share({ url })
        } catch {
            toast.error("Unable to share URL")
        }
    }

    const leaveRoom = () => {
        socket.disconnect()
        setStatus(USER_STATUS.DISCONNECTED)
        navigate("/", { replace: true })
    }

    // ── Per-member logs ────────────────────────────────────────────────────────

    const memberLogs = selectedMember
        ? logs.filter((l) => l.username === selectedMember)
        : []
    const memberIsOnline = selectedMember
        ? onlineUsernames.includes(selectedMember) ||
          (selectedMember === currentUser.username && status === USER_STATUS.JOINED)
        : false

    // ── Rendering ─────────────────────────────────────────────────────────────

    if (selectedMember) {
        return (
            <div
                className="flex flex-col p-4 gap-4 overflow-hidden"
                style={{ height: viewHeight }}
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedMember(null)}
                        className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-darkHover transition-colors"
                        title="Back to members"
                    >
                        <IoArrowBack size={20} />
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar name={selectedMember} size="32" round="8px" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{selectedMember}</p>
                            <span
                                className={`text-[11px] font-medium ${
                                    memberIsOnline ? "text-green-400" : "text-gray-400"
                                }`}
                            >
                                {memberIsOnline ? "● Active" : "○ Deactive"}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={refresh}
                        className={`flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-darkHover transition-colors ${
                            isFetching ? "animate-spin text-primary" : ""
                        }`}
                        title="Refresh logs"
                        disabled={isFetching}
                    >
                        <IoRefreshOutline size={18} />
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-darkHover/60 border border-white/5 p-3 text-center">
                        <p className="text-lg font-bold text-white">{memberLogs.length}</p>
                        <p className="text-[11px] text-gray-400">Total Sessions</p>
                    </div>
                    <div className="rounded-xl bg-darkHover/60 border border-white/5 p-3 text-center">
                        <p className={`text-lg font-bold ${memberIsOnline ? "text-green-400" : "text-gray-400"}`}>
                            {memberIsOnline ? "Active" : "Deactive"}
                        </p>
                        <p className="text-[11px] text-gray-400">Current Status</p>
                    </div>
                </div>

                {/* Session logs list */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
                    {memberLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
                            <MdOutlineHistory size={28} />
                            <p className="text-sm">No sessions recorded yet</p>
                        </div>
                    ) : (
                        // Show newest first
                        [...memberLogs]
                            .reverse()
                            .map((log, i) => (
                                <LogRow
                                    key={`${log.username}-${log.joinedAt}`}
                                    log={log}
                                    isOnline={memberIsOnline}
                                    index={memberLogs.length - 1 - i}
                                />
                            ))
                    )}
                </div>
            </div>
        )
    }

    // ── Members list view ──────────────────────────────────────────────────────

    const isUserOnline = (uname: string) =>
        onlineUsernames.includes(uname) ||
        (uname === currentUser.username && status === USER_STATUS.JOINED)

    // Build a unified member list: DB members + any online user not yet in DB + current user
    const allUsernames = new Set<string>(members.map((m) => m.username))
    onlineUsernames.forEach((u) => allUsernames.add(u))
    if (currentUser.username) {
        allUsernames.add(currentUser.username)
    }

    const allMembers: RoomMember[] = [
        ...members,
        ...[...allUsernames]
            .filter((u) => !members.find((m) => m.username === u))
            .map((u) => ({ username: u, joinedAt: new Date().toISOString(), lastJoinedAt: new Date().toISOString() })),
    ]

    // Sort: online first, then alphabetical
    const sortedMembers = [...allMembers].sort((a, b) => {
        const aOnline = isUserOnline(a.username) ? 0 : 1
        const bOnline = isUserOnline(b.username) ? 0 : 1
        if (aOnline !== bOnline) return aOnline - bOnline
        return a.username.localeCompare(b.username)
    })

    const onlineCount = sortedMembers.filter((m) => isUserOnline(m.username)).length
    const totalCount = sortedMembers.length

    return (
        <div className="flex flex-col p-4 gap-3 overflow-hidden" style={{ height: viewHeight }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="view-title mb-0 border-b-0 pb-0 text-white font-semibold text-base">
                        Members
                    </h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {onlineCount} online · {totalCount} total · click to view logs
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className={`flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-darkHover transition-colors ${
                        isFetching ? "animate-spin text-primary" : ""
                    }`}
                    title="Refresh"
                    disabled={isFetching}
                >
                    <IoRefreshOutline size={18} />
                </button>
            </div>

            {/* Members list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
                {sortedMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
                        <p className="text-sm">No members yet</p>
                    </div>
                ) : (
                    sortedMembers.map((member) => {
                        const isOnline = isUserOnline(member.username)
                        const isCurrentUser = member.username === currentUser.username
                        const memberLogCount = logs.filter((l) => l.username === member.username).length
                        return (
                            <MemberCard
                                key={member.username}
                                member={member}
                                isOnline={isOnline}
                                isCurrentUser={isCurrentUser}
                                onClick={() => setSelectedMember(member.username)}
                                logCount={memberLogCount}
                            />
                        )
                    })
                )}
            </div>

            {/* Room actions */}
            <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
                <div className="flex w-full gap-3">
                    <button
                        className="flex flex-grow items-center justify-center rounded-xl bg-darkHover border border-white/10 p-3 text-white hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={shareURL}
                        title="Share Link"
                    >
                        <IoShareOutline size={22} />
                    </button>
                    <button
                        className="flex flex-grow items-center justify-center rounded-xl bg-darkHover border border-white/10 p-3 text-white hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={copyURL}
                        title="Copy Link"
                    >
                        <LuCopy size={20} />
                    </button>
                    <button
                        className="flex flex-grow items-center justify-center rounded-xl bg-primary p-3 text-black hover:bg-[#2fe070] transition-colors cursor-pointer"
                        onClick={leaveRoom}
                        title="Leave room"
                    >
                        <GoSignOut size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UsersView
