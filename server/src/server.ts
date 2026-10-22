import express, { Response, Request, NextFunction } from "express"
import dotenv from "dotenv"
import http from "http"
import cors from "cors"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { SocketEvent, SocketId } from "./types/socket"
import { USER_CONNECTION_STATUS, User } from "./types/user"
import { Server } from "socket.io"
import path from "path"
import speakeasy from "speakeasy"
import { OAuth2Client } from "google-auth-library"
import { spawn } from "child_process"
import { connectDB, isDBConnected } from "./db"
import { Room } from "./models/Room"
import { UserModel } from "./models/User"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || "coderoom_super_secret_jwt_key_2024"

interface JWTPayload {
	id?: string
	username: string
	displayName?: string
	email?: string
	picture?: string | null
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ""
const googleAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID)

const app = express()

app.use(express.json())

app.use(cors())

app.use(express.static(path.join(__dirname, "public"))) // Serve static files

const server = http.createServer(app)
const io = new Server(server, {
	cors: {
		origin: "*",
	},
	maxHttpBufferSize: 1e8,
	pingTimeout: 60000,
})

let userSocketMap: User[] = []

// Function to get all users in a room
function getUsersInRoom(roomId: string): User[] {
	return userSocketMap.filter((user) => user.roomId == roomId)
}

// Function to get room id by socket id
function getRoomId(socketId: SocketId): string | null {
	const roomId = userSocketMap.find(
		(user) => user.socketId === socketId
	)?.roomId

	if (!roomId) {
		console.error("Room ID is undefined for socket ID:", socketId)
		return null
	}
	return roomId
}

function getUserBySocketId(socketId: SocketId): User | null {
	const user = userSocketMap.find((user) => user.socketId === socketId)
	if (!user) {
		console.error("User not found for socket ID:", socketId)
		return null
	}
	return user
}

// Look up a user by username within a room (for stale-socketId fallback)
function getUserByUsername(roomId: string, username: string): User | null {
	return userSocketMap.find((u) => u.roomId === roomId && u.username === username) || null
}

