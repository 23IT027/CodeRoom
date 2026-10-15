import { FC } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { IoLogOutOutline, IoPersonOutline } from "react-icons/io5"
import logo from "@/assets/logo.svg"

const Navbar: FC = () => {
    const { user, isAuthenticated, logout } = useAuth()
    const navigate = useNavigate()

    return (
        <header className="w-full border-b border-white/10 bg-dark/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
                {/* Brand / Logo */}
                <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
                    <img src={logo} alt="Code Room Logo" className="h-8 w-auto object-contain" />
                </Link>

                {/* Auth Controls */}
                <div className="flex items-center gap-3">
                    {isAuthenticated && user ? (
                        <div className="flex items-center gap-3 bg-darkHover/60 border border-white/10 rounded-full pl-1.5 pr-2 py-1">
                            {user.picture ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/50"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                    {user.name ? user.name[0] : <IoPersonOutline />}
                                </div>
                            )}
                            <div className="hidden sm:flex flex-col text-left pr-1">
                                <span className="text-sm font-medium text-white leading-tight">
                                    {user.name}
                                </span>
                                <span className="text-[11px] text-gray-400 leading-tight">
                                    @{user.username}
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="flex items-center gap-1 rounded-full p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                title="Sign Out"
                                aria-label="Sign out"
                            >
                                <IoLogOutOutline size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => navigate("/login")}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate("/signup")}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-[#2fe070] hover:shadow-[0_0_15px_rgba(57,224,121,0.4)] active:scale-95"
                            >
                                Sign Up
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Navbar
