import { useFileSystem } from "@/context/FileContext"
import { useState, useEffect, useRef } from "react"
import { LuRefreshCw, LuExternalLink } from "react-icons/lu"
import toast from "react-hot-toast"
import sdk from '@stackblitz/sdk'

interface StackBlitzViewerProps {
    isVisible: boolean
}

function StackBlitzViewer({ isVisible }: StackBlitzViewerProps) {
    const { fileStructure } = useFileSystem()
    const [files, setFiles] = useState<{ [key: string]: string }>({})
    const [isReactProject, setIsReactProject] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const embedContainerRef = useRef<HTMLDivElement>(null)

    // Get default StackBlitz project files
    const getDefaultStackBlitzProject = () => ({
        "package.json": `{
  "name": "codecolabaí-react-project",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "react-router-dom": "^6.8.1",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.263.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}`,
        "public/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodeColabAI React Project</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
        "src/index.js": `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        "src/App.js": `import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Welcome to CodeColabAI!');
  const [isLoaded, setIsLoaded] = useState(false);

  const messages = [
    'Welcome to CodeColabAI! 🚀',
    'Building amazing React apps together! 💻',
    'Collaborative coding made easy! 🤝',
    'Your ideas, our platform! 💡',
    'Code, collaborate, create! ✨',
    'React development simplified! ⚛️'
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoaded(true), 500);
  }, []);

  const changeMessage = () => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    setMessage(messages[randomIndex]);
  };

  const incrementCount = () => setCount(prev => prev + 1);
  const decrementCount = () => setCount(prev => prev - 1);
  const resetCount = () => setCount(0);

  if (!isLoaded) {
    return (
      <div className="App">
        <div className="loading-screen">
          <div className="loading-spinner">🚀</div>
          <p>Loading CodeColabAI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo">🚀</div>
        <h1>CodeColabAI React Project</h1>
        <p className="message">{message}</p>
        
        <div className="counter-section">
          <h2>Interactive Counter</h2>
          <div className="count-display">
            <span className="count">{count}</span>
          </div>
          <div className="button-group">
            <button 
              className="btn btn-increment" 
              onClick={incrementCount}
              aria-label="Increment counter"
            >
              ➕ Increment
            </button>
            <button 
              className="btn btn-decrement" 
              onClick={decrementCount}
              aria-label="Decrement counter"
            >
              ➖ Decrement
            </button>
            <button 
              className="btn btn-reset" 
              onClick={resetCount}
              aria-label="Reset counter"
            >
              🔄 Reset
            </button>
          </div>
        </div>
        
        <div className="action-section">
          <button className="btn btn-message" onClick={changeMessage}>
            🎲 Change Message
          </button>
        </div>
        
        <div className="features-section">
          <h3>✨ Features</h3>
          <ul className="features-list">
            <li>🔄 Real-time collaboration</li>
            <li>📝 Live code editing</li>
            <li>🚀 Instant deployment</li>
            <li>🎨 Beautiful UI components</li>
          </ul>
        </div>
        
        <div className="info-section">
          <p>Edit <code>src/App.js</code> and save to see changes!</p>
          <p>Built with ❤️ using <strong>CodeColabAI</strong></p>
          <p className="version">Version 1.0.0 • React {React.version}</p>
        </div>
      </header>
    </div>
  );
}

