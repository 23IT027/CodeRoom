import mongoose, { Schema } from "mongoose"

/**
 * users collection
 * Manual join  → keyed by username
 * Google login → also sets email / googleId (sparse unique)
 */
const UserSchema = new Schema(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			minlength: 3,
			maxlength: 64,
		},
		displayName: { type: String, trim: true },
		email: {
			type: String,
			trim: true,
			lowercase: true,
			sparse: true,
			unique: true,
		},
		picture: { type: String },
		googleId: {
			type: String,
			sparse: true,
			unique: true,
		},
		roomsJoined: { type: [String], default: [] },
		lastSeenAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true,
		versionKey: false,
		collection: "users",
	},
)

UserSchema.index({ lastSeenAt: -1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UserModel: any = mongoose.model("User", UserSchema)
