import { useViews } from "@/context/ViewContext"
import useLocalStorage from "@/hooks/useLocalStorage"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { ReactNode } from "react"
import Split from "react-split"

function SplitterComponent({ children }: { children: ReactNode }) {
    const { isSidebarOpen } = useViews()
    const { isMobile, width } = useWindowDimensions()
    const { setItem, getItem } = useLocalStorage()

    const getGutter = () => {
        const gutter = document.createElement("div")
        gutter.className = "custom-gutter h-full hidden md:block cursor-col-resize hover:bg-blue-400 transition-colors duration-200"
        gutter.style.cursor = "col-resize"
        return gutter
    }

    const getSizes = () => {
        if (isMobile) return [0, width]
        const savedSizes = getItem("editorSizes")
        let sizes = [35, 65]
        if (savedSizes) {
            sizes = JSON.parse(savedSizes)
        }
        return isSidebarOpen ? sizes : [0, width]
    }

    const getMinSizes = () => {
        if (isMobile) return [0, width]
        return isSidebarOpen ? [350, 350] : [50, 0]
    }

    const getMaxSizes = () => {
        if (isMobile) return [0, Infinity]
        return isSidebarOpen ? [Infinity, Infinity] : [0, Infinity]
    }

    const handleGutterDrag = (sizes: number[]) => {
        setItem("editorSizes", JSON.stringify(sizes))
    }

    const getGutterStyle = () => ({
        width: "7px",
        backgroundColor: "#e1e1ffb3",
        transition: "all 0.2s ease",
        opacity: isSidebarOpen && !isMobile ? "1" : "0",
        cursor: "col-resize",
        borderRadius: "2px",
        ":hover": {
            backgroundColor: "#a78bfa",
            boxShadow: "0 0 8px rgba(167, 139, 250, 0.5)"
        }
    })

    return (
        <Split
            sizes={getSizes()}
            minSize={getMinSizes()}
            gutter={getGutter}
            maxSize={getMaxSizes()}
            dragInterval={1}
            direction="horizontal"
            gutterAlign="center"
            cursor="col-resize"
            snapOffset={30}
            gutterStyle={getGutterStyle}
            onDrag={handleGutterDrag}
            className="split flex h-screen min-h-screen max-w-full items-center justify-center overflow-hidden"
        >
            {children}
        </Split>
    )
}

export default SplitterComponent