export default App;`,
        "src/App.css": `.App {
  text-align: center;
  min-height: 100vh;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.loading-spinner {
  font-size: 4rem;
  animation: bounce 1s infinite;
  margin-bottom: 20px;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  position: relative;
  overflow: hidden;
}

.App-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.logo {
  font-size: 4rem;
  margin-bottom: 20px;
  animation: bounce 2s infinite;
  z-index: 1;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

h1 {
  margin: 20px 0;
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  z-index: 1;
}

h2 {
  margin-bottom: 15px;
  font-size: 1.5rem;
  z-index: 1;
}

h3 {
  margin-bottom: 15px;
  font-size: 1.3rem;
  z-index: 1;
}

.message {
  font-size: 1.2rem;
  margin: 20px 0;
  padding: 15px 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  max-width: 600px;
}

.counter-section {
  margin: 30px 0;
  padding: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  max-width: 500px;
  width: 100%;
}

.count-display {
  margin: 20px 0;
  padding: 15px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 15px;
}

.count {
  color: #ffeb3b;
  font-weight: bold;
  font-size: 3rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.button-group {
  display: flex;
  gap: 15px;
  margin-top: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-section {
  margin: 20px 0;
  z-index: 1;
}

.features-section {
  margin: 30px 0;
  padding: 25px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  max-width: 400px;
  width: 100%;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features-list li {
  padding: 8px 0;
  font-size: 1rem;
  opacity: 0.9;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  min-width: 120px;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn-increment {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.btn-decrement {
  background: linear-gradient(45deg, #f44336, #da190b);
  color: white;
}

.btn-reset {
  background: linear-gradient(45deg, #ff9800, #e68900);
  color: white;
}

.btn-message {
  background: linear-gradient(45deg, #9c27b0, #7b1fa2);
  color: white;
  padding: 15px 30px;
  font-size: 18px;
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
}

.btn:active {
  transform: translateY(-1px);
}

.btn:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.info-section {
  margin-top: 40px;
  font-size: 16px;
  opacity: 0.9;
  z-index: 1;
  max-width: 600px;
}

.version {
  font-size: 14px;
  opacity: 0.7;
  margin-top: 10px;
}

code {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

strong {
  color: #ffeb3b;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

/* Responsive design */
@media (max-width: 768px) {
  .App-header {
    padding: 20px 15px;
    font-size: calc(8px + 2vmin);
  }
  
  h1 {
    font-size: 2rem;
  }
  
  .counter-section,
  .features-section {
    margin: 20px 10px;
    padding: 20px;
  }
  
  .button-group {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 200px;
  }
  
  .count {
    font-size: 2.5rem;
  }
}`,
        "src/index.css": `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #0f0f23;
}

* {
  box-sizing: border-box;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}`
    })

    // Convert file structure to StackBlitz format with persistence
    useEffect(() => {
        const stackBlitzFiles: { [key: string]: string } = {}
        let hasReactFiles = false

        // If fileStructure exists, process it
        if (fileStructure?.children) {
            const processFiles = (items: any[], basePath = '') => {
                items.forEach(item => {
                    if (item.type === 'file') {
                        const fullPath = basePath ? `${basePath}/${item.name}` : item.name
                        
                        // Check if it's a React-related file
                        if (item.name === 'package.json' && item.content) {
                            try {
                                const pkg = JSON.parse(item.content)
                                if (pkg.dependencies?.react || pkg.devDependencies?.react) {
                                    hasReactFiles = true
                                }
                            } catch (e) {
                                // Invalid JSON, skip
                            }
                        }
                        
                        // Include all relevant files
                        stackBlitzFiles[fullPath] = item.content || ''
                    } else if (item.type === 'directory' && item.children) {
                        const newBasePath = basePath ? `${basePath}/${item.name}` : item.name
                        processFiles(item.children, newBasePath)
                    }
                })
            }

            processFiles(fileStructure.children)
        }
        
        // Always update files - merge with existing files to preserve user changes
        setFiles(prevFiles => {
            // If we have new files from fileStructure, merge them
            if (Object.keys(stackBlitzFiles).length > 0) {
                // Preserve any custom changes while updating from shared structure
                const mergedFiles = { ...prevFiles, ...stackBlitzFiles }
                return mergedFiles
            }
            // If no fileStructure but we have existing files, keep them
            return Object.keys(prevFiles).length > 0 ? prevFiles : getDefaultStackBlitzProject()
        })
        
        // Update React project status
        setIsReactProject(hasReactFiles || Object.keys(stackBlitzFiles).some(path => 
            path.includes('react') || path.includes('package.json')
        ))
    }, [fileStructure])

    // Initialize embedded StackBlitz project
    useEffect(() => {
        if (isVisible && isReactProject && embedContainerRef.current) {
            createEmbeddedProject()
        }
    }, [isVisible, isReactProject, files])

    // Create embedded StackBlitz project
    const createEmbeddedProject = async () => {
        if (!embedContainerRef.current) return

        try {
            setIsLoading(true)
            
            // Use current files or default project
            const projectFiles: { [key: string]: string } = Object.keys(files).length > 0 ? files : getDefaultStackBlitzProject()

            // Ensure all required files exist
            const requiredFiles = ['package.json', 'src/App.js', 'src/index.js', 'public/index.html']
            const missingFiles = requiredFiles.filter(file => !projectFiles[file])
            
            if (missingFiles.length > 0) {
                console.warn('Missing required files for embed:', missingFiles)
                // Use default project to ensure all files exist
                Object.assign(projectFiles, getDefaultStackBlitzProject())
            }

            // Clear container
            embedContainerRef.current.innerHTML = ''

            // Create StackBlitz project embedded
            await sdk.embedProject(
                embedContainerRef.current,
                {
                    title: 'CodeColabAI React Project',
                    description: 'A collaborative React project created with CodeColabAI',
                    template: 'create-react-app',
                    files: projectFiles,
                    settings: {
                        compile: {
                            trigger: 'auto',
                            action: 'refresh',
                            clearConsole: false
                        }
                    }
                },
                {
                    height: 500,
                    openFile: 'src/App.js',
                    view: 'preview',
                    hideNavigation: false,
                    hideDevTools: false,
                    forceEmbedLayout: true,
                    terminalHeight: 50
                }
            )

            toast.success('🚀 StackBlitz project loaded!')
        } catch (error) {
            console.error('Error creating StackBlitz project:', error)
            
            // Fallback to informational display
            if (embedContainerRef.current) {
                embedContainerRef.current.innerHTML = `
                    <div style="
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        height: 400px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-align: center;
                        padding: 40px;
                        border-radius: 8px;
                        margin: 20px 0;
                    ">
                        <div style="font-size: 4rem; margin-bottom: 20px;">🚀</div>
                        <h2 style="margin-bottom: 20px;">CodeColabAI React Project</h2>
                        <p style="margin-bottom: 30px; opacity: 0.9;">
                            Your React project is ready for deployment!<br>
                            All dependencies including React Router are pre-configured.
                        </p>
                        <p style="font-size: 14px; opacity: 0.7;">
                            Click the "Open StackBlitz" button to view your project<br>
                            in a new StackBlitz tab with full development environment.<br>
                            Dependencies will be automatically installed.
                        </p>
                    </div>
                `
            }
            toast.error('❌ Failed to load embedded preview')
        } finally {
            setIsLoading(false)
        }
    }

    // Open in new StackBlitz tab
    const openInNewTab = async () => {
        try {
            setIsLoading(true)
            
            // Use current files or default project
            const projectFiles: { [key: string]: string } = Object.keys(files).length > 0 ? files : getDefaultStackBlitzProject()

            // Ensure all required files exist
            const requiredFiles = ['package.json', 'src/App.js', 'src/index.js', 'public/index.html']
            const missingFiles = requiredFiles.filter(file => !projectFiles[file])
            
            if (missingFiles.length > 0) {
                console.warn('Missing required files:', missingFiles)
                // Use default project to ensure all files exist
                Object.assign(projectFiles, getDefaultStackBlitzProject())
            }

            // Open project in new tab
            await sdk.openProject(
                {
                    title: 'CodeColabAI React Project',
                    description: 'A collaborative React project created with CodeColabAI',
                    template: 'create-react-app',
                    files: projectFiles,
                    settings: {
                        compile: {
                            trigger: 'auto',
                            action: 'refresh',
                            clearConsole: false
                        }
                    }
                },
                {
                    newWindow: true,
                    openFile: 'src/App.js',
                    view: 'editor'
                }
            )

            toast.success('🚀 Project opened in StackBlitz!')
        } catch (error) {
            console.error('Error opening StackBlitz project:', error)
            toast.error('❌ Failed to open StackBlitz project: ' + (error as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    // Refresh embedded project
    const refreshProject = () => {
        if (embedContainerRef.current) {
            createEmbeddedProject()
        }
    }

    if (!isVisible) {
        return null
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-4 mb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                        <h3 className="text-purple-300 font-semibold text-lg">⚡ StackBlitz Development Environment</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshProject}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm rounded-md transition-all duration-200 hover:scale-105"
                            title="Refresh Preview"
                        >
                            <LuRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={openInNewTab}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-800 disabled:cursor-not-allowed text-white text-sm rounded-md transition-all duration-200 hover:scale-105"
                            title="Open in New Tab"
                        >
                            <LuExternalLink size={14} />
                            Open StackBlitz
                        </button>
                    </div>
                </div>
                <p className="text-purple-200 text-sm opacity-80">
                    {isReactProject 
                        ? `Full-stack development environment with ${Object.keys(files).length} files loaded.` 
                        : 'Upload React project files to enable StackBlitz integration.'
                    }
                    {isLoading && (
                        <span className="ml-2 text-pink-300">• Loading...</span>
                    )}
                </p>
            </div>
            
            {/* StackBlitz Embedded Container */}
            <div className="flex-1 rounded-lg overflow-hidden border border-gray-600/30 bg-gray-900/50 min-h-[400px]">
                {isReactProject ? (
                    <div 
                        ref={embedContainerRef}
                        className="w-full h-full"
                        style={{ minHeight: '400px' }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="text-6xl mb-6">📁</div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-4">No React Project Detected</h3>
                        <p className="text-gray-400 mb-6 max-w-md">
                            Upload a React project with package.json containing React dependencies to use StackBlitz integration.
                        </p>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                            <p className="text-sm text-gray-300 mb-2">Expected project structure:</p>
                            <code className="text-xs text-gray-400 block">
                                package.json (with React dependencies)<br/>
                                src/App.js<br/>
                                src/index.js<br/>
                                public/index.html
                            </code>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StackBlitzViewer
