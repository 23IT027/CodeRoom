import { useAppContext } from "@/context/AppContext"
import { RemoteUser, USER_CONNECTION_STATUS } from "@/types/user"
import CallButtons from "@/components/call/CallButtons"
import Avatar from "react-avatar"

function Users() {
    const { users, currentUser } = useAppContext()
    // Never show the current user in the list — they can't call themselves
    const otherUsers = users.filter((u) => u.username !== currentUser.username)

    return (
        <div className="flex min-h-[200px] flex-grow justify-center overflow-y-auto py-2">
            <div className="flex h-full w-full flex-wrap items-start gap-x-2 gap-y-6">
                {otherUsers.map((user) => {
                    return <User key={user.socketId} user={user} />
                })}
            </div>
        </div>
    )
}

const User = ({ user }: { user: RemoteUser }) => {
    const { username, status } = user
    const title = `${username} - ${status === USER_CONNECTION_STATUS.ONLINE ? "online" : "offline"}`
    const isOnline = status === USER_CONNECTION_STATUS.ONLINE

    return (
        <div
            className="relative flex w-[100px] flex-col items-center gap-2"
            title={title}
        >
            <Avatar name={username} size="50" round={"12px"} title={title} />
            <p className="line-clamp-2 max-w-full text-ellipsis break-words">
                {username}
            </p>

            {/* Call buttons - only show for online users */}
            {isOnline && (
                <div className="mt-1">
                    <CallButtons user={user} />
                </div>
            )}

            <div
                className={`absolute right-5 top-0 h-3 w-3 rounded-full ${isOnline ? "bg-green-500" : "bg-danger"
                    }`}
            ></div>
        </div>
    )
}

export default Users
