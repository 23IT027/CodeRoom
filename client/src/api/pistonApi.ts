import axios, { AxiosInstance } from "axios"

// Use proxy in development, direct URL in production
const pistonBaseUrl = import.meta.env.DEV 
    ? "/api/piston"  // Use Vite proxy in development
    : "https://emkc.org/api/v2/piston"  // Direct URL in production

const instance: AxiosInstance = axios.create({
    baseURL: pistonBaseUrl,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    },
    timeout: 30000, // 30 second timeout
})

// Add request interceptor for debugging
instance.interceptors.request.use(
    (config) => {
        console.log('Piston API Request:', {
            url: config.url,
            method: config.method,
            baseURL: config.baseURL,
            headers: config.headers
        })
        return config
    },
    (error) => {
        console.error('Piston API Request Error:', error)
        return Promise.reject(error)
    }
)

// Add response interceptor for debugging
instance.interceptors.response.use(
    (response) => {
        console.log('Piston API Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.config.url
        })
        return response
    },
    (error) => {
        console.error('Piston API Response Error:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                baseURL: error.config?.baseURL
            }
        })
        return Promise.reject(error)
    }
)

export default instance