io.on("connection", (socket) => {
	// Handle user actions
	socket.on(SocketEvent.JOIN_REQUEST, async ({ roomId, username, token }) => {
		try {
			const normalizedRoomId = String(roomId || "").trim()
			const normalizedUsername = String(username || "").trim()
			if (!normalizedRoomId || !normalizedUsername) return

			// Strict auth verification: without login nobody should join or create any room
			const authToken = token || (socket.handshake.auth && socket.handshake.auth.token)
			if (!authToken) {
				console.warn(`[Auth] Blocked unauthenticated join attempt by "${normalizedUsername}" for room "${normalizedRoomId}"`)
				io.to(socket.id).emit("error", "Authentication required to join or create a room")
				socket.disconnect(true)
				return
			}

			try {
				const decoded = jwt.verify(authToken, JWT_SECRET) as JWTPayload
				if (!decoded || (!decoded.id && !decoded.username && !decoded.email)) {
					throw new Error("Invalid token payload")
				}
			} catch (tokenErr) {
				console.warn(`[Auth] Rejected invalid token for user "${normalizedUsername}":`, tokenErr)
				io.to(socket.id).emit("error", "Invalid or expired session. Please log in again.")
				socket.disconnect(true)
				return
			}

			// Clean up previous room memberships for this socket before joining new room
			const prevEntries = userSocketMap.filter((u) => u.socketId === socket.id)
			for (const prevUser of prevEntries) {
				if (prevUser.roomId !== normalizedRoomId) {
					socket.broadcast
						.to(prevUser.roomId)
						.emit("voice-user-left", { socketId: socket.id })
					socket.broadcast
						.to(prevUser.roomId)
						.emit(SocketEvent.USER_DISCONNECTED, { user: prevUser })
					socket.leave(prevUser.roomId)
				}
			}
			userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)

			// Check is username exist in the room (ignoring this socket)
			const isUsernameExist = getUsersInRoom(normalizedRoomId).filter(
				(u) => u.username.toLowerCase() === normalizedUsername.toLowerCase() && u.socketId !== socket.id
			)
			if (isUsernameExist.length > 0) {
				io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
				return
			}

			// Persist room + user in MongoDB (live presence stays in memory)
			if (isDBConnected()) {
				const now = new Date()
				const existing = await Room.findOne({ roomId: normalizedRoomId })

				if (!existing) {
					await Room.create({
						roomId: normalizedRoomId,
						createdBy: normalizedUsername,
						twoFa: { enabled: false },
						members: [
							{
								username: normalizedUsername,
								joinedAt: now,
								lastJoinedAt: now,
							},
						],
						lastActiveAt: now,
					})
				} else {
					const member = existing.members?.find(
						(m: { username: string }) => m.username === normalizedUsername,
					)
					if (member) {
						member.lastJoinedAt = now
					} else {
						existing.members.push({
							username: normalizedUsername,
							joinedAt: now,
							lastJoinedAt: now,
						})
					}
					existing.lastActiveAt = now
					await existing.save()
				}

				await UserModel.findOneAndUpdate(
					{ username: normalizedUsername },
					{
						$set: { lastSeenAt: now },
						$addToSet: { roomsJoined: normalizedRoomId },
						$setOnInsert: {
							username: normalizedUsername,
							displayName: normalizedUsername,
						},
					},
					{ upsert: true, new: true },
				)
			}

			const user = {
				username: normalizedUsername,
				roomId: normalizedRoomId,
				status: USER_CONNECTION_STATUS.ONLINE,
				cursorPosition: 0,
				typing: false,
				socketId: socket.id,
				currentFile: null,
			}
			userSocketMap.push(user)
			socket.join(normalizedRoomId)
			socket.broadcast.to(normalizedRoomId).emit(SocketEvent.USER_JOINED, { user })
			const users = getUsersInRoom(normalizedRoomId)
			io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })
		} catch (err) {
			console.error("JOIN_REQUEST failed:", err)
		}
	})

	socket.on("disconnecting", () => {
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.USER_DISCONNECTED, { user })
		userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)
		socket.leave(roomId)
	})

	// Handle file actions
	socket.on(
		SocketEvent.SYNC_FILE_STRUCTURE,
		({ fileStructure, openFiles, activeFile, socketId }) => {
			io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
				fileStructure,
				openFiles,
				activeFile,
			})
		}
	)
	socket.on(
		SocketEvent.DIRECTORY_CREATED,
		({ parentDirId, newDirectory }) => {
			const roomId = getRoomId(socket.id)
			if (!roomId) return
			socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
				parentDirId,
				newDirectory,
			})
		}
	)

	socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
			dirId,
			children,
		})
	})

	socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
			dirId,
			newName,
		})
	})

	socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.DIRECTORY_DELETED, { dirId })
	})

	socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.FILE_CREATED, { parentDirId, newFile })
	})

	socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, {
			fileId,
			newContent,
		})
	})

	socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, {
			fileId,
			newName,
		})
	})

	socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId })
	})

	// Handle user status
	socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.OFFLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId })
	})

	socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.ONLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId })
	})

	// Handle chat actions
	socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.RECEIVE_MESSAGE, { message })
	})

	// Handle cursor position
	socket.on(SocketEvent.TYPING_START, ({ cursorPosition }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: true, cursorPosition }
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { user })
	})

	socket.on(SocketEvent.TYPING_PAUSE, () => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: false }
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { user })
	})

	socket.on(SocketEvent.REQUEST_DRAWING, () => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id })
	})

	socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
		socket.broadcast
			.to(socketId)
			.emit(SocketEvent.SYNC_DRAWING, { drawingData })
	})

	socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, {
			snapshot,
		})
	})

	// ─── WebRTC Video Call Signaling ───────────────────────────────────────────
	// Strategy: route by socketId first, fall back to username lookup within room.
	// This handles stale socket IDs from reconnections.

	socket.on(SocketEvent.CALL_INITIATE, ({ targetUserId, targetUsername, callType }) => {
		const caller = getUserBySocketId(socket.id)
		if (!caller) return

		// Try targetUserId first (current socket ID), then fall back to username lookup
		let target: User | null = null
		if (targetUserId) {
			target = userSocketMap.find(u => u.socketId === targetUserId) || null
		}
		if (!target && targetUsername && caller.roomId) {
			target = getUserByUsername(caller.roomId, targetUsername)
		}

		console.log(`[CALL_INITIATE] caller=${caller.username}(${socket.id}) → target=${target?.username}(${target?.socketId}) targetUserId="${targetUserId}" targetUsername="${targetUsername}"`)

		if (!target) {
			console.log('[CALL_INITIATE] Target not found, broadcasting to room')
			// As a last resort, broadcast to room — callee filters by username
			socket.to(caller.roomId).emit(SocketEvent.CALL_INITIATE, {
				from: caller,
				callType,
				targetUsername,
			})
			return
		}

		io.to(target.socketId).emit(SocketEvent.CALL_INITIATE, {
			from: caller,
			callType,
			targetUsername,
		})
	})

	socket.on(SocketEvent.CALL_OFFER, ({ targetUserId, targetUsername, offer, callType }) => {
		const caller = getUserBySocketId(socket.id)
		if (!caller) return

		let targetSocketId = targetUserId
		if (!targetSocketId && targetUsername && caller.roomId) {
			const target = getUserByUsername(caller.roomId, targetUsername)
			targetSocketId = target?.socketId
		}
		if (!targetSocketId) return

		io.to(targetSocketId).emit(SocketEvent.CALL_OFFER, {
			from: caller,
			offer,
			callType,
		})
	})

	socket.on(SocketEvent.CALL_ANSWER, ({ targetUserId, targetUsername, answer }) => {
		const answerer = getUserBySocketId(socket.id)
		let targetSocketId = targetUserId
		if (!targetSocketId && targetUsername && answerer?.roomId) {
			const target = getUserByUsername(answerer.roomId, targetUsername)
			targetSocketId = target?.socketId
		}
		if (!targetSocketId) return

		io.to(targetSocketId).emit(SocketEvent.CALL_ANSWER, {
			answer,
			from: socket.id,
		})
	})

	socket.on(SocketEvent.ICE_CANDIDATE, ({ targetUserId, targetUsername, candidate }) => {
		const sender = getUserBySocketId(socket.id)
		let targetSocketId = targetUserId
		if (!targetSocketId && targetUsername && sender?.roomId) {
			const target = getUserByUsername(sender.roomId, targetUsername)
			targetSocketId = target?.socketId
		}
		if (!targetSocketId) return

		io.to(targetSocketId).emit(SocketEvent.ICE_CANDIDATE, {
			candidate,
			from: socket.id,
		})
	})

	socket.on(SocketEvent.CALL_REJECT, ({ targetUserId, targetUsername }) => {
		const user = getUserBySocketId(socket.id)
		if (!user) return

		let targetSocketId = targetUserId
		if (!targetSocketId && targetUsername) {
			const target = getUserByUsername(user.roomId, targetUsername)
			targetSocketId = target?.socketId
		}
		if (!targetSocketId) return

		io.to(targetSocketId).emit(SocketEvent.CALL_REJECT, { from: user })
	})

	socket.on(SocketEvent.CALL_END, ({ targetUserId, targetUsername }) => {
		const user = getUserBySocketId(socket.id)
		if (!user) return

		let targetSocketId = targetUserId
		if (!targetSocketId && targetUsername) {
			const target = getUserByUsername(user.roomId, targetUsername)
			targetSocketId = target?.socketId
		}
		if (!targetSocketId) return

		io.to(targetSocketId).emit(SocketEvent.CALL_END, { from: user })
	})

	socket.on(SocketEvent.CALL_ACCEPTED, ({ targetUserId, targetUsername }) => {
		const user = getUserBySocketId(socket.id)
		if (!user) return

		let targetSocketId = targetUserId
		if (!targetSocketId && targetUsername) {
			const target = getUserByUsername(user.roomId, targetUsername)
			targetSocketId = target?.socketId
		}
		if (!targetSocketId) return

		io.to(targetSocketId).emit(SocketEvent.CALL_ACCEPTED, { from: user })
	})

	socket.on(SocketEvent.USER_MEDIA_STATE, ({ targetUserId, mediaState }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return

		if (targetUserId) {
			io.to(targetUserId).emit(SocketEvent.USER_MEDIA_STATE, {
				from: socket.id,
				mediaState,
			})
		} else {
			socket.broadcast.to(roomId).emit(SocketEvent.USER_MEDIA_STATE, {
				from: socket.id,
				mediaState,
			})
		}
	})

	// Handle Voice Chat (Persistent Audio)
	socket.on('voice-join', ({ username }) => {
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId

		socket.broadcast.to(roomId).emit('voice-user-joined', {
			user: {
				socketId: socket.id,
				username: username || user.username,
			},
		})
	})

	socket.on('voice-leave', () => {
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId

		socket.broadcast.to(roomId).emit('voice-user-left', {
			socketId: socket.id,
		})
	})

	socket.on('voice-offer', ({ targetSocketId, offer }) => {
		const sender = getUserBySocketId(socket.id)
		io.to(targetSocketId).emit('voice-offer', {
			fromSocketId: socket.id,
			fromUsername: sender?.username || socket.id,
			offer,
		})
	})

	socket.on('voice-answer', ({ targetSocketId, answer }) => {
		io.to(targetSocketId).emit('voice-answer', {
			fromSocketId: socket.id,
			answer,
		})
	})

	socket.on('voice-ice-candidate', ({ targetSocketId, candidate }) => {
		io.to(targetSocketId).emit('voice-ice-candidate', {
			fromSocketId: socket.id,
			candidate,
		})
	})

	socket.on('voice-mute-state', ({ isMuted }) => {
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId

		socket.broadcast.to(roomId).emit('voice-mute-state', {
			fromSocketId: socket.id,
			isMuted,
		})
	})

	// ─── Interactive Terminal ─────────────────────────────────────────────────
	let shellProcess: import("child_process").ChildProcess | null = null

	// Strip ANSI/VT escape codes so raw color sequences don't garble the HTML output
	const stripAnsi = (str: string) =>
		str.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
			.replace(/\x1b\][^\x07]*\x07/g, "")
			.replace(/\x1b[()][AB012]/g, "")
			.replace(/\r/g, "")  // normalize carriage returns

	socket.on("terminal:start", () => {
		if (shellProcess) {
			shellProcess.kill()
			shellProcess = null
		}
		const isWindows = process.platform === "win32"
		const shell = isWindows ? "cmd.exe" : "bash"
		const args = isWindows ? [] : []

		// Start shell in project root (two levels up from server/src/)
		const projectRoot = path.join(__dirname, "..", "..")
		shellProcess = spawn(shell, args, {
			env: { ...process.env, TERM: "xterm-color", COLORTERM: "truecolor" },
			cwd: projectRoot,
		})

		shellProcess.stdout?.on("data", (data: Buffer) => {
			socket.emit("terminal:output", stripAnsi(data.toString()))
		})
		shellProcess.stderr?.on("data", (data: Buffer) => {
			socket.emit("terminal:output", stripAnsi(data.toString()))
		})
		shellProcess.on("exit", () => {
			socket.emit("terminal:output", "\n[Shell exited]\n")
			shellProcess = null
		})

		socket.emit("terminal:output", `\r\n> Shell started in: ${projectRoot}\r\n\r\n`)
	})

	socket.on("terminal:input", (data: string) => {
		if (shellProcess?.stdin?.writable) {
			shellProcess.stdin.write(data)
		}
	})

	socket.on("terminal:stop", () => {
		if (shellProcess) {
			shellProcess.kill()
			shellProcess = null
		}
	})

	socket.on("disconnect", () => {
		if (shellProcess) {
			shellProcess.kill()
			shellProcess = null
		}
	})
})


