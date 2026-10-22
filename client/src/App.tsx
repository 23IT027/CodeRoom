import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import EditorPage from "./pages/EditorPage"
import HomePage from "./pages/HomePage"
import AuthPage from "./pages/AuthPage"

const App = () => {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<AuthPage initialMode="login" />} />
                    <Route path="/signup" element={<AuthPage initialMode="signup" />} />
                    <Route path="/editor/:roomId" element={<EditorPage />} />
                </Routes>
            </Router>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: "#2a2d35",
                        color: "#f5f5f5",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                        fontSize: "14px",
                    },
                    success: {
                        iconTheme: {
                            primary: "#39E079",
                            secondary: "#212429",
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#212429",
                        },
                    },
                }}
            />
        </>
    )
}

export default App
