import mongoose from "mongoose";

const adminschema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true, // creates index
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            default: null,
        },
        avatar: {
            type: String,
            default: "",
        },
        about: {
            type: String,
            default: "",
        },
        googleId: {
            type: String,
            default: null,
            sparse: true, // allows multiple nulls while still indexing non‑null values
        },
        twofactorenabled: {
            type: Boolean,
            default: true, // 2FA enabled by default
        },
        otpcode: {
            type: String,
            default: "",
        },
        expirydate: {
            type: Date,
            default: null,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Indexes (additional ones beyond those defined by unique/sparse)
adminschema.index({ createdAt: -1 });
adminschema.index({ isActive: 1, createdAt: -1 });

// Virtual for full profile
adminschema.virtual("profile").get(function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        about: this.about,
        isVerified: this.isVerified,
        createdAt: this.createdAt,
    };
});

// Instance method: get public profile (excludes sensitive data)
adminschema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        about: this.about,
        createdAt: this.createdAt,
    };
};

// Instance method: update last login
adminschema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    return await this.save();
};

// Static method: find or create Google user
adminschema.statics.findOrCreateGoogleUser = async function (profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
        throw new Error("Email not provided by Google");
    }

    let user = await this.findOne({ email });

    if (user) {
        // Update googleId if not already set
        if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
        }
        return user;
    }

    // Create new user
    user = await this.create({
        name:
            profile.displayName ||
            `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
        email: email,
        googleId: profile.id,
        avatar: profile.photos?.[0]?.value || "",
        isVerified: true,
        lastLogin: new Date(),
    });

    return user;
};

// Static method: find by email or googleId
adminschema.statics.findByEmailOrGoogleId = async function (email, googleId) {
    return await this.findOne({
        $or: [{ email: email }, { googleId: googleId }],
    });
};

const Admin = mongoose.model("Admin", adminschema);

export default Admin;