const PORT = process.env.PORT || 3000

// ─── Server-Side Code Execution Engine ────────────────────────────────────────
// Multi-tier architecture:
// 1. Cloud Execution (Judge0 CE) - zero host dependencies, works in production/deployment (Render, Railway, AWS, etc.)
// 2. Secondary Cloud (Wandbox) - backup execution engine
// 3. Local Execution - fast path when local runtimes (Node, Python, Java) are available
import os from "os"
import fs from "fs"

const JUDGE0_LANG_IDS: Record<string, number> = {
	cpp: 105,        // C++ (GCC 14.1.0)
	"c++": 105,
	cxx: 105,
	cc: 105,
	c: 104,          // C (GCC 14.1.0)
	python: 100,     // Python (3.12.5)
	py: 100,
	python3: 100,
	javascript: 97,  // JavaScript (Node.js 20.17.0)
	js: 97,
	node: 97,
	typescript: 101, // TypeScript (5.5.4)
	ts: 101,
	java: 91,        // Java (JDK 17.0.6)
}

/**
 * Normalizes Java code so the main entry class matches "Main",
 * avoiding ClassNotFoundException or "class is public, should be declared in..." errors.
 * Preserves strings and comments intact.
 */
function prepareJavaCode(code: string): string {
	if (/\bclass\s+Main\b/.test(code)) return code

	let oldName: string | null = null
	const publicClassMatch = code.match(/public\s+class\s+(\w+)/)
	if (publicClassMatch) {
		oldName = publicClassMatch[1]
	} else {
		const classMatch = code.match(/class\s+(\w+)/)
		if (classMatch) oldName = classMatch[1]
	}

	if (!oldName || oldName === "Main") return code

	return code.replace(
		/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/)|\b\w+\b/g,
		(match, quotedOrComment) => {
			if (quotedOrComment) return match
			if (match === oldName) return "Main"
			return match
		}
	)
}

