import { useRunCode } from "@/context/RunCodeContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import {
    useRef, useState, useCallback, useEffect, KeyboardEvent
} from "react"
import {
    LuPlay, LuTerminal, LuChevronDown,
    LuChevronUp, LuCopy, LuTrash2, LuStopCircle,
} from "react-icons/lu"
import { VscTerminalBash } from "react-icons/vsc"
import toast from "react-hot-toast"

const MIN_HEIGHT = 120
const DEFAULT_HEIGHT = 260
const MAX_HEIGHT = 600

interface TerminalPanelProps {
    isOpen: boolean
    onToggle: () => void
}

type Tab = "output" | "input" | "shell"

function TerminalPanel({ isOpen, onToggle }: TerminalPanelProps) {
    const { output, isRunning, runCode, setInput } = useRunCode()
    const { activeFile } = useFileSystem()
    const { socket } = useSocket()

    const [height, setHeight] = useState(DEFAULT_HEIGHT)
    const [activeTab, setActiveTab] = useState<Tab>("output")
    const [localInput, setLocalInput] = useState("")

    // Shell state
    const [shellActive, setShellActive] = useState(false)
    const [shellLog, setShellLog] = useState<string>("")
    const [shellCmd, setShellCmd] = useState("")
    const [shellHistory, setShellHistory] = useState<string[]>([])
    const histIdx = useRef(-1)

    const dragging = useRef(false)
    const startY = useRef(0)
    const startH = useRef(DEFAULT_HEIGHT)
    const outputRef = useRef<HTMLDivElement>(null)
    const shellLogRef = useRef<HTMLDivElement>(null)
    const shellInputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
    }, [output])

    // Auto-scroll shell log
    useEffect(() => {
        if (shellLogRef.current) shellLogRef.current.scrollTop = shellLogRef.current.scrollHeight
    }, [shellLog])

    // Socket listeners for shell output
    useEffect(() => {
        const onOutput = (data: string) => setShellLog((prev) => prev + data)
        socket.on("terminal:output", onOutput)
        return () => { socket.off("terminal:output", onOutput) }
    }, [socket])

    // Start / stop shell
    const startShell = () => {
        setShellLog("")
        socket.emit("terminal:start")
        setShellActive(true)
    }
    const stopShell = () => {
        socket.emit("terminal:stop")
        setShellActive(false)
        setShellLog((prev) => prev + "\n[Shell stopped]\n")
    }

    // Send a command line
    const sendShellCommand = () => {
        if (!shellCmd.trim()) return
        setShellHistory((h) => [shellCmd, ...h.slice(0, 49)])
        histIdx.current = -1
        socket.emit("terminal:input", shellCmd + "\n")
        setShellCmd("")
    }

    const onShellKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            sendShellCommand()
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            const next = Math.min(histIdx.current + 1, shellHistory.length - 1)
            histIdx.current = next
            setShellCmd(shellHistory[next] ?? "")
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            const next = Math.max(histIdx.current - 1, -1)
            histIdx.current = next
            setShellCmd(next === -1 ? "" : shellHistory[next] ?? "")
        } else if (e.key === "c" && e.ctrlKey) {
            socket.emit("terminal:input", "\x03")  // Ctrl+C signal
        }
    }

    // Drag-to-resize
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        dragging.current = true
        startY.current = e.clientY
        startH.current = height
        document.body.style.cursor = "row-resize"
        document.body.style.userSelect = "none"
    }, [height])

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return
            const delta = startY.current - e.clientY
            setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH.current + delta)))
        }
        const onUp = () => {
            dragging.current = false
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
        return () => {
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseup", onUp)
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

    const getLanguageLabel = () => {
        if (!activeFile) return "No file open"
        const ext = activeFile.name.split(".").pop()?.toLowerCase()
        const map: Record<string, string> = {
            js: "JavaScript", jsx: "JavaScript", ts: "TypeScript", tsx: "TypeScript",
            py: "Python", java: "Java", cpp: "C++", c: "C", go: "Go",
            rs: "Rust", php: "PHP", rb: "Ruby", cs: "C#", kt: "Kotlin",
            html: "HTML", css: "CSS",
        }
        return map[ext ?? ""] ?? ext?.toUpperCase() ?? "Unknown"
    }

    // Colorize output lines
    const renderOutput = () => {
        if (!output) {
            return (
                <span className="text-gray-500 italic text-sm">
                    Press <span className="text-primary font-semibold">▶ Run</span> to execute the active file…
                </span>
            )
        }
        return output.split("\n").map((line, i) => {
            const lower = line.toLowerCase()
            const cls = lower.includes("error") || lower.includes("exception") || lower.startsWith("❌")
                ? "text-red-400"
                : lower.startsWith("⚠️") || lower.includes("warning")
                    ? "text-yellow-400"
                    : lower.startsWith("[compile]") || lower.startsWith("[stderr]")
                        ? "text-yellow-300"
                        : lower.startsWith("⏳") || lower.startsWith("💡")
                            ? "text-blue-300"
                            : "text-gray-200"
            return <div key={i} className={cls}>{line || "\u00A0"}</div>
        })
    }

    const switchTab = (tab: Tab) => {
        setActiveTab(tab)
        if (!isOpen) onToggle()
    }

    return (
        <div
            className="flex flex-col border-t border-darkHover bg-[#0f0f0f] transition-all duration-200"
            style={{ height: isOpen ? height : 36, minHeight: 36, flexShrink: 0 }}
        >
            {/* Drag handle */}
            {isOpen && (
                <div
                    className="h-1 w-full cursor-row-resize hover:bg-primary/40 transition-colors flex-shrink-0"
                    onMouseDown={onMouseDown}
                />
            )}

            {/* ── Header bar ── */}
            <div className="flex h-9 flex-shrink-0 items-center gap-0 border-b border-darkHover/60 bg-[#161616] px-2">
                {/* Tab: Output */}
                <button
                    className={`flex items-center gap-1.5 px-3 h-full text-xs border-b-2 transition-colors ${activeTab === "output" && isOpen
                        ? "border-primary text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                        }`}
                    onClick={() => switchTab("output")}
                >
                    <LuTerminal size={12} />
                    Output
                    {isRunning && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                </button>

                {/* Tab: stdin */}
                <button
                    className={`flex items-center gap-1.5 px-3 h-full text-xs border-b-2 transition-colors ${activeTab === "input" && isOpen
                        ? "border-primary text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                        }`}
                    onClick={() => switchTab("input")}
                >
                    stdin
                </button>

                {/* Tab: Shell */}
                <button
                    className={`flex items-center gap-1.5 px-3 h-full text-xs border-b-2 transition-colors ${activeTab === "shell" && isOpen
                        ? "border-primary text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                        }`}
                    onClick={() => switchTab("shell")}
                >
                    <VscTerminalBash size={13} />
                    Shell
                    {shellActive && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
                </button>

                <div className="flex-1" />

                {/* File badge */}
                {isOpen && activeFile && (
                    <span className="text-[10px] text-gray-500 mr-2 hidden sm:inline">
                        {activeFile.name} · {getLanguageLabel()}
                    </span>
                )}

                {/* Run & utilities (only in output tab) */}
                {isOpen && activeTab !== "shell" && (
                    <>
                        <button
                            onClick={handleRun}
                            disabled={isRunning || !activeFile}
                            title="Run active file"
                            className={`flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-semibold transition-all mr-1 ${isRunning || !activeFile
                                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                : "bg-primary text-black hover:bg-primary/80"
                                }`}
                        >
                            {isRunning ? <LuStopCircle size={11} /> : <LuPlay size={11} />}
                            {isRunning ? "Running…" : "Run"}
                        </button>
                        <button onClick={copyOutput} title="Copy output" className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                            <LuCopy size={13} />
                        </button>
                    </>
                )}

                {/* Shell controls */}
                {isOpen && activeTab === "shell" && (
                    <>
                        {!shellActive ? (
                            <button
                                onClick={startShell}
                                className="flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-500 transition-all mr-1"
                            >
                                <LuPlay size={11} />
                                Start Shell
                            </button>
                        ) : (
                            <button
                                onClick={stopShell}
                                className="flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-500 transition-all mr-1"
                            >
                                <LuStopCircle size={11} />
                                Stop
                            </button>
                        )}
                        <button
                            onClick={() => setShellLog("")}
                            title="Clear shell"
                            className="rounded p-1 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                        >
                            <LuTrash2 size={13} />
                        </button>
                    </>
                )}

                <button
                    onClick={onToggle}
                    title={isOpen ? "Collapse" : "Expand terminal"}
                    className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    {isOpen ? <LuChevronDown size={14} /> : <LuChevronUp size={14} />}
                </button>
            </div>

            {/* ── Body ── */}
            {isOpen && (
                <div className="flex flex-1 min-h-0 overflow-hidden">

                    {/* Output pane */}
                    {activeTab === "output" && (
                        <div ref={outputRef} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed">
                            {isRunning ? (
                                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                    <span className="animate-spin inline-block">⟳</span>
                                    Executing…
                                </div>
                            ) : renderOutput()}
                        </div>
                    )}

                    {/* stdin pane */}
                    {activeTab === "input" && (
                        <div className="flex flex-1 flex-col gap-2 p-3 min-h-0">
                            <label className="text-[11px] text-gray-400 uppercase tracking-wider">
                                Standard Input — values your program reads via input() / Scanner / etc.
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

                    {/* Shell pane */}
                    {activeTab === "shell" && (
                        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                            {!shellActive ? (
                                <div className="flex flex-1 items-center justify-center flex-col gap-3 text-gray-400">
                                    <VscTerminalBash size={36} className="opacity-30" />
                                    <p className="text-sm">Click <span className="text-green-400 font-semibold">Start Shell</span> to open an interactive terminal</p>
                                    <p className="text-xs text-gray-600">Runs a real shell (cmd.exe / bash) on the server</p>
                                    <button
                                        onClick={startShell}
                                        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-all"
                                    >
                                        <LuPlay size={14} />
                                        Start Shell
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Shell output log */}
                                    <div
                                        ref={shellLogRef}
                                        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed text-gray-200 whitespace-pre-wrap bg-[#0a0a0a]"
                                        onClick={() => shellInputRef.current?.focus()}
                                    >
                                        {shellLog || <span className="text-gray-600 italic">Shell started. Type your commands below.</span>}
                                    </div>

                                    {/* Command input row */}
                                    <div className="flex items-center gap-2 border-t border-darkHover/50 bg-[#111] px-3 py-2">
                                        <span className="text-green-400 font-mono text-sm select-none">$</span>
                                        <input
                                            ref={shellInputRef}
                                            type="text"
                                            className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder-gray-600"
                                            placeholder="type a command and press Enter…"
                                            value={shellCmd}
                                            onChange={(e) => setShellCmd(e.target.value)}
                                            onKeyDown={onShellKeyDown}
                                            autoFocus
                                            spellCheck={false}
                                            autoComplete="off"
                                        />
                                        <button
                                            onClick={sendShellCommand}
                                            className="rounded px-3 py-1 text-xs bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-mono"
                                        >
                                            Enter ↵
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default TerminalPanel
