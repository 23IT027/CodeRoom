import { ReactNode } from "react"
import { AuthProvider } from "./AuthContext.tsx"
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
import { RoomLogsProvider } from "./RoomLogsContext.tsx"

function AppProvider({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <AppContextProvider>
                <SocketProvider>
                    <WebRTCProvider>
                        <VoiceProvider>
                            <RoomLogsProvider>
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
                            </RoomLogsProvider>
                        </VoiceProvider>
                    </WebRTCProvider>
                </SocketProvider>
            </AppContextProvider>
        </AuthProvider>
    )
}

export default AppProvider
