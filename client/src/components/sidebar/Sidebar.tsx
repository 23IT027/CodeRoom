import SidebarButton from "@/components/sidebar/sidebar-views/SidebarButton"
import ProfilePanel from "@/components/sidebar/sidebar-views/ProfilePanel"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { useViews } from "@/context/ViewContext"
import { useAuth } from "@/context/AuthContext"
import useResponsive from "@/hooks/useResponsive"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { ACTIVITY_STATE } from "@/types/app"
import { SocketEvent } from "@/types/socket"
import { VIEWS } from "@/types/view"
import { IoCodeSlash } from "react-icons/io5"
import { MdOutlineDraw } from "react-icons/md"
import cn from "classnames"
import { Tooltip } from 'react-tooltip'
import { useState } from 'react'
import { tooltipStyles } from "./tooltipStyles"


function Sidebar() {
    const {
        activeView,
        isSidebarOpen,
        viewComponents,
        viewIcons,
        setIsSidebarOpen,
    } = useViews()
    const { minHeightReached } = useResponsive()
    const { activityState, setActivityState } = useAppContext()
    const { socket } = useSocket()
    const { isMobile } = useWindowDimensions()
    const { user, isAuthenticated } = useAuth()
    const [showTooltip, setShowTooltip] = useState(true)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const changeState = () => {
        setShowTooltip(false)
        if (activityState === ACTIVITY_STATE.CODING) {
            setActivityState(ACTIVITY_STATE.DRAWING)
            socket.emit(SocketEvent.REQUEST_DRAWING)
        } else {
            setActivityState(ACTIVITY_STATE.CODING)
        }

        if (isMobile) {
            setIsSidebarOpen(false)
        }
    }

    return (
        <aside className="flex w-full md:h-full md:max-h-full md:min-h-full md:w-auto">
            <div
                className={cn(
                    "fixed bottom-0 left-0 z-50 flex h-[50px] w-full gap-4 self-end overflow-hidden border-t border-darkHover bg-dark p-2 md:static md:h-full md:w-[50px] md:min-w-[50px] md:flex-col md:border-r md:border-t-0 md:p-2 md:pt-4 md:pb-3",
                    {
                        hidden: minHeightReached,
                    },
                )}
            >
                <SidebarButton
                    viewName={VIEWS.FILES}
                    icon={viewIcons[VIEWS.FILES]}
                />
                <SidebarButton
                    viewName={VIEWS.CHATS}
                    icon={viewIcons[VIEWS.CHATS]}
                />
                <SidebarButton
                    viewName={VIEWS.VIDEO_CALL}
                    icon={viewIcons[VIEWS.VIDEO_CALL]}
                />
                <SidebarButton
                    viewName={VIEWS.COPILOT}
                    icon={viewIcons[VIEWS.COPILOT]}
                />
                <SidebarButton
                    viewName={VIEWS.RUN}
                    icon={viewIcons[VIEWS.RUN]}
                />
                <SidebarButton
                    viewName={VIEWS.CLIENTS}
                    icon={viewIcons[VIEWS.CLIENTS]}
                />
                {/* <SidebarButton
                    viewName={VIEWS.SETTINGS}
                    icon={viewIcons[VIEWS.SETTINGS]}
                /> */}

                {/* Button to change activity state coding or drawing */}
                <div className="flex h-fit items-center justify-center">
                    <button
                        className="justify-cente flex items-center  rounded p-1.5 transition-colors duration-200 ease-in-out hover:bg-[#3D404A]"
                        onClick={changeState}
                        onMouseEnter={() => setShowTooltip(true)}
                        data-tooltip-id="activity-state-tooltip"
                        data-tooltip-content={
                            activityState === ACTIVITY_STATE.CODING
                                ? "Switch to Drawing Mode"
                                : "Switch to Coding Mode"
                        }
                    >
                        {activityState === ACTIVITY_STATE.CODING ? (
                            <MdOutlineDraw size={30} />
                        ) : (
                            <IoCodeSlash size={30} />
                        )}
                    </button>
                    {showTooltip && (
                        <Tooltip
                            id="activity-state-tooltip"
                            place="right"
                            offset={15}
                            className="!z-50"
                            style={tooltipStyles}
                            noArrow={false}
                            positionStrategy="fixed"
                            float={true}
                        />
                    )}
                </div>

                {/* Profile button — pinned to bottom on desktop */}
                {isAuthenticated && user && (
                    <div className="md:mt-auto flex h-fit items-center justify-center">
                        <button
                            onClick={() => setIsProfileOpen((prev) => !prev)}
                            className={`relative flex items-center justify-center rounded-lg p-0.5 transition-all duration-200 hover:ring-2 hover:ring-primary/50 ${
                                isProfileOpen ? "ring-2 ring-primary" : ""
                            }`}
                            title="My Profile & Room History"
                            aria-label="Open profile panel"
                            id="sidebar-profile-btn"
                        >
                            {user.picture ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="h-8 w-8 rounded-lg object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                    {user.name ? user.name[0] : "U"}
                                </div>
                            )}
                            {/* Online dot */}
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-dark" />
                        </button>
                        <Tooltip
                            anchorSelect="#sidebar-profile-btn"
                            place="right"
                            offset={15}
                            className="!z-50"
                            style={tooltipStyles}
                            positionStrategy="fixed"
                            content="My Profile & Rooms"
                        />
                    </div>
                )}

                {/* ProfilePanel */}
                <ProfilePanel
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                />
            </div>
            <div
                className="absolute left-0 top-0 z-20 w-full flex-col bg-dark md:static md:min-w-[300px]"
                style={isSidebarOpen ? {} : { display: "none" }}
            >
                {/* Render the active view component */}
                {viewComponents[activeView]}
            </div>
        </aside>
    )
}

export default Sidebar
