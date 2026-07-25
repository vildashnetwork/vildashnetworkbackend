// import mongoose from "mongoose";

// const adminschema = new mongoose.Schema(
//     {
//         role: {
//             type: String,
//             enum: ["member", "admin"],
//             default: "member"
//         },
//         name: {
//             type: String,
//             required: true,
//         },
//         email: {
//             type: String,
//             required: true,
//             unique: true,
//             lowercase: true,
//             trim: true,
//         },
//         password: {
//             type: String,
//             default: null,
//         },
//         avatar: {
//             type: String,
//             default: "",
//         },
//         about: {
//             type: String,
//             default: "",
//         },
//         googleId: {
//             type: String,
//             default: null,
//             sparse: true,
//         },
//         twofactorenabled: {
//             type: Boolean,
//             default: false,
//         },
//         otpcode: {
//             type: String,
//             default: "",
//         },
//         expirydate: {
//             type: Date,
//             default: null,
//         },
//         isVerified: {
//             type: Boolean,
//             default: false,
//         },
//         lastLogin: {
//             type: Date,
//             default: null,
//         },
//         isActive: {
//             type: Boolean,
//             default: true,
//         },
//     },
//     { timestamps: true }
// );

// // Indexes
// adminschema.index({ createdAt: -1 });
// adminschema.index({ isActive: 1, createdAt: -1 });

// // Virtual for full profile
// adminschema.virtual("profile").get(function () {
//     return {
//         id: this._id,
//         name: this.name,
//         email: this.email,
//         avatar: this.avatar,
//         about: this.about,
//         isVerified: this.isVerified,
//         createdAt: this.createdAt,
//     };
// });

// // Instance method: get public profile (excludes sensitive data)
// adminschema.methods.getPublicProfile = function () {
//     return {
//         id: this._id,
//         name: this.name,
//         email: this.email,
//         avatar: this.avatar,
//         about: this.about,
//         createdAt: this.createdAt,
//     };
// };

// // Instance method: update last login
// adminschema.methods.updateLastLogin = async function () {
//     this.lastLogin = new Date();
//     return await this.save();
// };

// // Static method: find or create Google user
// adminschema.statics.findOrCreateGoogleUser = async function (profile) {
//     const email = profile.emails?.[0]?.value;
//     if (!email) {
//         throw new Error("Email not provided by Google");
//     }

//     let user = await this.findOne({ email });

//     if (user) {
//         // Update googleId if not already set
//         if (!user.googleId) {
//             user.googleId = profile.id;
//             await user.save();
//         }
//         return user;
//     }

//     // ✅ Create new user – isVerified explicitly set to false
//     user = await this.create({
//         name:
//             profile.displayName ||
//             `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
//         email: email,
//         googleId: profile.id,
//         avatar: profile.photos?.[0]?.value || "",
//         isVerified: false, // 🔥 changed from true to false
//         lastLogin: new Date(),
//     });

//     return user;
// };

// // Static method: find by email or googleId
// adminschema.statics.findByEmailOrGoogleId = async function (email, googleId) {
//     return await this.findOne({
//         $or: [{ email: email }, { googleId: googleId }],
//     });
// };

// const Admin = mongoose.model("Admin", adminschema);

// export default Admin;



















import mongoose from "mongoose";

const adminschema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["member", "admin"],
            default: "member"
        },
        name: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            unique: true,
            sparse: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
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
        // Team member specific fields
        bio: {
            type: [String],
            default: [],
        },
        focus: {
            type: [String],
            default: [],
        },
        linkedin: {
            type: String,
            default: "",
        },
        twitter: {
            type: String,
            default: "",
        },
        location: {
            type: String,
            default: "Douala, Cameroon",
        },
        joined: {
            type: String,
            default: "",
        },
        googleId: {
            type: String,
            default: null,
            sparse: true,
        },
        twofactorenabled: {
            type: Boolean,
            default: false,
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

// Indexes
adminschema.index({ createdAt: -1 });
adminschema.index({ isActive: 1, createdAt: -1 });
adminschema.index({ name: 1 });
adminschema.index({ slug: 1 });

// Virtual for full profile
adminschema.virtual("profile").get(function () {
    return {
        id: this._id,
        name: this.name,
        slug: this.slug,
        email: this.email,
        avatar: this.avatar,
        about: this.about,
        bio: this.bio,
        focus: this.focus,
        linkedin: this.linkedin,
        twitter: this.twitter,
        location: this.location,
        joined: this.joined,
        role: this.role,
        isVerified: this.isVerified,
        createdAt: this.createdAt,
    };
});

// Instance method: get public profile (excludes sensitive data)
adminschema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        name: this.name,
        slug: this.slug,
        email: this.email,
        avatar: this.avatar,
        about: this.about,
        bio: this.bio,
        focus: this.focus,
        linkedin: this.linkedin,
        twitter: this.twitter,
        location: this.location,
        joined: this.joined,
        role: this.role,
        createdAt: this.createdAt,
    };
};

// Instance method: update last login
adminschema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    return await this.save();
};

// Pre-save middleware to generate slug from name if not provided
adminschema.pre('save', function (next) {
    if (!this.slug && this.name) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
    }
    next();
});

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

    // Create new user – isVerified explicitly set to false
    user = await this.create({
        name: profile.displayName || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
        slug: profile.displayName ? profile.displayName.toLowerCase().replace(/\s+/g, '-') : undefined,
        email: email,
        googleId: profile.id,
        avatar: profile.photos?.[0]?.value || "",
        isVerified: false,
        lastLogin: new Date(),
        // Default team member values
        location: "Douala, Cameroon",
        role: "member",
    });

    return user;
};

// Static method: find by email or googleId
adminschema.statics.findByEmailOrGoogleId = async function (email, googleId) {
    return await this.findOne({
        $or: [{ email: email }, { googleId: googleId }],
    });
};

// Static method: find by slug
adminschema.statics.findBySlug = async function (slug) {
    return await this.findOne({ slug: slug });
};

const Admin = mongoose.model("Admin", adminschema);

export default Admin;