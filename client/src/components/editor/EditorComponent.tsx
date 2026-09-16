import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import cn from "classnames"
import { useState } from "react"
import Editor from "./Editor"
import FileTab from "./FileTab"
import TerminalPanel from "@/components/terminal/TerminalPanel"
import { useRunCode } from "@/context/RunCodeContext"
import { LuPlay, LuTerminal, LuSquare } from "react-icons/lu"

function EditorComponent() {
    const { openFiles, activeFile } = useFileSystem()
    const { minHeightReached } = useResponsive()
    const { isRunning, runCode } = useRunCode()
    const [terminalOpen, setTerminalOpen] = useState(false)

    if (openFiles.length <= 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <h1 className="text-xl text-white">
                    No file is currently open.
                </h1>
            </div>
        )
    }

    return (
        <main
            className={cn("flex w-full flex-col overflow-x-auto md:h-screen", {
                "h-[calc(100vh-50px)]": !minHeightReached,
                "h-full": minHeightReached,
            })}
        >
            {/* File tabs + Run button row */}
            <div className="flex items-center border-b border-darkHover bg-dark flex-shrink-0">
                <div className="flex-1 min-w-0 overflow-hidden">
                    <FileTab />
                </div>

                {/* Run & Terminal toggle buttons */}
                <div className="flex items-center gap-1 px-2 flex-shrink-0">
                    {activeFile && (
                        <button
                            onClick={() => { runCode(); setTerminalOpen(true) }}
                            disabled={isRunning}
                            title={`Run ${activeFile.name}`}
                            className={cn(
                                "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition-all",
                                isRunning
                                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    : "bg-primary text-black hover:bg-primary/80"
                            )}
                        >
                            {isRunning ? <LuSquare size={12} /> : <LuPlay size={12} />}
                            {isRunning ? "Running…" : "Run"}
                        </button>
                    )}
                    <button
                        onClick={() => setTerminalOpen((o) => !o)}
                        title="Toggle terminal panel"
                        className={cn(
                            "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                            terminalOpen
                                ? "bg-primary/20 text-primary"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <LuTerminal size={13} />
                        <span className="hidden sm:inline">Terminal</span>
                    </button>
                </div>
            </div>

            {/* Code editor — fills remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <Editor />
            </div>

            {/* Bottom terminal panel */}
            <TerminalPanel
                isOpen={terminalOpen}
                onToggle={() => setTerminalOpen((o) => !o)}
            />
        </main>
    )
}

export default EditorComponent
