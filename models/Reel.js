// src/models/Reel.js

import mongoose from "mongoose";

// Sub-schemas
const ReelCommentSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        default: 0,
        index: true,
    },
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const ReelLikeSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ReelViewSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    viewedAt: {
        type: Date,
        default: Date.now
    }
});

// Main Reel Schema
const ReelSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true
    },
    authorId: {
        type: String,
        required: true
    },
    authorAvatar: {
        type: String
    },
    video: {
        type: String,
        required: true
    },
    poster: {
        type: String,
        required: true
    },
    tags: {
        type: [String],
        default: []
    },
    likes: {
        type: [ReelLikeSchema],
        default: []
    },
    comments: {
        type: [ReelCommentSchema],
        default: []
    },
    views: {
        type: [ReelViewSchema],
        default: []
    },
    viewCount: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
ReelSchema.index({ createdAt: -1 });
ReelSchema.index({ tags: 1, createdAt: -1 });
ReelSchema.index({ authorId: 1, createdAt: -1 });
ReelSchema.index({ likeCount: -1 });
ReelSchema.index({ viewCount: -1 });

// Virtuals
ReelSchema.virtual('engagementStats').get(function () {
    return {
        likes: this.likeCount || this.likes.length,
        comments: this.commentCount || this.comments.length,
        views: this.viewCount || this.views.length,
    };
});

// Methods - REMOVED TypeScript syntax
ReelSchema.methods.toggleLike = async function (userId, username) {
    const existingLikeIndex = this.likes.findIndex(
        (like) => like.userId === userId
    );

    if (existingLikeIndex >= 0) {
        // Remove like
        this.likes.splice(existingLikeIndex, 1);
        this.likeCount = Math.max(0, this.likeCount - 1);
        await this.save();
        return { liked: false, likeCount: this.likeCount };
    } else {
        // Add like
        this.likes.push({
            userId,
            username,
            createdAt: new Date()
        });
        this.likeCount = (this.likeCount || 0) + 1;
        await this.save();
        return { liked: true, likeCount: this.likeCount };
    }
};

ReelSchema.methods.addComment = async function (userId, username, displayName, text, avatar) {
    const comment = {
        id: new mongoose.Types.ObjectId().toString(),
        userId,
        username,
        displayName,
        avatar: avatar || null,
        text,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    this.comments.unshift(comment);
    this.commentCount = (this.commentCount || 0) + 1;
    await this.save();

    return comment;
};

ReelSchema.methods.deleteComment = async function (commentId, userId) {
    const commentIndex = this.comments.findIndex(
        (c) => c.id === commentId
    );

    if (commentIndex === -1) return false;

    const comment = this.comments[commentIndex];
    if (comment.userId !== userId && this.authorId !== userId) {
        throw new Error('Unauthorized to delete this comment');
    }

    this.comments.splice(commentIndex, 1);
    this.commentCount = Math.max(0, this.commentCount - 1);
    await this.save();

    return true;
};

ReelSchema.methods.recordView = async function (userId) {
    const existingView = this.views.find(
        (view) => view.userId === userId
    );

    if (!existingView) {
        this.views.push({
            userId,
            viewedAt: new Date()
        });
        this.viewCount = (this.viewCount || 0) + 1;
        await this.save();
    }
};

ReelSchema.methods.getEngagementStats = function () {
    return {
        likes: this.likeCount || this.likes.length,
        comments: this.commentCount || this.comments.length,
        views: this.viewCount || this.views.length,
    };
};

// Static Methods - REMOVED TypeScript syntax
ReelSchema.statics.findTrending = async function (limit = 10, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.find({
        createdAt: { $gte: cutoffDate }
    })
        .sort({ likeCount: -1, viewCount: -1 })
        .limit(limit)
        .exec();
};

ReelSchema.statics.findByTags = async function (tags, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    return this.find({
        tags: { $in: tags }
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
};

ReelSchema.statics.getTopByLikes = async function (limit = 10) {
    return this.find()
        .sort({ likeCount: -1, createdAt: -1 })
        .limit(limit)
        .exec();
};

// FIXED: Correct parameter order - model name first, then schema
const Reel = mongoose.model("Reel", ReelSchema);

export default Reel;