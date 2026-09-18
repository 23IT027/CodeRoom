import { useRunCode } from "@/context/RunCodeContext"
import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { LuCopy, LuPlay, LuEye, LuZap, LuTerminal, LuExternalLink } from "react-icons/lu"
import ReactProjectViewer from "@/components/react/ReactProjectViewer"
import StackBlitzViewer from "@/components/react/StackBlitzViewer"

function RunView() {
    const { viewHeight } = useResponsive()
    const [currentMode, setCurrentMode] = useState<'code' | 'preview' | 'stackblitz'>('code')
    const [isReactProject, setIsReactProject] = useState(false)
    
    const {
        setInput,
        output,
        isRunning,
        runCode
    } = useRunCode()

    const { fileStructure, activeFile } = useFileSystem()

    // Check if current workspace has React files
    useEffect(() => {
        if (!fileStructure?.children) {
            setIsReactProject(false)
            return
        }

        const hasReactFiles = fileStructure.children.some((item: any) => {
            if (item.name === 'package.json' && item.content) {
                try {
                    const pkg = JSON.parse(item.content)
                    return pkg.dependencies?.react || pkg.devDependencies?.react
                } catch (e) {
                    return false
                }
            }
            return false
        })

        setIsReactProject(hasReactFiles)
        
        // If React project detected and no mode set, default to preview
        if (hasReactFiles && currentMode === 'code') {
            setCurrentMode('preview')
        }
    }, [fileStructure])

    const copyOutput = () => {
        navigator.clipboard.writeText(output)
        toast.success("Output copied to clipboard")
    }

    return (
        <div
            className="flex flex-col gap-4 p-4 h-full overflow-hidden"
            style={{ height: viewHeight }}
        >
            {/* Enhanced Header */}
            <div className="w-full flex items-center justify-between flex-shrink-0">
                <h1 className="view-title flex items-center gap-2">
                    <LuZap className="text-primary" size={20} />
                    Run Code
                </h1>
                {activeFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="truncate max-w-[120px]">{activeFile.name}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                
                {/* Enhanced Mode Selection */}
                {isReactProject && (
                    <div className="w-full flex-shrink-0">
                        <div className="bg-gray-800/50 p-1 rounded-lg border border-gray-600/30">
                            <div className="flex gap-1">
                                <button
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 ${
                                        currentMode === 'code'
                                            ? 'bg-primary text-black shadow-lg transform scale-[1.02]'
                                            : 'bg-transparent text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                    onClick={() => setCurrentMode('code')}
                                >
                                    <LuTerminal size={14} />
                                    Code
                                    {currentMode === 'code' && <div className="w-1.5 h-1.5 bg-black rounded-full"></div>}
                                </button>
                                <button
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 ${
                                        currentMode === 'preview'
                                            ? 'bg-primary text-black shadow-lg transform scale-[1.02]'
                                            : 'bg-transparent text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                    onClick={() => setCurrentMode('preview')}
                                >
                                    <LuEye size={14} />
                                    Preview
                                    {currentMode === 'preview' && <div className="w-1.5 h-1.5 bg-black rounded-full"></div>}
                                </button>
                                <button
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 ${
                                        currentMode === 'stackblitz'
                                            ? 'bg-primary text-black shadow-lg transform scale-[1.02]'
                                            : 'bg-transparent text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                    onClick={() => setCurrentMode('stackblitz')}
                                >
                                    <LuExternalLink size={14} />
                                    StackBlitz
                                    {currentMode === 'stackblitz' && <div className="w-1.5 h-1.5 bg-black rounded-full"></div>}
                                </button>
                            </div>
                        </div>
                        {/* Mode Description */}
                        <div className="mt-2 text-xs text-gray-400 text-center">
                            {currentMode === 'code' 
                                ? '🔧 Execute single files with Piston API' 
                                : currentMode === 'preview'
                                ? '🚀 Live React preview with Sandpack'
                                : '⚡ Full-stack deployment with StackBlitz'
                            }
                        </div>
                    </div>
                )}

                {currentMode === 'code' ? (
                    /* Enhanced Code Execution Mode */
                    <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
                        {/* Input Section */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <LuTerminal size={14} />
                                Input (stdin):
                            </label>
                            <textarea
                                className="h-[100px] w-full resize-none rounded-lg border border-gray-600/30 bg-gray-800/50 p-3 text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                placeholder="Enter input for your program here..."
                                onChange={(e) => setInput(e.target.value)}
                            />
                        </div>
                        
                        {/* Run Button */}
                        <button
                            className={`flex w-full items-center justify-center gap-2 rounded-lg p-3 font-semibold text-black outline-none transition-all flex-shrink-0 ${
                                isRunning 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-primary hover:bg-primary/90 hover:shadow-lg transform hover:scale-[1.02]'
                            }`}
                            onClick={runCode}
                            disabled={isRunning}
                        >
                            <LuPlay size={16} className={isRunning ? 'animate-pulse' : ''} />
                            {isRunning ? 'Executing...' : 'Run Code'}
                            {isRunning && <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>}
                        </button>

                        {/* Output Section */}
                        <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
                            <label className="flex w-full justify-between items-center flex-shrink-0">
                                <span className="text-sm font-medium text-gray-300">Output:</span>
                                <button 
                                    onClick={copyOutput} 
                                    title="Copy Output"
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                                >
                                    <LuCopy size={12} />
                                    Copy
                                </button>
                            </label>
                            
                            <div className="w-full flex-1 overflow-y-auto rounded-lg border border-gray-600/30 bg-gray-900/50 p-4 text-white outline-none min-h-[200px]">
                                <code>
                                    <pre className="text-wrap text-sm leading-relaxed">
                                        {output || (
                                            <span className="text-gray-500 italic">
                                                No output yet. Run your code to see results here.
                                            </span>
                                        )}
                                    </pre>
                                </code>
                            </div>
                        </div>
                    </div>
                ) : currentMode === 'preview' ? (
                    /* React Preview Mode */
                    <div className="w-full flex-1 min-h-0 overflow-hidden">
                        <ReactProjectViewer isVisible={currentMode === 'preview'} />
                    </div>
                ) : (
                    /* StackBlitz Mode */
                    <div className="w-full flex-1 min-h-0 overflow-hidden">
                        <StackBlitzViewer isVisible={currentMode === 'stackblitz'} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default RunView