/** Execute code via public Judge0 CE sandbox (fast, secure, cloud deployable) */
async function executeWithJudge0(
	langId: number,
	sourceCode: string,
	stdin: string = ""
): Promise<{
	compile: { stdout: string; stderr: string }
	run: { stdout: string; stderr: string; code: number }
}> {
	const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			source_code: sourceCode,
			language_id: langId,
			stdin: stdin || "",
		}),
		// @ts-ignore
		signal: AbortSignal.timeout(20000),
	})

	if (!response.ok) {
		throw new Error(`Judge0 returned HTTP ${response.status}`)
	}

	const data: any = await response.json()
	const compileErr = data.compile_output || ""
	const runStdErr = data.stderr || ""
	const message = data.message || ""

	let combinedStderr = runStdErr
	if (message && !runStdErr.includes(message)) {
		combinedStderr = combinedStderr ? `${combinedStderr}\n${message}` : message
	}

	return {
		compile: {
			stdout: "",
			stderr: compileErr,
		},
		run: {
			stdout: data.stdout || "",
			stderr: combinedStderr,
			code: data.status?.id === 3 ? 0 : (data.exit_code ?? 1),
		},
	}
}

/** Execute code via Wandbox API (secondary fallback) */
async function executeWithWandbox(
	compiler: string,
	sourceCode: string,
	stdin: string = ""
): Promise<{
	compile: { stdout: string; stderr: string }
	run: { stdout: string; stderr: string; code: number }
}> {
	const body = JSON.stringify({
		code: sourceCode,
		compiler,
		stdin: stdin || "",
		options: "",
	})
	const response = await fetch("https://wandbox.org/api/compile.json", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
		// @ts-ignore
		signal: AbortSignal.timeout(25000),
	})

	if (!response.ok) {
		throw new Error(`Wandbox returned HTTP ${response.status}`)
	}

	const d: any = await response.json()
	return {
		compile: {
			stdout: d.compiler_output || "",
			stderr: d.compiler_error || "",
		},
		run: {
			stdout: d.program_output || "",
			stderr: (d.compiler_error ? "" : d.program_error) || "",
			code: d.status === "0" ? 0 : 1,
		},
	}
}

