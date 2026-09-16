import { useState } from "react"
import axios from "axios"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "react-hot-toast"
import { IoClose, IoShieldCheckmark, IoLockClosed, IoEye, IoEyeOff } from "react-icons/io5"

interface TotpSetupModalProps {
    roomId: string
    onClose: () => void
    onSuccess: () => void
}

type Step = "setup" | "confirm"

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

const TotpSetupModal = ({ roomId, onClose, onSuccess }: TotpSetupModalProps) => {
    const [step, setStep] = useState<Step>("setup")
    const [otpauthUrl, setOtpauthUrl] = useState<string>("")
    const [secret, setSecret] = useState<string>("")
    const [showSecret, setShowSecret] = useState(false)
    const [confirmToken, setConfirmToken] = useState("")
    const [loading, setLoading] = useState(false)
    const [confirmError, setConfirmError] = useState(false)
    const [shake, setShake] = useState(false)

    const handleGenerate = async () => {
        if (!roomId.trim()) {
            toast.error("Please enter a Room ID first")
            return
        }
        setLoading(true)
        try {
            const res = await axios.post(`${SERVER_URL}/api/2fa/setup`, { roomId })
            setOtpauthUrl(res.data.otpauthUrl)
            setSecret(res.data.secret)
            setStep("setup")
        } catch {
            toast.error("Failed to generate 2FA secret. Is the server running?")
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmVerify = async () => {
        if (confirmToken.replace(/\s/g, "").length < 6) {
            setShake(true)
            setTimeout(() => setShake(false), 600)
            setConfirmError(true)
            return
        }
        setLoading(true)
        try {
            const res = await axios.post(`${SERVER_URL}/api/2fa/verify`, {
                roomId,
                token: confirmToken,
            })
            if (res.data.valid) {
                toast.success("🔒 2FA is now enabled for this room!")
                onSuccess()
                onClose()
            } else {
                setConfirmError(true)
                setShake(true)
                setTimeout(() => setShake(false), 600)
            }
        } catch {
            toast.error("Verification request failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border-b border-white/10 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/20 p-2">
                            <IoLockClosed className="text-primary text-xl" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Enable 2FA</h2>
                            <p className="text-gray-400 text-xs">Protect room · <span className="text-primary font-mono">{roomId}</span></p>
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
                    {!otpauthUrl ? (
                        /* Step 0 — Generate */
                        <div className="text-center space-y-4">
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Protect <span className="text-primary font-mono">{roomId}</span> with Google Authenticator.
                                Anyone joining will need a valid 6-digit code.
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full rounded-xl bg-primary py-3 font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? "Generating…" : "Generate QR Code"}
                            </button>
                        </div>
                    ) : step === "setup" ? (
                        /* Step 1 — Scan QR */
                        <div className="space-y-4">
                            <p className="text-gray-300 text-sm text-center">
                                Scan this QR code with <span className="text-white font-medium">Google Authenticator</span>
                            </p>
                            <div className="flex justify-center">
                                <div className="rounded-xl bg-white p-3 shadow-lg">
                                    <QRCodeSVG value={otpauthUrl} size={180} />
                                </div>
                            </div>
                            {/* Manual secret */}
                            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                                <p className="text-gray-400 text-xs mb-1">Or enter key manually:</p>
                                <div className="flex items-center gap-2">
                                    <code className={`text-primary text-xs font-mono flex-1 break-all ${showSecret ? "" : "blur-sm select-none"}`}>
                                        {secret}
                                    </code>
                                    <button
                                        onClick={() => setShowSecret(s => !s)}
                                        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                        aria-label="Toggle secret visibility"
                                    >
                                        {showSecret ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => { setStep("confirm"); setConfirmToken(""); setConfirmError(false) }}
                                className="w-full rounded-xl bg-primary py-3 font-semibold text-black hover:opacity-90 transition-opacity"
                            >
                                I've scanned it →
                            </button>
                        </div>
                    ) : (
                        /* Step 2 — Confirm code */
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-center justify-center">
                                <IoShieldCheckmark className="text-primary text-2xl" />
                                <p className="text-white font-medium">Confirm Setup</p>
                            </div>
                            <p className="text-gray-400 text-sm text-center">
                                Enter the 6-digit code shown in your authenticator app to confirm 2FA is working.
                            </p>
                            <div className={`transition-all ${shake ? "animate-shake" : ""}`}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    className={`w-full rounded-xl border ${confirmError ? "border-red-500" : "border-white/20"} bg-darkHover px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                                    value={confirmToken}
                                    onChange={e => {
                                        setConfirmToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                                        setConfirmError(false)
                                    }}
                                    onKeyDown={e => e.key === "Enter" && handleConfirmVerify()}
                                    autoFocus
                                />
                                {confirmError && (
                                    <p className="text-red-400 text-xs text-center mt-1.5 animate-fade-in">
                                        Invalid code. Please try again.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep("setup")}
                                    className="flex-1 rounded-xl border border-white/20 py-3 text-gray-300 hover:bg-white/5 transition-colors text-sm"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleConfirmVerify}
                                    disabled={loading || confirmToken.length < 6}
                                    className="flex-1 rounded-xl bg-primary py-3 font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                                >
                                    {loading ? "Verifying…" : "Activate 2FA"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TotpSetupModal
