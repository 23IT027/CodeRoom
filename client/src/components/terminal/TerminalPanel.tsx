import { useRunCode } from "@/context/RunCodeContext"
import { useFileSystem } from "@/context/FileContext"
import { useRef, useState, useCallback, useEffect } from "react"
import {
    LuPlay, LuTerminal, LuChevronDown,
    LuChevronUp, LuCopy, LuTrash2, LuStopCircle
} from "react-icons/lu"
import toast from "react-hot-toast"

const MIN_HEIGHT = 120
const DEFAULT_HEIGHT = 260
const MAX_HEIGHT = 600

interface TerminalPanelProps {
    isOpen: boolean
    onToggle: () => void
}

type Tab = "output" | "input"

function TerminalPanel({ isOpen, onToggle }: TerminalPanelProps) {
    const { output, isRunning, runCode, setInput } = useRunCode()
    const { activeFile } = useFileSystem()

    const [height, setHeight] = useState(DEFAULT_HEIGHT)
    const [activeTab, setActiveTab] = useState<Tab>("output")
    const [localInput, setLocalInput] = useState("")
    const dragging = useRef(false)
    const startY = useRef(0)
    const startH = useRef(DEFAULT_HEIGHT)
    const outputRef = useRef<HTMLDivElement>(null)

    // Auto-scroll output to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
    }, [output])

    // Drag-to-resize handlers
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        dragging.current = true
        startY.current = e.clientY
        startH.current = height
        document.body.style.cursor = "row-resize"
        document.body.style.userSelect = "none"
    }, [height])

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!dragging.current) return
            const delta = startY.current - e.clientY
            const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH.current + delta))
            setHeight(newH)
        }
        const onMouseUp = () => {
            dragging.current = false
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup", onMouseUp)
        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("mouseup", onMouseUp)
        }
    }, [])

    const handleRun = () => {
        setInput(localInput)
        runCode()
        setActiveTab("output")
    }

    const copyOutput = () => {
        navigator.clipboard.writeText(output)
        toast.success("Output copied!")
    }

    const clearOutput = () => {
        // We can't directly clear from context, so show placeholder by running nothing
        // Just switch tab for UX
        setActiveTab("input")
        setTimeout(() => setActiveTab("output"), 10)
    }

    // Detect language from file extension
    const getLanguageLabel = () => {
        if (!activeFile) return "No file open"
        const ext = activeFile.name.split(".").pop()?.toLowerCase()
        const map: Record<string, string> = {
            js: "JavaScript", jsx: "JavaScript", ts: "TypeScript", tsx: "TypeScript",
            py: "Python", java: "Java", cpp: "C++", c: "C", go: "Go",
            rs: "Rust", php: "PHP", rb: "Ruby", cs: "C#", kt: "Kotlin",
        }
        return map[ext ?? ""] ?? ext?.toUpperCase() ?? "Unknown"
    }

    // Colorize output lines
    const renderOutput = () => {
        if (!output) {
            return (
                <span className="text-gray-500 italic text-sm">
                    Press <span className="text-primary font-semibold">▶ Run</span> to execute your code…
                </span>
            )
        }
        return output.split("\n").map((line, i) => {
            const isError = line.toLowerCase().includes("error") || line.toLowerCase().includes("exception")
            const isSuccess = line.toLowerCase().includes("output:")
            const isCompile = line.toLowerCase().includes("compile")
            return (
                <div
                    key={i}
                    className={
                        isError ? "text-red-400" :
                            isSuccess ? "text-green-400" :
                                isCompile ? "text-yellow-400" :
                                    "text-gray-200"
                    }
                >
                    {line || "\u00A0"}
                </div>
            )
        })
    }

    return (
        <div
            className="flex flex-col border-t border-darkHover bg-[#0f0f0f] transition-all duration-200"
            style={{ height: isOpen ? height : 36, minHeight: 36, flexShrink: 0 }}
        >
            {/* ── Drag handle ── */}
            {isOpen && (
                <div
                    className="h-1 w-full cursor-row-resize hover:bg-primary/40 transition-colors flex-shrink-0"
                    onMouseDown={onMouseDown}
                />
            )}

            {/* ── Header bar ── */}
            <div className="flex h-9 flex-shrink-0 items-center gap-1 border-b border-darkHover/60 bg-[#161616] px-2">
                {/* Tabs */}
                <button
                    className={`flex items-center gap-1.5 px-3 h-full text-xs border-b-2 transition-colors ${activeTab === "output" && isOpen
                        ? "border-primary text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                        }`}
                    onClick={() => { setActiveTab("output"); if (!isOpen) onToggle() }}
                >
                    <LuTerminal size={12} />
                    Terminal
                    {isRunning && (
                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                </button>
                <button
                    className={`flex items-center gap-1.5 px-3 h-full text-xs border-b-2 transition-colors ${activeTab === "input" && isOpen
                        ? "border-primary text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                        }`}
                    onClick={() => { setActiveTab("input"); if (!isOpen) onToggle() }}
                >
                    stdin
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* File / language badge */}
                {isOpen && activeFile && (
                    <span className="text-[10px] text-gray-500 mr-2 hidden sm:inline">
                        {activeFile.name} · {getLanguageLabel()}
                    </span>
                )}

                {/* Actions */}
                {isOpen && (
                    <>
                        <button
                            onClick={handleRun}
                            disabled={isRunning || !activeFile}
                            title="Run code (active file)"
                            className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold transition-all ${isRunning || !activeFile
                                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                : "bg-primary text-black hover:bg-primary/80"
                                }`}
                        >
                            {isRunning ? <LuSquare size={11} /> : <LuPlay size={11} />}
                            {isRunning ? "Running…" : "Run"}
                        </button>
                        <button onClick={copyOutput} title="Copy output" className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                            <LuCopy size={13} />
                        </button>
                        <button onClick={clearOutput} title="Clear" className="rounded p-1 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors">
                            <LuTrash2 size={13} />
                        </button>
                    </>
                )}

                <button
                    onClick={onToggle}
                    title={isOpen ? "Collapse terminal" : "Open terminal"}
                    className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    {isOpen ? <LuChevronDown size={14} /> : <LuChevronUp size={14} />}
                </button>
            </div>

            {/* ── Body ── */}
            {isOpen && (
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {activeTab === "output" ? (
                        /* Output pane */
                        <div
                            ref={outputRef}
                            className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed"
                        >
                            {isRunning ? (
                                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                    <span className="animate-spin inline-block">⟳</span>
                                    Executing…
                                </div>
                            ) : renderOutput()}
                        </div>
                    ) : (
                        /* Stdin pane */
                        <div className="flex flex-1 flex-col gap-2 p-3 min-h-0">
                            <label className="text-[11px] text-gray-400 uppercase tracking-wider">
                                Standard Input (stdin) — provide values your program reads
                            </label>
                            <textarea
                                className="flex-1 resize-none rounded-lg border border-gray-700 bg-[#1a1a1a] p-3 font-mono text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                placeholder={"e.g.\n5\nhello world"}
                                value={localInput}
                                onChange={(e) => setLocalInput(e.target.value)}
                            />
                            <button
                                onClick={handleRun}
                                disabled={isRunning || !activeFile}
                                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${isRunning || !activeFile
                                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    : "bg-primary text-black hover:bg-primary/80"
                                    }`}
                            >
                                <LuPlay size={14} />
                                {isRunning ? "Running…" : "Run with this input"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default TerminalPanel
