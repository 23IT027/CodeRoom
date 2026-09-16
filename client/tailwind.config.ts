/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{jsx,tsx}", "./*.html"],
    theme: {
        extend: {
            colors: {
                dark: "#212429",
                darkHover: "#3D404A",
                light: "#f5f5f5",
                primary: "#39E079",
                danger: "#ef4444",
            },
            fontFamily: {
                poppins: ["Poppins", "sans-serif"],
            },
            animation: {
                "up-down": "up-down 2s ease-in-out infinite alternate",
                "shake": "shake 0.5s ease-in-out",
            },
            keyframes: {
                shake: {
                    "0%, 100%": { transform: "translateX(0)" },
                    "20%": { transform: "translateX(-8px)" },
                    "40%": { transform: "translateX(8px)" },
                    "60%": { transform: "translateX(-6px)" },
                    "80%": { transform: "translateX(6px)" },
                },
            },
        },
    },
    plugins: [],
}
