import { Sandpack, SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react"
import { useFileSystem } from "@/context/FileContext"
import { useState, useEffect } from "react"
import { LuExternalLink, LuRefreshCw, LuMaximize2 } from "react-icons/lu"
import toast from "react-hot-toast"
import ReactPreviewWindow from "./ReactPreviewWindow"

interface ReactProjectViewerProps {
    isVisible: boolean
}

function ReactProjectViewer({ isVisible }: ReactProjectViewerProps) {
    const { fileStructure } = useFileSystem()
    const [files, setFiles] = useState<{ [key: string]: string }>({})
    const [isReactProject, setIsReactProject] = useState(false)
    const [key, setKey] = useState(0) // For forcing refresh
    const [isWindowOpen, setIsWindowOpen] = useState(false)
    const [viewMode] = useState<'preview-only' | 'split-view'>('preview-only')

    // Open preview in new window with better implementation - Preview only
    const openInNewWindow = () => {
        const newWindow = window.open('', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes')
        if (newWindow) {
            // Convert files to HTML template for standalone preview
            const createStandaloneHTML = () => {
                const currentFiles = defaultFiles as { [key: string]: string }
                const appCode = currentFiles['/App.js'] || currentFiles['/src/App.js'] || ''
                const cssCode = currentFiles['/App.css'] || currentFiles['/src/App.css'] || ''
                
                return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>React Project Preview - CodeColabAI</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
                            color: white;
                            overflow-x: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 12px 20px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                            border-bottom: 1px solid rgba(255,255,255,0.1);
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            z-index: 1000;
                        }
                        .header-left { display: flex; align-items: center; gap: 12px; }
                        .logo {
                            width: 32px; height: 32px;
                            background: rgba(255,255,255,0.2);
                            border-radius: 6px;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 16px;
                        }
                        .header h1 { font-size: 16px; font-weight: 600; color: white; }
                        .status-badge {
                            background: rgba(34, 197, 94, 0.2);
                            border: 1px solid rgba(34, 197, 94, 0.3);
                            color: #22c55e; padding: 4px 8px; border-radius: 10px;
                            font-size: 11px; font-weight: 500;
                            display: flex; align-items: center; gap: 4px;
                        }
                        .status-dot {
                            width: 6px; height: 6px; background: #22c55e; border-radius: 50%;
                            animation: pulse 2s infinite;
                        }
                        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                        .content { 
                            margin-top: 50px; 
                            height: calc(100vh - 50px); 
                            padding: 0; 
                            background: white;
                        }
                        #root { height: 100%; }
                        ${cssCode}
                    </style>
                    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
                    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                </head>
                <body>
                    <div class="header">
                        <div class="header-left">
                            <div class="logo">🚀</div>
                            <h1>React Project Preview</h1>
                        </div>
                        <div class="status-badge">
                            <div class="status-dot"></div>
                            Live Preview
                        </div>
                    </div>
                    <div class="content">
                        <div id="root"></div>
                    </div>
                    
                    <script type="text/babel">
                        ${appCode.replace('export default App;', '')}
                        
                        const root = ReactDOM.createRoot(document.getElementById('root'));
                        root.render(React.createElement(App));
                    </script>
                </body>
                </html>
                `
            }

            newWindow.document.write(createStandaloneHTML())
            newWindow.document.close()
            toast.success('🚀 Preview opened in new window!')
            setIsWindowOpen(true)
            
            // Handle window close
            const checkClosed = setInterval(() => {
                if (newWindow.closed) {
                    clearInterval(checkClosed)
                    setIsWindowOpen(false)
                }
            }, 1000)
        } else {
            toast.error('❌ Failed to open new window. Please check popup blockers.')
        }
    }

    // Refresh the preview
    const refreshPreview = () => {
        setKey(prev => prev + 1)
        toast.success('Preview refreshed!')
    }
    // Convert file structure to Sandpack format with persistence
    useEffect(() => {
        const sandpackFiles: { [key: string]: string } = {}
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
                        
                        // Include relevant files for Sandpack
                        if (
                            item.name.endsWith('.js') ||
                            item.name.endsWith('.jsx') ||
                            item.name.endsWith('.ts') ||
                            item.name.endsWith('.tsx') ||
                            item.name.endsWith('.css') ||
                            item.name.endsWith('.html') ||
                            item.name === 'package.json'
                        ) {
                            // Map to Sandpack expected paths
                            let sandpackPath = fullPath
                            
                            // Handle common React file structure mappings
                            if (fullPath.startsWith('src/')) {
                                sandpackPath = `/${fullPath}`
                            } else if (fullPath.startsWith('public/')) {
                                sandpackPath = `/${fullPath}`
                            } else if (fullPath === 'package.json') {
                                sandpackPath = '/package.json'
                            } else {
                                sandpackPath = `/${fullPath}`
                            }
                            
                            sandpackFiles[sandpackPath] = item.content || ''
                        }
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
            if (Object.keys(sandpackFiles).length > 0) {
                // Preserve any custom changes while updating from shared structure
                const mergedFiles = { ...prevFiles, ...sandpackFiles }
                return mergedFiles
            }
            // If no fileStructure but we have existing files, keep them
            return Object.keys(prevFiles).length > 0 ? prevFiles : getDefaultFiles()
        })
        
        // Update React project status
        setIsReactProject(hasReactFiles || Object.keys(sandpackFiles).some(path => 
            path.includes('react') || path.includes('App.js') || path.includes('App.jsx')
        ))
    }, [fileStructure])

    if (!isVisible || !isReactProject) {
        return null
    }

    // Default files if none found - comprehensive React project structure
    const getDefaultFiles = () => ({
        "/App.js": `import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Welcome to CodeColabAI!');

  const messages = [
    'Welcome to CodeColabAI!',
    'Building amazing React apps together!',
    'Collaborative coding made easy!',
    'Your ideas, our platform!',
    'Code, collaborate, create!'
  ];

  const changeMessage = () => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    setMessage(messages[randomIndex]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo">🚀</div>
        <h1>React Project Preview</h1>
        <p className="message">{message}</p>
        
        <div className="counter-section">
          <h2>Counter: <span className="count">{count}</span></h2>
          <div className="button-group">
            <button 
              className="btn btn-increment" 
              onClick={() => setCount(count + 1)}
            >
              + Increment
            </button>
            <button 
              className="btn btn-decrement" 
              onClick={() => setCount(count - 1)}
            >
              - Decrement
            </button>
            <button 
              className="btn btn-reset" 
              onClick={() => setCount(0)}
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
        
        <div className="info-section">
          <p>Edit <code>src/App.js</code> and save to see changes!</p>
          <p>Built with ❤️ using <strong>CodeColabAI</strong></p>
        </div>
      </header>
    </div>
  );
}

export default App;`,
        "/App.css": `.App {
  text-align: center;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px;
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

.message {
  font-size: 1.2rem;
  margin: 20px 0;
  padding: 15px 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
}

.counter-section {
  margin: 30px 0;
  padding: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
}

.count {
  color: #ffeb3b;
  font-weight: bold;
  font-size: 1.5em;
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
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
}

.btn:active {
  transform: translateY(-1px);
}

.info-section {
  margin-top: 40px;
  font-size: 16px;
  opacity: 0.9;
  z-index: 1;
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
}`,
        "/index.js": `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        "/index.css": `body {
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

    const defaultFiles = Object.keys(files).length === 0 ? getDefaultFiles() : files

    return (
        <div className="w-full h-full flex flex-col">
            {/* ReactPreviewWindow component for handling popup window */}
            <ReactPreviewWindow 
                files={defaultFiles}
                isOpen={isWindowOpen}
                onClose={() => setIsWindowOpen(false)}
            />
            
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <h3 className="text-blue-300 font-semibold text-lg">🚀 React Project Preview</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* <button
                            onClick={() => setViewMode(viewMode === 'preview-only' ? 'split-view' : 'preview-only')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-all duration-200 hover:scale-105"
                            title={viewMode === 'preview-only' ? "Show Code Editor" : "Hide Code Editor"}
                        >
                            <LuCode size={14} />
                            {viewMode === 'preview-only' ? 'Show Code' : 'Hide Code'}
                        </button> */}
                        <button
                            onClick={refreshPreview}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-all duration-200 hover:scale-105"
                            title="Refresh Preview"
                        >
                            <LuRefreshCw size={14} />
                            Refresh
                        </button>
                        <button
                            onClick={openInNewWindow}
                            className={`flex items-center gap-2 px-3 py-1.5 text-white text-sm rounded-md transition-all duration-200 hover:scale-105 ${
                                isWindowOpen 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                            title={isWindowOpen ? "Window is open" : "Open in New Window"}
                        >
                            <LuExternalLink size={14} />
                            {isWindowOpen ? 'Opened' : 'Pop Out'}
                        </button>
                    </div>
                </div>
                <p className="text-blue-200 text-sm opacity-80">
                    Live preview powered by Sandpack. Changes to your files will be reflected here in real-time.
                    {isWindowOpen && (
                        <span className="ml-2 text-green-300">• Preview window is open</span>
                    )}
                </p>
            </div>
            
            {/* Sandpack Container with Preview-Only Mode */}
            <div className="flex-1 rounded-lg overflow-hidden border border-gray-600/30 bg-gray-900/50">
                {viewMode === 'preview-only' ? (
                    <SandpackProvider
                        template="react"
                        files={defaultFiles}
                        theme="dark"
                        customSetup={{
                            dependencies: {
                                "react": "^18.2.0",
                                "react-dom": "^18.2.0"
                            }
                        }}
                    >
                        <SandpackPreview
                            style={{ height: '100%', minHeight: '400px' }}
                            showOpenInCodeSandbox={false}
                            showRefreshButton={false}
                            actionsChildren={
                                <button
                                    onClick={openInNewWindow}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                    title="Open in New Window"
                                >
                                    <LuMaximize2 size={12} />
                                </button>
                            }
                        />
                    </SandpackProvider>
                ) : (
                    <Sandpack
                        key={key}
                        template="react"
                        files={defaultFiles}
                        theme="dark"
                        options={{
                            showNavigator: true,
                            showInlineErrors: true,
                            showLineNumbers: true,
                            editorHeight: 350,
                            layout: "preview",
                            closableTabs: true,
                            autoReload: true,
                            recompileMode: "immediate",
                            initMode: "lazy"
                        }}
                        customSetup={{
                            dependencies: {
                                "react": "^18.2.0",
                                "react-dom": "^18.2.0"
                            }
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default ReactProjectViewer
