// import React from "react"
import "@/styles/global.css"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import AppProvider from "./context/AppProvider.tsx"
import { GoogleOAuthProvider } from "@react-oauth/google"
import 'tldraw/tldraw.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

ReactDOM.createRoot(document.getElementById("root")!).render(
    // <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppProvider>
            <App />
        </AppProvider>
    </GoogleOAuthProvider>,
    // </React.StrictMode>
)

