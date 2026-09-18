import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import axios from "axios"
import { GoogleLogin, googleLogout } from "@react-oauth/google"
import TotpSetupModal from "@/components/modals/TotpSetupModal"
import TotpVerifyModal from "@/components/modals/TotpVerifyModal"
import { IoLockClosed, IoLockOpen, IoLogOutOutline } from "react-icons/io5"
// import logo from "@/assets/logo.svg"

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"
const MIN_ROOM_NAME_LENGTH = 2
const MIN_USERNAME_LENGTH = 3

/** Turn a typed room name into a stable, URL-safe room id */
const normalizeRoomId = (raw: string) =>
    raw
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")

interface GoogleUser {
    name: string
    email: string
    picture: string
}

const FormComponent = () => {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()

    // Google OAuth state
    const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)

    // 2FA modal state
    const [showSetupModal, setShowSetupModal] = useState(false)
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [roomIs2faEnabled, setRoomIs2faEnabled] = useState(false)

    const googleClientConfigured = Boolean(
        import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim(),
    )

    const createNewRoomId = () => {
        const roomId = uuidv4().split("-")[0]
        setCurrentUser((prev) => ({ ...prev, roomId }))
        toast.success("Created a new Room Id")
        usernameRef.current?.focus()
        return roomId
    }

    const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name
        const value = e.target.value
        setCurrentUser((prev) => ({ ...prev, [name]: value }))
    }

    // Handle Google sign-in success
    const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
        if (!credentialResponse.credential) return
        try {
            const res = await axios.post(`${SERVER_URL}/api/auth/google`, {
                credential: credentialResponse.credential,
            })
            const user: GoogleUser = res.data
            setGoogleUser(user)
            // Auto-fill username with Google display name (strip spaces to keep username clean)
            const name = user.name.replace(/\s+/g, "_")
            setCurrentUser((prev) => ({ ...prev, username: name }))
            toast.success(`Signed in as ${user.name}`)
        } catch {
            toast.error("Google sign-in failed. Please try again.")
        }
    }

    const handleGoogleSignOut = () => {
        googleLogout()
        setGoogleUser(null)
        setCurrentUser((prev) => ({ ...prev, username: "" }))
        toast("Signed out of Google")
    }

    // Check if a room has 2FA whenever the roomId changes
    useEffect(() => {
        const roomId = normalizeRoomId(currentUser.roomId)
        if (roomId.length < MIN_ROOM_NAME_LENGTH) {
            setRoomIs2faEnabled(false)
            return
        }
        const controller = new AbortController()
        axios
            .get(`${SERVER_URL}/api/2fa/status?roomId=${encodeURIComponent(roomId)}`, {
                signal: controller.signal,
            })
            .then((res) => setRoomIs2faEnabled(res.data.enabled))
            .catch(() => setRoomIs2faEnabled(false))
        return () => controller.abort()
    }, [currentUser.roomId])

    const validateForm = (roomId: string, username: string) => {
        if (username.trim().length === 0) {
            toast.error("Enter your username")
            return false
        } else if (username.trim().length < MIN_USERNAME_LENGTH) {
            toast.error(`Username must be at least ${MIN_USERNAME_LENGTH} characters long`)
            return false
        } else if (roomId.length === 0) {
            toast.error("Enter a room name")
            return false
        } else if (roomId.length < MIN_ROOM_NAME_LENGTH) {
            toast.error(`Room name must be at least ${MIN_ROOM_NAME_LENGTH} characters`)
            return false
        }
        return true
    }

    const proceedToJoin = (user = currentUser) => {
        const payload = {
            ...user,
            username: user.username.trim(),
            roomId: normalizeRoomId(user.roomId),
        }
        toast.loading("Joining room...")
        setStatus(USER_STATUS.ATTEMPTING_JOIN)
        socket.emit(SocketEvent.JOIN_REQUEST, payload)
    }

    const joinRoom = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === USER_STATUS.ATTEMPTING_JOIN) return

        const username = currentUser.username.trim()
        let roomId = normalizeRoomId(currentUser.roomId)

        // Empty room name → create one; otherwise keep the user's custom name
        if (!roomId && username.length >= MIN_USERNAME_LENGTH) {
            roomId = createNewRoomId()
        }

        if (!validateForm(roomId, username)) return

        // Persist normalized name so the URL and UI stay in sync
        if (roomId !== currentUser.roomId) {
            setCurrentUser((prev) => ({ ...prev, roomId, username }))
        }

        const userForJoin = { ...currentUser, roomId, username }

        if (roomIs2faEnabled) {
            setShowVerifyModal(true)
            return
        }

        try {
            const res = await axios.get(
                `${SERVER_URL}/api/2fa/status?roomId=${encodeURIComponent(roomId)}`
            )
            if (res.data.enabled) {
                setRoomIs2faEnabled(true)
                setShowVerifyModal(true)
                return
            }
        } catch {
            // Server unreachable — allow join anyway
        }

        proceedToJoin(userForJoin)
    }

    useEffect(() => {
        if (currentUser.roomId.length > 0) return
        if (location.state?.roomId) {
            setCurrentUser((prev) => ({
                ...prev,
                roomId: normalizeRoomId(String(location.state.roomId)),
            }))
            if (currentUser.username.length === 0) {
                toast.success("Enter your username")
            }
        }
    }, [currentUser, location.state?.roomId, setCurrentUser])

    useEffect(() => {
        if (status === USER_STATUS.DISCONNECTED && !socket.connected) {
            socket.connect()
            return
        }

        const isRedirect = sessionStorage.getItem("redirect") === "true"

        if (status === USER_STATUS.JOINED && !isRedirect) {
            const username = currentUser.username
            const roomId = normalizeRoomId(currentUser.roomId)
            sessionStorage.setItem("redirect", "true")
            navigate(`/editor/${encodeURIComponent(roomId)}`, {
                state: { username },
            })
        } else if (status === USER_STATUS.JOINED && isRedirect) {
            // User navigated back to the home form while still "joined"
            sessionStorage.removeItem("redirect")
            setStatus(USER_STATUS.DISCONNECTED)
            socket.disconnect()
            socket.connect()
        }
    }, [currentUser, navigate, setStatus, socket, status])

    return (
        <>
            <div className="flex w-full max-w-[500px] flex-col items-center justify-center gap-4 p-4 sm:w-[500px] sm:p-8 animate-fade-in-up">

                {/* ── Google Sign-In Section (only if client ID is configured) ── */}
                {googleClientConfigured &&
                    (!googleUser ? (
                        <div className="flex w-full flex-col items-center gap-3">
                            <p className="text-gray-400 text-sm">Sign in to auto-fill your name</p>
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => toast.error("Google sign-in failed")}
                                theme="filled_black"
                                shape="rectangular"
                                size="large"
                                text="signin_with"
                                width="320"
                            />
                            <div className="flex w-full items-center gap-3">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-gray-500 text-xs">or continue manually</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <img
                                    src={googleUser.picture}
                                    alt={googleUser.name}
                                    className="h-9 w-9 rounded-full ring-2 ring-primary/40"
                                    referrerPolicy="no-referrer"
                                />
                                <div>
                                    <p className="text-white text-sm font-medium leading-tight">{googleUser.name}</p>
                                    <p className="text-gray-400 text-xs leading-tight">{googleUser.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleGoogleSignOut}
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors text-sm"
                                title="Sign out"
                                aria-label="Sign out of Google"
                            >
                                <IoLogOutOutline size={16} />
                                <span className="text-xs">Sign out</span>
                            </button>
                        </div>
                    ))}

                {/* ── Join Form ── */}
                <form onSubmit={joinRoom} className="flex w-full flex-col gap-4 animate-slide-in">
                    {/* Username first — this is enough to create & enter a room */}
                    <div className="relative">
                        <input
                            type="text"
                            name="username"
                            placeholder="Your name (required)"
                            aria-label="Username"
                            className={`w-full rounded-md border bg-darkHover px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-300 ${googleUser
                                ? "border-primary/40 text-primary cursor-not-allowed opacity-80"
                                : "border-gray-500"
                                }`}
                            onChange={handleInputChanges}
                            value={currentUser.username}
                            ref={usernameRef}
                            readOnly={!!googleUser}
                            autoComplete="username"
                        />
                        {googleUser && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary/60">
                                via Google
                            </span>
                        )}
                    </div>

                    {/* Room name — type your own, or leave empty to auto-create */}
                    <div className="relative">
                        <input
                            type="text"
                            name="roomId"
                            placeholder="Room name (e.g. team-alpha)"
                            aria-label="Room name"
                            className="w-full rounded-md border border-gray-500 bg-darkHover px-3 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-300"
                            onChange={handleInputChanges}
                            value={currentUser.roomId}
                        />
                        {normalizeRoomId(currentUser.roomId).length >= MIN_ROOM_NAME_LENGTH && (
                            <span
                                className={`absolute right-3 top-1/2 -translate-y-1/2 text-lg transition-colors duration-300 ${roomIs2faEnabled ? "text-primary" : "text-gray-500"
                                    }`}
                                title={roomIs2faEnabled ? "2FA enabled for this room" : "No 2FA on this room"}
                            >
                                {roomIs2faEnabled ? <IoLockClosed /> : <IoLockOpen />}
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        aria-label="Join Room"
                        className="mt-2 w-full rounded-md bg-primary px-8 py-3 text-lg font-semibold text-black relative overflow-hidden group"
                    >
                        <span className="relative z-10">Join</span>
                        <span className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-20 transition-all duration-500 group-active:w-56 group-active:h-56"></span>
                    </button>
                </form>

                <div className="flex w-full flex-col items-center gap-2">
                    <button
                        className="cursor-pointer select-none underline transition-colors duration-200 hover:text-primary animate-bounce"
                        aria-label="Generate Unique Room Id"
                        onClick={createNewRoomId}
                    >
                        Generate Unique Room Id
                    </button>

                    {normalizeRoomId(currentUser.roomId).length >= MIN_ROOM_NAME_LENGTH && (
                        <button
                            type="button"
                            aria-label="Enable 2FA for this room"
                            onClick={() => setShowSetupModal(true)}
                            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors duration-200 animate-fade-in"
                        >
                            <IoLockClosed className="text-base" />
                            {roomIs2faEnabled ? "2FA is ON · Manage" : "Enable 2FA for this room"}
                        </button>
                    )}
                </div>
            </div>

            {/* 2FA Modals */}
            {showSetupModal && (
                <TotpSetupModal
                    roomId={normalizeRoomId(currentUser.roomId)}
                    onClose={() => setShowSetupModal(false)}
                    onSuccess={() => setRoomIs2faEnabled(true)}
                />
            )}
            {showVerifyModal && (
                <TotpVerifyModal
                    roomId={normalizeRoomId(currentUser.roomId)}
                    onClose={() => setShowVerifyModal(false)}
                    onSuccess={() => {
                        setShowVerifyModal(false)
                        proceedToJoin({
                            ...currentUser,
                            username: currentUser.username.trim(),
                            roomId: normalizeRoomId(currentUser.roomId),
                        })
                    }}
                />
            )}
        </>
    )
}

export default FormComponent
