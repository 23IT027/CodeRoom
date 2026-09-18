import axios, { AxiosInstance } from "axios"

// Judge0 CE public instance — free, no API key required for basic use
// Alternatively falls back to emkc Piston if Judge0 is unavailable
const PISTON_URL = "https://emkc.org/api/v2/piston"

const instance: AxiosInstance = axios.create({
    baseURL: PISTON_URL,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    },
    timeout: 30000,
})

export default instance