/** Helper to run a local shell process with stdin and timeout */
function runLocalProcess(
	cmd: string,
	args: string[],
	opts: { cwd?: string; stdin?: string; timeoutMs?: number }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	return new Promise((resolve) => {
		const proc = spawn(cmd, args, {
			cwd: opts.cwd,
			env: process.env,
		})

		let stdout = ""
		let stderr = ""

		proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString() })
		proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString() })

		if (opts.stdin) {
			proc.stdin?.write(opts.stdin)
			proc.stdin?.end()
		}

		const timer = setTimeout(() => {
			proc.kill("SIGKILL")
			resolve({ stdout, stderr: stderr + "\n[Timed out after 10s]", exitCode: 124 })
		}, opts.timeoutMs ?? 10000)

		proc.on("close", (code) => {
			clearTimeout(timer)
			resolve({ stdout, stderr, exitCode: code ?? 0 })
		})

		proc.on("error", (err) => {
			clearTimeout(timer)
			resolve({ stdout, stderr: err.message, exitCode: 1 })
		})
	})
}

// Supported runtimes list for client
const RUNTIMES = [
	{ language: "javascript", version: "Node.js 20", aliases: ["js", "node"] },
	{ language: "typescript", version: "TS 5.5",     aliases: ["ts"] },
	{ language: "python",     version: "Python 3.12", aliases: ["py", "python3"] },
	{ language: "java",       version: "JDK 17",      aliases: [] },
	{ language: "cpp",        version: "GCC 14.1",    aliases: ["c++", "cxx", "cc"] },
	{ language: "c",          version: "GCC 14.1",    aliases: [] },
]

app.get("/api/runtimes", (_req: Request, res: Response) => {
	res.json(RUNTIMES)
})

app.post("/api/execute", async (req: Request, res: Response) => {
	const { language, files, stdin = "" } = req.body as {
		language?: string
		files?: { name: string; content: string }[]
		stdin?: string
	}

	if (!language || !files?.length) {
		res.status(400).json({ error: "language and files are required" })
		return
	}

	const code = files[0].content ?? ""
	const fileName = files[0].name ?? "main"
	const normLang = language.toLowerCase().trim()
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "coderoom-exec-"))

	try {
		// ── 1. JavaScript / Node.js ────────────────────────────────
		if (["javascript", "js", "node"].includes(normLang)) {
			// Fast local Node execution
			try {
				const file = path.join(tmpDir, fileName.endsWith(".js") ? fileName : "main.js")
				fs.writeFileSync(file, code, "utf8")
				const local = await runLocalProcess(process.execPath, [file], { stdin })
				// If executed cleanly or runtime/syntax error was caught
				if (!local.stderr.includes("ENOENT") && !local.stderr.includes("spawn")) {
					res.json({
						compile: { stdout: "", stderr: "" },
						run: { stdout: local.stdout, stderr: local.stderr, code: local.exitCode },
					})
					return
				}
			} catch (localErr) {
				console.warn("[Execute] Local Node failed, falling back to Judge0:", localErr)
			}

			// Cloud fallback
			const result = await executeWithJudge0(97, code, stdin)
			res.json(result)
			return
		}

		// ── 2. Python ─────────────────────────────────────────────
		if (["python", "py", "python3"].includes(normLang)) {
			// Try local Python with -u (unbuffered)
			for (const pyCmd of ["python", "python3", "py"]) {
				try {
					const file = path.join(tmpDir, fileName.endsWith(".py") ? fileName : "main.py")
					fs.writeFileSync(file, code, "utf8")
					const local = await runLocalProcess(pyCmd, ["-u", file], { stdin, timeoutMs: 10000 })
					const notFound = local.stderr.includes("not recognized") ||
						local.stderr.includes("not found") ||
						local.stderr.includes("No such file or directory")
					if (!notFound && (local.exitCode === 0 || local.stdout || local.stderr)) {
						res.json({
							compile: { stdout: "", stderr: "" },
							run: { stdout: local.stdout, stderr: local.stderr, code: local.exitCode },
						})
						return
					}
				} catch {}
			}

			// Cloud execution via Judge0 with Wandbox backup
			try {
				const result = await executeWithJudge0(100, code, stdin)
				res.json(result)
				return
			} catch (jErr) {
				console.warn("[Execute] Judge0 Python failed, trying Wandbox:", jErr)
				const result = await executeWithWandbox("cpython-head", code, stdin)
				res.json(result)
				return
			}
		}

		// ── 3. Java ───────────────────────────────────────────────
		if (normLang === "java") {
			const preparedCode = prepareJavaCode(code)

			// Execute in cloud sandbox (JDK 17) — handles class isolation and runs anywhere
			try {
				const result = await executeWithJudge0(91, preparedCode, stdin)
				res.json(result)
				return
			} catch (jErr) {
				console.warn("[Execute] Judge0 Java failed, trying Wandbox:", jErr)
				const result = await executeWithWandbox("openjdk-head", preparedCode, stdin)
				res.json(result)
				return
			}
		}

		// ── 4. C++ ────────────────────────────────────────────────
		if (["cpp", "c++", "cxx", "cc"].includes(normLang)) {
			try {
				const result = await executeWithJudge0(105, code, stdin)
				res.json(result)
				return
			} catch (jErr) {
				console.warn("[Execute] Judge0 C++ failed, trying Wandbox:", jErr)
				const result = await executeWithWandbox("gcc-head", code, stdin)
				res.json(result)
				return
			}
		}

		// ── 5. C ──────────────────────────────────────────────────
		if (normLang === "c") {
			try {
				const result = await executeWithJudge0(104, code, stdin)
				res.json(result)
				return
			} catch (jErr) {
				console.warn("[Execute] Judge0 C failed, trying Wandbox:", jErr)
				const result = await executeWithWandbox("gcc-head", code, stdin)
				res.json(result)
				return
			}
		}

		// ── 6. TypeScript ─────────────────────────────────────────
		if (["typescript", "ts"].includes(normLang)) {
			const result = await executeWithJudge0(101, code, stdin)
			res.json(result)
			return
		}

		// Check any other registered Judge0 language
		if (JUDGE0_LANG_IDS[normLang]) {
			const result = await executeWithJudge0(JUDGE0_LANG_IDS[normLang], code, stdin)
			res.json(result)
			return
		}

		res.status(400).json({
			error: `Language "${language}" is not supported. Supported: c++, c, javascript, python, java, typescript`,
		})
	} catch (err: any) {
		console.error("Execute error:", err)
		res.status(502).json({ error: err?.message || "Execution failed" })
	} finally {
		try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
	}
})

