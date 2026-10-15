import axios, { AxiosInstance } from "axios"

// Route all code execution through our own server proxy.
// This avoids browser CORS and auth restrictions on the public Piston API.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

const instance: AxiosInstance = axios.create({
    baseURL: `${SERVER_URL}/api`,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    },
    timeout: 30000,
})

export default instance
