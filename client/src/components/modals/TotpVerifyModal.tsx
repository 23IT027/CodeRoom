import { useState, useEffect } from "react"
import axios from "axios"
import { IoClose, IoShieldCheckmark } from "react-icons/io5"

interface TotpVerifyModalProps {
    roomId: string
    onClose: () => void
    onSuccess: () => void
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

const TotpVerifyModal = ({ roomId, onClose, onSuccess }: TotpVerifyModalProps) => {
    const [token, setToken] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const [shake, setShake] = useState(false)

    useEffect(() => {
        if (token.length === 6) {
            handleVerify()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    const handleVerify = async () => {
        if (token.replace(/\s/g, "").length < 6) return
        setLoading(true)
        setError(false)
        try {
            const res = await axios.post(`${SERVER_URL}/api/2fa/verify`, { roomId, token })
            if (res.data.valid) {
                onSuccess()
            } else {
                setError(true)
                setShake(true)
                setToken("")
                setTimeout(() => setShake(false), 600)
            }
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
            <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border-b border-white/10 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/20 p-2">
                            <IoShieldCheckmark className="text-primary text-xl" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">2FA Required</h2>
                            <p className="text-gray-400 text-xs">
                                Room · <span className="text-primary font-mono">{roomId}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Close"
                    >
                        <IoClose size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-gray-300 text-sm text-center leading-relaxed">
                        This room is protected. Enter the 6-digit code from{" "}
                        <span className="text-white font-medium">Google Authenticator</span>.
                    </p>

                    <div className={`transition-all ${shake ? "animate-shake" : ""}`}>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            autoFocus
                            className={`w-full rounded-xl border ${error ? "border-red-500" : "border-white/20"} bg-darkHover px-4 py-4 text-center text-3xl font-mono tracking-[0.6em] text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                            value={token}
                            onChange={e => {
                                setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                                setError(false)
                            }}
                            onKeyDown={e => e.key === "Enter" && handleVerify()}
                            disabled={loading}
                        />
                        {error && (
                            <p className="text-red-400 text-sm text-center mt-2 animate-fade-in">
                                ❌ Invalid code. Open Google Authenticator and try again.
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleVerify}
                        disabled={loading || token.length < 6}
                        className="w-full rounded-xl bg-primary py-3 font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? "Verifying…" : "Verify & Join Room"}
                    </button>

                    <p className="text-gray-500 text-xs text-center">
                        Codes refresh every 30 seconds. Make sure your device clock is synced.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default TotpVerifyModal
