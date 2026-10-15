import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export interface AuthUser {
    id: string
    name: string
    username: string
    email: string
    picture?: string | null
}

interface AuthContextType {
    user: AuthUser | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<boolean>
    signup: (name: string, email: string, password: string) => Promise<boolean>
    loginWithGoogle: (credential: string) => Promise<boolean>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("coderoom_token"))
    const [isLoading, setIsLoading] = useState<boolean>(true)

    // Load user profile on initial load if token exists
    useEffect(() => {
        const verifyUser = async () => {
            const savedToken = localStorage.getItem("coderoom_token")
            if (!savedToken) {
                setIsLoading(false)
                return
            }

            try {
                const response = await axios.get(`${SERVER_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${savedToken}`,
                    },
                })
                setUser(response.data.user)
                setToken(savedToken)
            } catch (err) {
                console.warn("Session expired or invalid token:", err)
                localStorage.removeItem("coderoom_token")
                setUser(null)
                setToken(null)
            } finally {
                setIsLoading(false)
            }
        }

        verifyUser()
    }, [])

    const handleAuthSuccess = (newToken: string, newUser: AuthUser) => {
        localStorage.setItem("coderoom_token", newToken)
        setToken(newToken)
        setUser(newUser)
    }

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await axios.post(`${SERVER_URL}/api/auth/login`, {
                email,
                password,
            })
            const { token: receivedToken, user: receivedUser } = response.data
            handleAuthSuccess(receivedToken, receivedUser)
            toast.success(`Welcome back, ${receivedUser.name || receivedUser.username}!`)
            return true
        } catch (error: any) {
            const message = error.response?.data?.error || "Login failed. Please check your credentials."
            toast.error(message)
            return false
        }
    }

    const signup = async (name: string, email: string, password: string): Promise<boolean> => {
        try {
            const response = await axios.post(`${SERVER_URL}/api/auth/signup`, {
                name,
                email,
                password,
            })
            const { token: receivedToken, user: receivedUser } = response.data
            handleAuthSuccess(receivedToken, receivedUser)
            toast.success(`Account created! Welcome to Code Room, ${receivedUser.name}!`)
            return true
        } catch (error: any) {
            const message = error.response?.data?.error || "Sign up failed. Please try again."
            toast.error(message)
            return false
        }
    }

    const loginWithGoogle = async (credential: string): Promise<boolean> => {
        try {
            const response = await axios.post(`${SERVER_URL}/api/auth/google`, {
                credential,
            })
            const { token: receivedToken, user: receivedUser } = response.data
            handleAuthSuccess(receivedToken, receivedUser)
            toast.success(`Signed in with Google as ${receivedUser.name}!`)
            return true
        } catch (error: any) {
            const message = error.response?.data?.error || "Google authentication failed."
            toast.error(message)
            return false
        }
    }

    const logout = () => {
        localStorage.removeItem("coderoom_token")
        setUser(null)
        setToken(null)
        toast.success("Successfully logged out")
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                isLoading,
                login,
                signup,
                loginWithGoogle,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
