import mongoose from "mongoose"

/**
 * One-time cleanup for the old flat schema:
 *   { roomId, createdBy, twoFaSecret, __v }
 * → nested twoFa + members[]
 *
 * Also fixes legacy unique indexes that were not sparse
 * (would block multiple users without email).
 */
export async function migrateLegacySchemas(): Promise<void> {
	const db = mongoose.connection.db
	if (!db) return

	const rooms = db.collection("rooms")
	const legacyRooms = await rooms
		.find({ $or: [{ twoFaSecret: { $exists: true } }, { __v: { $exists: true } }] })
		.toArray()

	for (const doc of legacyRooms) {
		const secret =
			typeof doc.twoFaSecret === "string" && doc.twoFaSecret.length > 0
				? doc.twoFaSecret
				: undefined

		const members =
			Array.isArray(doc.members) && doc.members.length > 0
				? doc.members
				: doc.createdBy
					? [
							{
								username: String(doc.createdBy),
								joinedAt: doc.createdAt || new Date(),
								lastJoinedAt: doc.updatedAt || new Date(),
							},
						]
					: []

		await rooms.updateOne(
			{ _id: doc._id },
			{
				$set: {
					twoFa: {
						enabled: Boolean(secret),
						...(secret ? { secret } : {}),
					},
					members,
					lastActiveAt: doc.lastActiveAt || doc.updatedAt || new Date(),
				},
				$unset: { twoFaSecret: "", __v: "" },
			},
		)
	}

	if (legacyRooms.length > 0) {
		console.log(`✓ Migrated ${legacyRooms.length} legacy room document(s)`)
	}

	const users = db.collection("users")
	const userResult = await users.updateMany(
		{ __v: { $exists: true } },
		{ $unset: { __v: "" } },
	)
	if (userResult.modifiedCount > 0) {
		console.log(`✓ Cleaned ${userResult.modifiedCount} user document(s)`)
	}

	// Ensure email/googleId unique indexes are sparse (manual users have no email)
	await ensureSparseUniqueIndex(users, "email_1", { email: 1 })
	await ensureSparseUniqueIndex(users, "googleId_1", { googleId: 1 })
}

async function ensureSparseUniqueIndex(
	// native driver collection — keep loosely typed for mongoose/ts-node compat
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	collection: any,
	name: string,
	key: Record<string, 1>,
): Promise<void> {
	const existing = (await collection.indexes()).find(
		(idx: { name?: string; unique?: boolean; sparse?: boolean }) => idx.name === name,
	)
	if (existing && existing.unique && existing.sparse) return

	if (existing) {
		await collection.dropIndex(name)
	}
	await collection.createIndex(key, { unique: true, sparse: true, name })
	console.log(`✓ Ensured sparse unique index ${name}`)
}