app.get("/", (req: Request, res: Response) => {
	// Send the index.html file
	res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
	res.status(200).json({
		status: "OK",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		mongodb: isDBConnected() ? "connected" : "disconnected",
		message: "Server is healthy and running",
	})
})

// ─── Authentication System ──────────────────────────────────────────────────
const signToken = (payload: JWTPayload) => {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
	const authHeader = req.headers["authorization"]
	const token = authHeader && authHeader.split(" ")[1]
	if (!token) {
		res.status(401).json({ error: "Access token required" })
		return
	}
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
		;(req as any).user = decoded
		next()
	} catch (err) {
		res.status(403).json({ error: "Invalid or expired token" })
	}
}

const generateUniqueUsername = async (baseName: string): Promise<string> => {
	let clean = baseName
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 30)

	if (!clean || clean.length < 3) {
		clean = "user_" + Math.random().toString(36).substring(2, 7)
	}

	if (!isDBConnected()) {
		return clean
	}

	let candidate = clean
	let counter = 1
	while (await UserModel.findOne({ username: candidate })) {
		candidate = `${clean}_${counter}`
		counter++
	}
	return candidate
}

// ─── Sign Up Endpoint ────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (req: Request, res: Response) => {
	const { name, email, password } = req.body as {
		name?: string
		email?: string
		password?: string
	}

	if (!name || name.trim().length < 2) {
		res.status(400).json({ error: "Name must be at least 2 characters long" })
		return
	}
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
		res.status(400).json({ error: "Please provide a valid email address" })
		return
	}
	if (!password || password.length < 6) {
		res.status(400).json({ error: "Password must be at least 6 characters long" })
		return
	}

	const normalizedEmail = email.trim().toLowerCase()
	const trimmedName = name.trim()

	try {
		if (isDBConnected()) {
			const existingUser = await UserModel.findOne({ email: normalizedEmail })
			if (existingUser) {
				res.status(409).json({ error: "An account with this email already exists" })
				return
			}
		}

		const salt = await bcrypt.genSalt(10)
		const hashedPassword = await bcrypt.hash(password, salt)
		const username = await generateUniqueUsername(trimmedName)

		let userDoc: any = null
		if (isDBConnected()) {
			userDoc = await UserModel.create({
				username,
				displayName: trimmedName,
				email: normalizedEmail,
				password: hashedPassword,
				roomsJoined: [],
				lastSeenAt: new Date(),
			})
		} else {
			userDoc = {
				_id: "local_" + Date.now(),
				username,
				displayName: trimmedName,
				email: normalizedEmail,
			}
		}

		const token = signToken({
			id: userDoc._id ? String(userDoc._id) : undefined,
			username,
			displayName: trimmedName,
			email: normalizedEmail,
		})

		res.status(201).json({
			message: "Account created successfully",
			token,
			user: {
				id: userDoc._id,
				name: trimmedName,
				username,
				email: normalizedEmail,
				picture: null,
			},
		})
	} catch (err) {
		console.error("Signup error:", err)
		res.status(500).json({ error: "Failed to create account. Please try again." })
	}
})

