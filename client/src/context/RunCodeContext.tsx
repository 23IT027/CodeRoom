import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useFileSystem } from './FileContext'
import axiosInstance from '../api/pistonApi'
import { Language, RunContext } from '../types/run'
import toast from 'react-hot-toast'

const RunCodeContext = createContext<RunContext | undefined>(undefined)

interface RunCodeProviderProps {
    children: ReactNode
}

// Extensions that cannot be run as programs
const NON_EXECUTABLE = new Set([
    'html', 'css', 'scss', 'less', 'svg', 'xml',
    'json', 'yaml', 'yml', 'md', 'txt', 'csv',
    'png', 'jpg', 'jpeg', 'gif', 'ico', 'webp',
])

// File extension → Piston language name
const EXT_TO_LANG: Record<string, string> = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java',
    cpp: 'cpp', cxx: 'cpp', cc: 'cpp',
    c: 'c', go: 'go', rs: 'rust',
    php: 'php', rb: 'ruby', cs: 'csharp',
    kt: 'kotlin', swift: 'swift', sh: 'bash',
}

export function RunCodeProvider({ children }: RunCodeProviderProps) {
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('')
    const [isRunning, setIsRunning] = useState(false)
    const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: 'javascript',
        version: '18.15.0',
        aliases: ['js'],
    })

    const { activeFile } = useFileSystem()

    // Fetch supported languages via our server proxy
    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const response = await axiosInstance.get('/runtimes')
                setSupportedLanguages(response.data)
            } catch {
                // Fallback list if server runtimes endpoint is slow or unreachable
                setSupportedLanguages([
                    { language: 'javascript', version: 'Node.js 20', aliases: ['js', 'node'] },
                    { language: 'python',     version: 'Python 3.12', aliases: ['py', 'python3'] },
                    { language: 'java',       version: 'JDK 17',     aliases: [] },
                    { language: 'cpp',        version: 'GCC 14.1',   aliases: ['c++', 'cxx', 'cc'] },
                    { language: 'c',          version: 'GCC 14.1',   aliases: [] },
                    { language: 'typescript', version: 'TS 5.5',     aliases: ['ts'] },
                ])
            }
        }
        fetchLanguages()
    }, [])

    const runCode = async () => {
        if (!activeFile) {
            setOutput('❌  No file is currently open.')
            return
        }

        const ext = activeFile.name.split('.').pop()?.toLowerCase() ?? ''

        // Block non-executable file types
        if (NON_EXECUTABLE.has(ext)) {
            setOutput(
                `⚠️  "${activeFile.name}" (${ext.toUpperCase()}) cannot be executed.\n\n` +
                `Supported languages: Python (.py), JavaScript (.js/.jsx), TypeScript (.ts/.tsx),\n` +
                `Java (.java), C (.c), C++ (.cpp), Go (.go), Rust (.rs), PHP (.php), Ruby (.rb),\n` +
                `C# (.cs), Kotlin (.kt), Swift (.swift), Bash (.sh)\n\n` +
                `💡 For HTML/CSS files, open the sidebar ▶ Run → Preview tab.`
            )
            toast.error(`${ext.toUpperCase()} files cannot be executed`)
            return
        }

        setIsRunning(true)
        setOutput('⏳ Running...')

        const detectedLang = EXT_TO_LANG[ext] || selectedLanguage.language
        const langToUse =
            supportedLanguages.find(
                (l) => l.language === detectedLang || l.aliases?.includes(detectedLang)
            ) || selectedLanguage

        try {
            const response = await axiosInstance.post('/execute', {
                language: langToUse.language,
                version: langToUse.version,
                files: [{ name: activeFile.name, content: activeFile.content || '' }],
                stdin: input,
                compile_timeout: 10000,
                run_timeout: 5000,
            })

            const result = response.data
            let out = ''
            if (result.compile?.stdout) out += `[Compile Output]\n${result.compile.stdout}\n`
            if (result.compile?.stderr) out += `[Compile Errors]\n${result.compile.stderr}\n`
            if (result.run?.stdout) out += result.run.stdout
            if (result.run?.stderr) out += `${out.endsWith('\n') || !out ? '' : '\n'}[Stderr]\n${result.run.stderr}`

            setOutput(out.trim() || '(no output)')

            const hasCompileErr = Boolean(result.compile?.stderr?.trim())
            const hasRunErr = Boolean(result.run?.stderr?.trim()) || (result.run?.code !== undefined && result.run?.code !== 0)

            if (hasCompileErr) {
                toast.error('Compilation error')
            } else if (hasRunErr) {
                toast.error('Runtime error occurred')
            } else {
                toast.success('Executed successfully')
            }
        } catch (error: any) {
            const status = error?.response?.status
            let msg = ''
            if (status === 400) {
                msg = `❌  Bad request — language "${langToUse.language}" may not be supported.\nTry selecting a different language.`
            } else if (status === 429) {
                msg = `❌  Rate limited — please wait a moment and try again.`
            } else if (status === 502 || status === 503) {
                msg = `❌  Code execution service is temporarily unreachable.\nPlease try again in a few moments.`
            } else {
                msg = `❌  ${error?.response?.data?.error || error?.message || 'Unknown error'}\n\nMake sure the server is running on ${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}.`
            }
            setOutput(msg)
            toast.error('Execution failed')
        } finally {
            setIsRunning(false)
        }
    }

    const value: RunContext = {
        setInput,
        output,
        isRunning,
        supportedLanguages,
        selectedLanguage,
        setSelectedLanguage,
        runCode,
    }

    return (
        <RunCodeContext.Provider value={value}>
            {children}
        </RunCodeContext.Provider>
    )
}

export function useRunCode() {
    const context = useContext(RunCodeContext)
    if (context === undefined) {
        throw new Error('useRunCode must be used within a RunCodeProvider')
    }
    return context
}

export default RunCodeContext
