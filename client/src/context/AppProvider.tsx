import { ReactNode } from "react"
import { AppContextProvider } from "./AppContext.js"
import { ChatContextProvider } from "./ChatContext.jsx"
import { FileContextProvider } from "./FileContext.jsx"
import { RunCodeProvider } from "./RunCodeContext.tsx"
import { SettingContextProvider } from "./SettingContext.jsx"
import { SocketProvider } from "./SocketContext.jsx"
import { ViewContextProvider } from "./ViewContext.js"
import { CopilotContextProvider } from "./CopilotContext.js"
import WebRTCProvider from "./WebRTCContext.tsx"
import VoiceProvider from "./VoiceContext.tsx"
import { PopupProvider } from "./PopupContext.tsx"

function AppProvider({ children }: { children: ReactNode }) {
    return (
        <AppContextProvider>
            <SocketProvider>
                <WebRTCProvider>
                    <VoiceProvider>
                        <SettingContextProvider>
                            <ViewContextProvider>
                                <FileContextProvider>
                                    <CopilotContextProvider>
                                        <RunCodeProvider>
                                            <PopupProvider>
                                                <ChatContextProvider>
                                                    {children}
                                                </ChatContextProvider>
                                            </PopupProvider>
                                        </RunCodeProvider>
                                    </CopilotContextProvider>
                                </FileContextProvider>
                            </ViewContextProvider>
                        </SettingContextProvider>
                    </VoiceProvider>
                </WebRTCProvider>
            </SocketProvider>
        </AppContextProvider>
    )
}

export default AppProvider