// ─── Login Endpoint ──────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req: Request, res: Response) => {
	const { email, password } = req.body as { email?: string; password?: string }

	if (!email || !password) {
		res.status(400).json({ error: "Email and password are required" })
		return
	}

	const normalizedEmail = email.trim().toLowerCase()

	try {
		if (!isDBConnected()) {
			res.status(503).json({ error: "Database not connected. Please try again later." })
			return
		}

		const user = await UserModel.findOne({ email: normalizedEmail })
		if (!user) {
			res.status(401).json({ error: "Invalid email or password" })
			return
		}

		if (!user.password) {
			res.status(400).json({
				error: "This account was created with Google. Please use 'Sign in with Google'.",
			})
			return
		}

		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) {
			res.status(401).json({ error: "Invalid email or password" })
			return
		}

		user.lastSeenAt = new Date()
		await user.save()

		const token = signToken({
			id: String(user._id),
			username: user.username,
			displayName: user.displayName,
			email: user.email,
			picture: user.picture ?? null,
		})

		res.json({
			message: "Logged in successfully",
			token,
			user: {
				id: user._id,
				name: user.displayName || user.username,
				username: user.username,
				email: user.email,
				picture: user.picture || null,
			},
		})
	} catch (err) {
		console.error("Login error:", err)
		res.status(500).json({ error: "An error occurred during login" })
	}
})

// ─── Google OAuth Endpoint ────────────────────────────────────────────────────
app.post("/api/auth/google", async (req: Request, res: Response) => {
	const { credential } = req.body as { credential?: string }
	if (!credential) {
		res.status(400).json({ error: "credential is required" })
		return
	}
	try {
		let payload: any = null
		if (GOOGLE_CLIENT_ID) {
			try {
				const ticket = await googleAuthClient.verifyIdToken({
					idToken: credential,
					audience: GOOGLE_CLIENT_ID,
				})
				payload = ticket.getPayload()
			} catch (ticketErr) {
				console.warn("Google client verification error, trying decoded token fallback:", ticketErr)
				payload = jwt.decode(credential)
			}
		} else {
			payload = jwt.decode(credential)
		}

		if (!payload || !payload.email) {
			res.status(401).json({ error: "Invalid Google credential" })
			return
		}

		const name = payload.name || payload.email.split("@")[0] || "User"
		const email = payload.email.toLowerCase()
		const picture = payload.picture || null
		const googleId = payload.sub

		let user: any = null

		if (isDBConnected()) {
			user = await UserModel.findOne({
				$or: [{ googleId }, { email }],
			})

			if (user) {
				user.displayName = user.displayName || name
				user.picture = picture || user.picture
				if (!user.googleId && googleId) user.googleId = googleId
				user.lastSeenAt = new Date()
				await user.save()
			} else {
				const username = await generateUniqueUsername(name)
				user = await UserModel.create({
					username,
					displayName: name,
					email,
					picture,
					googleId,
					roomsJoined: [],
					lastSeenAt: new Date(),
				})
			}
		} else {
			const username = name.replace(/\s+/g, "_").slice(0, 30)
			user = {
				_id: "google_" + Date.now(),
				username,
				displayName: name,
				email,
				picture,
			}
		}

		const token = signToken({
			id: user._id ? String(user._id) : undefined,
			username: user.username,
			displayName: user.displayName || name,
			email: user.email,
			picture: user.picture ?? null,
		})

		res.json({
			message: "Google authentication successful",
			token,
			user: {
				id: user._id,
				name: user.displayName || name,
				username: user.username,
				email: user.email,
				picture: user.picture,
			},
		})
	} catch (err) {
		console.error("Google token verification failed:", err)
		res.status(401).json({ error: "Token verification failed" })
	}
})

// ─── Current User Endpoint ───────────────────────────────────────────────────
app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
	try {
		const authUser = (req as any).user as JWTPayload
		if (!authUser) {
			res.status(401).json({ error: "Unauthorized" })
			return
		}

		if (isDBConnected() && authUser.id) {
			const user = await UserModel.findById(authUser.id).select("-password")
			if (user) {
				res.json({
					user: {
						id: user._id,
						name: user.displayName || user.username,
						username: user.username,
						email: user.email,
						picture: user.picture || null,
					},
				})
				return
			}
		}

		res.json({
			user: {
				id: authUser.id,
				name: authUser.displayName || authUser.username,
				username: authUser.username,
				email: authUser.email,
				picture: authUser.picture || null,
			},
		})
	} catch (err) {
		console.error("Error fetching current user:", err)
		res.status(500).json({ error: "Failed to fetch user" })
	}
})

