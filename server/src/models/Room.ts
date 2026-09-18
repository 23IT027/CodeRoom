import mongoose, { Schema } from "mongoose"

/**
 * rooms collection
 * {
 *   roomId, createdBy,
 *   twoFa: { enabled, secret },
 *   members: [{ username, joinedAt, lastJoinedAt }],
 *   lastActiveAt, createdAt, updatedAt
 * }
 */
const MemberSchema = new Schema(
	{
		username: { type: String, required: true, trim: true },
		joinedAt: { type: Date, default: Date.now },
		lastJoinedAt: { type: Date, default: Date.now },
	},
	{ _id: false },
)

const TwoFaSchema = new Schema(
	{
		enabled: { type: Boolean, default: false },
		// excluded from queries unless .select("+twoFa.secret")
		secret: { type: String, default: undefined, select: false },
	},
	{ _id: false },
)

const RoomSchema = new Schema(
	{
		roomId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			minlength: 2,
			maxlength: 64,
		},
		createdBy: { type: String, required: true, trim: true },
		twoFa: { type: TwoFaSchema, default: () => ({ enabled: false }) },
		members: { type: [MemberSchema], default: [] },
		lastActiveAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true,
		versionKey: false,
		collection: "rooms",
	},
)

RoomSchema.index({ lastActiveAt: -1 })
RoomSchema.index({ "members.username": 1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Room: any = mongoose.model("Room", RoomSchema)
