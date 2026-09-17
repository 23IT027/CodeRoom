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

    // Fetch supported languages from Piston API
    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const response = await axiosInstance.get('/runtimes')
                setSupportedLanguages(response.data)
            } catch {
                // Fallback list if Piston is unreachable
                setSupportedLanguages([
                    { language: 'javascript', version: '18.15.0', aliases: ['js', 'node'] },
                    { language: 'python', version: '3.10.0', aliases: ['py', 'python3'] },
                    { language: 'java', version: '15.0.2', aliases: [] },
                    { language: 'cpp', version: '10.2.0', aliases: ['c++'] },
                    { language: 'c', version: '10.2.0', aliases: ['gcc'] },
                    { language: 'typescript', version: '5.0.3', aliases: ['ts'] },
                    { language: 'go', version: '1.16.2', aliases: [] },
                    { language: 'rust', version: '1.50.0', aliases: ['rs'] },
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
            if (result.run?.stderr) out += `\n[Stderr]\n${result.run.stderr}`

            setOutput(out.trim() || '(no output)')

            if (result.run?.stderr) toast.error('Runtime error occurred')
            else toast.success('Executed successfully')
        } catch (error: any) {
            const status = error?.response?.status
            let msg = ''
            if (status === 401 || status === 403) {
                msg =
                    `❌  The Piston code execution API is currently restricted.\n\n` +
                    `The public Piston API (emkc.org) now requires authentication.\n\n` +
                    `💡 Workaround: Self-host Piston locally:\n` +
                    `   docker run -dp 2000:2000 ghcr.io/engineer-man/piston\n` +
                    `   Then set VITE_PISTON_URL=http://localhost:2000/api/v2 in .env`
            } else if (status === 400) {
                msg = `❌  Bad request — language "${langToUse.language}" may not be supported.\nTry selecting a different language.`
            } else if (status === 429) {
                msg = `❌  Rate limited — please wait a moment and try again.`
            } else {
                msg = `❌  ${error?.message || 'Unknown error'}`
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
