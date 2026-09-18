import mongoose from "mongoose"
import { migrateLegacySchemas } from "./dbMigrate"

export async function connectDB(): Promise<void> {
	const uri = process.env.MONGODB_URI?.trim()
	if (!uri) {
		throw new Error("MONGODB_URI is missing in server/.env")
	}

	// If URI has no DB name, default to code-room
	const hasDbName = /mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri)
	const connectionUri = hasDbName ? uri : `${uri.replace(/\/$/, "")}/code-room`

	mongoose.set("strictQuery", true)

	await mongoose.connect(connectionUri)
	console.log(`✓ MongoDB connected → ${mongoose.connection.name}`)

	await migrateLegacySchemas()
}

export function isDBConnected(): boolean {
	return mongoose.connection.readyState === 1
}
