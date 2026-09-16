import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useFileSystem } from './FileContext'
import axiosInstance from '../api/pistonApi'
import { Language, RunContext } from '../types/run'
import toast from 'react-hot-toast'

const RunCodeContext = createContext<RunContext | undefined>(undefined)

interface RunCodeProviderProps {
    children: ReactNode
}

export function RunCodeProvider({ children }: RunCodeProviderProps) {
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('')
    const [isRunning, setIsRunning] = useState(false)
    const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: 'javascript',
        version: '18.15.0',
        aliases: ['js']
    })
    
    const { activeFile } = useFileSystem()

    // Fetch supported languages from Piston API
    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                console.log('Fetching languages from Piston API...')
                const response = await axiosInstance.get('/runtimes')
                console.log('Languages fetched successfully:', response.data.length, 'languages')
                setSupportedLanguages(response.data)
            } catch (error: any) {
                console.error('Error fetching supported languages:', error)
                console.error('Error details:', {
                    message: error?.message || 'Unknown error',
                    status: error?.response?.status || 'No status',
                    statusText: error?.response?.statusText || 'No status text',
                    data: error?.response?.data || 'No response data',
                    code: error?.code || 'No error code'
                })
                toast.error('Failed to load supported languages. Check console for details.')
                
                // Set a fallback list of common languages
                setSupportedLanguages([
                    { language: 'javascript', version: '18.15.0', aliases: ['js'] },
                    { language: 'python', version: '3.10.0', aliases: ['py'] },
                    { language: 'java', version: '15.0.2', aliases: [] },
                    { language: 'cpp', version: '10.2.0', aliases: ['c++'] },
                    { language: 'c', version: '10.2.0', aliases: [] }
                ])
            }
        }
        fetchLanguages()
    }, [])

    // Run code for single file only
    const runCode = async () => {
        if (!activeFile) {
            setOutput('No file selected')
            return
        }

        setIsRunning(true)
        setOutput('Running...')

        try {
            // Auto-detect language from file extension
            const fileExtension = activeFile.name.split('.').pop()?.toLowerCase()
            let detectedLanguage = selectedLanguage.language
            
            // Map file extensions to language names
            const extensionToLanguage: { [key: string]: string } = {
                'js': 'javascript',
                'jsx': 'javascript', 
                'ts': 'typescript',
                'tsx': 'typescript',
                'py': 'python',
                'java': 'java',
                'cpp': 'cpp',
                'cxx': 'cpp',
                'cc': 'cpp',
                'c': 'c',
                'go': 'go',
                'rs': 'rust',
                'php': 'php',
                'rb': 'ruby',
                'cs': 'csharp',
                'kt': 'kotlin',
                'swift': 'swift'
            }
            
            if (fileExtension && extensionToLanguage[fileExtension]) {
                detectedLanguage = extensionToLanguage[fileExtension]
            }
            
            // Find the correct language and version from supported languages
            const languageToUse = supportedLanguages.find(lang => 
                lang.language === detectedLanguage || 
                lang.aliases?.includes(detectedLanguage)
            ) || selectedLanguage
            
            console.log('Executing code with Piston API...')
            console.log('File:', activeFile.name, 'Extension:', fileExtension)
            console.log('Detected Language:', detectedLanguage, 'Using:', languageToUse.language, 'Version:', languageToUse.version)
            
            const response = await axiosInstance.post('/execute', {
                language: languageToUse.language,
                version: languageToUse.version,
                files: [{
                    name: activeFile.name,
                    content: activeFile.content || ''
                }],
                stdin: input,
                compile_timeout: 10000,
                run_timeout: 3000
            })

            console.log('Execution response:', response.data)
            const result = response.data
            let output = ''

            if (result.compile && result.compile.stdout) {
                output += 'Compile Output:\n' + result.compile.stdout + '\n'
            }
            if (result.compile && result.compile.stderr) {
                output += 'Compile Errors:\n' + result.compile.stderr + '\n'
            }
            if (result.run && result.run.stdout) {
                output += 'Output:\n' + result.run.stdout + '\n'
            }
            if (result.run && result.run.stderr) {
                output += 'Runtime Errors:\n' + result.run.stderr + '\n'
            }

            setOutput(output || 'No output')
            if (result.run?.stderr) {
                toast.error('Runtime error occurred')
            } else {
                toast.success('Code executed successfully')
            }
        } catch (error: any) {
            console.error('Code execution error:', error)
            console.error('Error details:', {
                message: error?.message || 'Unknown error',
                status: error?.response?.status || 'No status',
                statusText: error?.response?.statusText || 'No status text', 
                data: error?.response?.data || 'No response data',
                code: error?.code || 'No error code',
                config: error?.config ? {
                    url: error.config.url,
                    method: error.config.method,
                    baseURL: error.config.baseURL,
                    data: error.config.data
                } : 'No config'
            })
            
            let errorMessage = 'Error: '
            if (error?.response?.status === 400) {
                errorMessage += 'Bad Request - Invalid request format or unsupported language/version'
                if (error?.response?.data) {
                    errorMessage += `\nServer response: ${JSON.stringify(error.response.data)}`
                }
            } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
                errorMessage += 'Network Error - Unable to connect to code execution service. Please check your internet connection.'
            } else if (error?.response?.status) {
                errorMessage += `HTTP ${error.response.status}: ${error.response.statusText || 'Unknown error'}`
            } else {
                errorMessage += error?.message || 'Unknown error occurred'
            }
            
            setOutput(errorMessage)
            toast.error('Code execution failed - Check console for details')
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
        runCode
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
