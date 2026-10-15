import { useState, FormEvent, useEffect, FC } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { GoogleLogin } from "@react-oauth/google"
import { toast } from "react-hot-toast"
import {
    IoArrowBack,
    IoEyeOffOutline,
    IoEyeOutline,
    IoLockClosedOutline,
    IoMailOutline,
    IoPersonOutline,
} from "react-icons/io5"
import logo from "@/assets/logo.svg"

interface AuthPageProps {
    initialMode?: "login" | "signup"
}

const GoogleIcon = () => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        />
        <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
        />
        <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        />
        <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
    </svg>
)

const AuthPage: FC<AuthPageProps> = ({ initialMode }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { login, signup, loginWithGoogle, isAuthenticated } = useAuth()

    // Determine mode from initialMode or pathname (/login vs /signup)
    const isSignupPath = location.pathname.includes("signup")
    const [mode, setMode] = useState<"login" | "signup">(
        initialMode || (isSignupPath ? "signup" : "login")
    )

    useEffect(() => {
        if (location.pathname.includes("signup")) {
            setMode("signup")
        } else if (location.pathname.includes("login")) {
            setMode("login")
        }
    }, [location.pathname])

    const destination =
        location.state?.redirectTo ||
        (location.state?.roomId ? `/editor/${location.state.roomId}` : "/")

    // Redirect to destination if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate(destination, { replace: true })
        }
    }, [isAuthenticated, navigate, destination])

    // Form inputs state
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const googleClientIdConfigured = Boolean(
        import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
    )

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (mode === "signup") {
            if (!name.trim()) {
                toast.error("Please enter your name")
                return
            }
            if (name.trim().length < 2) {
                toast.error("Name must be at least 2 characters")
                return
            }
        }

        if (!email.trim()) {
            toast.error("Please enter your email address")
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
            toast.error("Please enter a valid email address")
            return
        }

        if (!password) {
            toast.error("Please enter your password")
            return
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }

        setIsSubmitting(true)
        try {
            if (mode === "login") {
                const ok = await login(email.trim(), password)
                if (ok) {
                    navigate(destination, { replace: true })
                }
            } else {
                const ok = await signup(name.trim(), email.trim(), password)
                if (ok) {
                    navigate(destination, { replace: true })
                }
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
        if (!credentialResponse.credential) {
            toast.error("Google sign in failed")
            return
        }
        setIsSubmitting(true)
        try {
            const ok = await loginWithGoogle(credentialResponse.credential)
            if (ok) {
                navigate(destination, { replace: true })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUnconfiguredGoogleClick = () => {
        toast(
            "To enable live Google Sign-In, please add your Google Client ID to VITE_GOOGLE_CLIENT_ID in client/.env",
            {
                icon: "ℹ️",
                duration: 5000,
            }
        )
    }

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-dark text-light overflow-hidden font-poppins selection:bg-primary selection:text-black">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

            {/* Back to Home Button */}
            <Link
                to="/"
                className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
            >
                <IoArrowBack size={18} />
                <span>Back to Home</span>
            </Link>

            {/* Main Auth Card Container */}
            <div className="w-full max-w-[460px] animate-fade-in-up">
                {/* Brand Logo & Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <img
                        src={logo}
                        alt="Code Room"
                        className="h-11 w-auto object-contain mb-3 drop-shadow-[0_4px_12px_rgba(57,224,121,0.25)]"
                    />
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {mode === "login" ? "Welcome Back" : "Create an Account"}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 max-w-sm">
                        {mode === "login"
                            ? "Sign in to access your shared code rooms and collaborate"
                            : "Join Code Room today with your name, email, and password"}
                    </p>
                </div>

                {/* Card Surface */}
                <div className="rounded-2xl border border-white/10 bg-[#262930]/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    {/* Toggle Tabs (Sign In / Sign Up) */}
                    <div className="flex p-1 mb-6 rounded-xl bg-dark border border-white/5 relative">
                        <button
                            type="button"
                            onClick={() => {
                                setMode("login")
                                navigate("/login", { replace: true })
                            }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                mode === "login"
                                    ? "bg-primary text-black shadow-md"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode("signup")
                                navigate("/signup", { replace: true })
                            }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                mode === "signup"
                                    ? "bg-primary text-black shadow-md"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Authentication Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Name Field (Sign Up Only) */}
                        {mode === "signup" && (
                            <div className="flex flex-col gap-1.5 animate-slide-in">
                                <label className="text-xs font-medium text-gray-300">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                                        <IoPersonOutline />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="e.g. Ayush Patel"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-xl border border-gray-600/60 bg-darkHover/80 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                                        required
                                        autoComplete="name"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                                    <IoMailOutline />
                                </span>
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-xl border border-gray-600/60 bg-darkHover/80 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-300">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                                    <IoLockClosedOutline />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-xl border border-gray-600/60 bg-darkHover/80 pl-10 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                                    required
                                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
                                </button>
                            </div>
                            {mode === "signup" && (
                                <span className="text-[11px] text-gray-400 pl-1">
                                    Must be at least 6 characters long
                                </span>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-[#2fe070] hover:shadow-[0_0_20px_rgba(57,224,121,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                        >
                            {isSubmitting ? (
                                <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6 flex items-center justify-center">
                        <div className="w-full border-t border-white/10" />
                        <span className="absolute bg-[#262930] px-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            Or continue with
                        </span>
                    </div>

                    {/* Google OAuth Section */}
                    <div className="flex flex-col items-center justify-center w-full">
                        {googleClientIdConfigured ? (
                            <div className="w-full flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => toast.error("Google authentication failed")}
                                    theme="filled_black"
                                    shape="rectangular"
                                    size="large"
                                    text={mode === "login" ? "signin_with" : "signup_with"}
                                    width="100%"
                                />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleUnconfiguredGoogleClick}
                                className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-600/60 bg-darkHover/80 hover:bg-darkHover hover:border-gray-500 py-3 px-4 text-sm font-medium text-white transition-all duration-200 hover:shadow-md cursor-pointer"
                            >
                                <GoogleIcon />
                                <span>
                                    {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Switch Mode Prompt */}
                    <div className="mt-6 text-center text-xs text-gray-400">
                        {mode === "login" ? (
                            <p>
                                Don&apos;t have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("signup")
                                        navigate("/signup")
                                    }}
                                    className="font-semibold text-primary hover:underline ml-1"
                                >
                                    Sign Up
                                </button>
                            </p>
                        ) : (
                            <p>
                                Already have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("login")
                                        navigate("/login")
                                    }}
                                    className="font-semibold text-primary hover:underline ml-1"
                                >
                                    Sign In
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AuthPage