// ─── User Room History Endpoint ───────────────────────────────────────────────
app.get("/api/user/rooms", authenticateToken, async (req: Request, res: Response) => {
	try {
		const authUser = (req as any).user as JWTPayload
		if (!authUser) {
			res.status(401).json({ error: "Unauthorized" })
			return
		}

		const username = authUser.username
		if (!isDBConnected()) {
			res.json({ rooms: [] })
			return
		}

		// Fetch rooms where this user is a member OR created the room
		const rooms = await Room.find({
			$or: [
				{ "members.username": username },
				{ createdBy: username },
			],
		})
			.select("roomId createdBy members lastActiveAt createdAt")
			.sort({ lastActiveAt: -1 })
			.limit(50)
			.lean()

		const formatted = rooms.map((room: any) => {
			const myMembership = room.members?.find((m: any) => m.username === username)
			return {
				roomId: room.roomId,
				createdBy: room.createdBy,
				isOwner: room.createdBy === username,
				memberCount: room.members?.length ?? 0,
				lastJoinedAt: myMembership?.lastJoinedAt ?? room.createdAt,
				lastActiveAt: room.lastActiveAt,
				createdAt: room.createdAt,
			}
		})

		res.json({ rooms: formatted })
	} catch (err) {
		console.error("Error fetching user rooms:", err)
		res.status(500).json({ error: "Failed to fetch room history" })
	}
})

// ─── 2FA Endpoints ───────────────────────────────────────────────────────────

// Generate a new TOTP secret for a room and return the otpauthUrl for QR display
app.post("/api/2fa/setup", async (req: Request, res: Response) => {
	const { roomId } = req.body as { roomId?: string }
	if (!roomId || roomId.trim().length === 0) {
		res.status(400).json({ error: "roomId is required" })
		return
	}

	const normalizedRoomId = roomId.trim()
	const secret = speakeasy.generateSecret({
		name: `CodeColabAI (${normalizedRoomId})`,
		issuer: "CodeColabAI",
		length: 20,
	})

	try {
		await Room.findOneAndUpdate(
			{ roomId: normalizedRoomId },
			{
				$set: {
					"twoFa.enabled": true,
					"twoFa.secret": secret.base32,
					lastActiveAt: new Date(),
				},
				$setOnInsert: {
					roomId: normalizedRoomId,
					createdBy: "unknown",
					members: [],
				},
			},
			{ upsert: true, new: true },
		)

		res.json({
			otpauthUrl: secret.otpauth_url,
			secret: secret.base32,
		})
	} catch (err) {
		console.error("2FA setup failed:", err)
		res.status(500).json({ error: "Failed to save 2FA secret" })
	}
})

// Check whether a room has 2FA enabled
app.get("/api/2fa/status", async (req: Request, res: Response) => {
	const roomId = (req.query.roomId as string | undefined)?.trim()
	if (!roomId) {
		res.status(400).json({ error: "roomId query param required" })
		return
	}

	try {
		const room = await Room.findOne({ roomId }).select("twoFa.enabled").lean()
		res.json({ enabled: Boolean(room?.twoFa?.enabled) })
	} catch (err) {
		console.error("2FA status failed:", err)
		res.status(500).json({ error: "Failed to check 2FA status" })
	}
})

// Verify a 6-digit TOTP token for a room
app.post("/api/2fa/verify", async (req: Request, res: Response) => {
	const { roomId, token } = req.body as { roomId?: string; token?: string }
	if (!roomId || !token) {
		res.status(400).json({ error: "roomId and token are required" })
		return
	}

	try {
		const room = await Room.findOne({ roomId: roomId.trim() })
			.select("+twoFa.secret twoFa.enabled")
			.lean()

		if (!room?.twoFa?.enabled || !room?.twoFa?.secret) {
			// Room has no 2FA — treat as allowed
			res.json({ valid: true })
			return
		}

		const valid = speakeasy.totp.verify({
			secret: room.twoFa.secret,
			encoding: "base32",
			token: token.replace(/\s/g, ""),
			window: 1, // accept 1 step before/after (±30s)
		})

		res.json({ valid })
	} catch (err) {
		console.error("2FA verify failed:", err)
		res.status(500).json({ error: "Failed to verify token" })
	}
})

async function startServer() {
	try {
		await connectDB()
	} catch (err) {
		console.warn("⚠ MongoDB connection failed — starting server in memory-only mode.")
		console.warn("  Room creation and real-time collaboration will work, but data won't be persisted.")
		console.warn("  To enable persistence, set MONGODB_URI in server/.env and ensure MongoDB is running.")
		console.warn("  Error:", (err as Error).message)
		// Do NOT exit — allow the server to run without DB (in-memory mode)
	}

	server.listen(PORT, () => {
		console.log(`✓ Server listening on port ${PORT}`)
		console.log(`  DB status: ${isDBConnected() ? "MongoDB connected" : "memory-only (no DB)"}`)

		// Keep-alive mechanism for Render free tier
		const RENDER_URL = process.env.RENDER_URL || `http://localhost:${PORT}`

		// Self-ping every 2 minutes (120000ms) to prevent sleep
		setInterval(async () => {
			try {
				const response = await fetch(`${RENDER_URL}/health`)
				if (response.ok) {
					console.log(`✓ Keep-alive ping successful at ${new Date().toISOString()}`)
				} else {
					console.log(`⚠ Keep-alive ping failed with status: ${response.status}`)
				}
			} catch (error) {
				console.log(`✗ Keep-alive ping error: ${error}`)
			}
		}, 120000) // 2 minutes
	})
}

startServer()
