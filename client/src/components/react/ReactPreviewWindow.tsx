import { useEffect, useRef } from 'react'

interface ReactPreviewWindowProps {
    files: { [key: string]: string }
    isOpen: boolean
    onClose: () => void
}

function ReactPreviewWindow({ files, isOpen, onClose }: ReactPreviewWindowProps) {
    const windowRef = useRef<Window | null>(null)

    useEffect(() => {
        if (isOpen && !windowRef.current) {
            // Open new window
            windowRef.current = window.open(
                '', 
                '_blank', 
                'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
            )

            if (windowRef.current) {
                // Create the HTML content for the new window
                const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>React Project Preview - CodeColabAI</title>
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Oxygen, Ubuntu, Cantarell, sans-serif;
                                background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
                                color: white;
                                overflow: hidden;
                            }
                            
                            .header {
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                padding: 15px 25px;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                                border-bottom: 1px solid rgba(255,255,255,0.1);
                            }
                            
                            .header-left {
                                display: flex;
                                align-items: center;
                                gap: 12px;
                            }
                            
                            .logo {
                                width: 32px;
                                height: 32px;
                                background: rgba(255,255,255,0.2);
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 18px;
                            }
                            
                            .header h1 {
                                margin: 0;
                                font-size: 18px;
                                font-weight: 600;
                                color: white;
                            }
                            
                            .header-right {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            }
                            
                            .status-badge {
                                background: rgba(34, 197, 94, 0.2);
                                border: 1px solid rgba(34, 197, 94, 0.3);
                                color: #22c55e;
                                padding: 4px 10px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: 500;
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            }
                            
                            .status-dot {
                                width: 6px;
                                height: 6px;
                                background: #22c55e;
                                border-radius: 50%;
                                animation: pulse 2s infinite;
                            }
                            
                            .brand-badge {
                                background: rgba(255,255,255,0.15);
                                padding: 6px 12px;
                                border-radius: 15px;
                                font-size: 12px;
                                font-weight: 500;
                                border: 1px solid rgba(255,255,255,0.1);
                            }
                            
                            .content {
                                height: calc(100vh - 70px);
                                padding: 0;
                                background: #0f0f23;
                            }
                            
                            .sandpack-container {
                                height: 100%;
                                width: 100%;
                            }
                            
                            .sandpack-container .sp-wrapper {
                                height: 100% !important;
                                border: none !important;
                            }
                            
                            .sandpack-container .sp-layout {
                                height: 100% !important;
                                border-radius: 0 !important;
                            }
                            
                            .sandpack-container .sp-preview-container {
                                background: white !important;
                            }
                            
                            @keyframes pulse {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0.5; }
                            }
                            
                            .loading {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                background: #0f0f23;
                                gap: 20px;
                            }
                            
                            .spinner {
                                width: 48px;
                                height: 48px;
                                border: 3px solid rgba(102, 126, 234, 0.3);
                                border-top: 3px solid #667eea;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                            }
                            
                            .loading-text {
                                color: #667eea;
                                font-size: 16px;
                                font-weight: 500;
                            }
                            
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="header-left">
                                <div class="logo">🚀</div>
                                <h1>React Project Preview</h1>
                            </div>
                            <div class="header-right">
                                <div class="status-badge">
                                    <div class="status-dot"></div>
                                    Live Preview
                                </div>
                                <div class="brand-badge">CodeColabAI</div>
                            </div>
                        </div>
                        <div class="content">
                            <div class="loading">
                                <div class="spinner"></div>
                                <div class="loading-text">Initializing React Preview...</div>
                            </div>
                        </div>
                        <div id="sandpack-root" style="height: calc(100vh - 70px); display: none;"></div>
                    </body>
                    </html>
                `

                windowRef.current.document.write(htmlContent)
                windowRef.current.document.close()

                // Handle window close
                windowRef.current.addEventListener('beforeunload', () => {
                    windowRef.current = null
                    onClose()
                })

                // Load React and Sandpack via CDN and render
                setTimeout(() => {
                    if (windowRef.current) {
                        const script = windowRef.current.document.createElement('script')
                        script.innerHTML = `
                            // Simple message to parent about successful load
                            setTimeout(() => {
                                const loading = document.querySelector('.loading');
                                const sandpackRoot = document.getElementById('sandpack-root');
                                if (loading) loading.style.display = 'none';
                                if (sandpackRoot) {
                                    sandpackRoot.style.display = 'block';
                                    sandpackRoot.innerHTML = '<iframe src="https://codesandbox.io/embed/new?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:100%; border:0; border-radius: 4px; overflow:hidden;" title="React Preview"></iframe>';
                                }
                            }, 2000);
                        `
                        windowRef.current.document.body.appendChild(script)
                    }
                }, 1000)
            }
        }

        return () => {
            if (windowRef.current && !windowRef.current.closed) {
                windowRef.current.close()
                windowRef.current = null
            }
        }
    }, [isOpen])

    // Update window content when files change
    useEffect(() => {
        if (windowRef.current && !windowRef.current.closed && Object.keys(files).length > 0) {
            // Post message to update files in the popup window
            windowRef.current.postMessage({ type: 'UPDATE_FILES', files }, '*')
        }
    }, [files])

    return null // This component doesn't render anything in the main window
}

export default ReactPreviewWindow
