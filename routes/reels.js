import express from 'express';
import mongoose from 'mongoose';
import Reel from '../models/Reel.js';

const router = express.Router();

// ==================== CREATE ====================

// POST /api/reels - Create a new reel
router.post('/', async (req, res) => {
    try {
        const { title, description, author, authorId, authorAvatar, video, poster, tags } = req.body;

        // Validate required fields
        if (!title || !description || !author || !authorId || !video || !poster) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: title, description, author, authorId, video, poster'
            });
        }

        const reel = new Reel({
            title,
            description,
            author,
            authorId,
            authorAvatar: authorAvatar || null,
            video,
            poster,
            tags: tags || [],
            likes: [],
            comments: [],
            views: [],
            viewCount: 0,
            likeCount: 0,
            commentCount: 0
        });

        await reel.save();

        res.status(201).json({
            success: true,
            data: reel
        });
    } catch (error) {
        console.error('Error creating reel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create reel'
        });
    }
});

// ==================== READ ====================

// GET /api/reels - Get all reels with pagination, filtering, and search
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId || 'guest';
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const tags = req.query.tags ? req.query.tags.split(',') : null;
        const search = req.query.search || null;
        const skip = (page - 1) * limit;

        let query = {};

        if (tags && tags.length > 0) {
            query.tags = { $in: tags };
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } },
            ];
        }

        const [reels, total] = await Promise.all([
            Reel.find(query)
                .sort({ order: 1, createdAt: -1 }) // sort by order if exists, otherwise createdAt
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Reel.countDocuments(query),
        ]);

        const formattedReels = reels.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching reels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reels'
        });
    }
});

// GET /api/reels/trending - Get trending reels
router.get('/trending', async (req, res) => {
    try {
        const userId = req.query.userId || 'guest';
        const limit = parseInt(req.query.limit) || 10;
        const days = parseInt(req.query.days) || 7;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const reels = await Reel.find({
            createdAt: { $gte: cutoffDate }
        })
            .sort({ likeCount: -1, viewCount: -1 })
            .limit(limit)
            .lean()
            .exec();

        const formattedReels = reels.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels
        });
    } catch (error) {
        console.error('Error fetching trending reels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending reels'
        });
    }
});

// GET /api/reels/popular - Get most liked reels
router.get('/popular', async (req, res) => {
    try {
        const userId = req.query.userId || 'guest';
        const limit = parseInt(req.query.limit) || 10;

        const reels = await Reel.find()
            .sort({ likeCount: -1, createdAt: -1 })
            .limit(limit)
            .lean()
            .exec();

        const formattedReels = reels.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels
        });
    } catch (error) {
        console.error('Error fetching popular reels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch popular reels'
        });
    }
});

// GET /api/reels/:id - Get a single reel by ID (using custom `id` field)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId || 'guest';

        // ✅ Fix: use findOne({ id }) instead of findById(id)
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        // Record view (if user is not guest)
        if (userId !== 'guest') {
            const existingView = reel.views.find(
                (view) => view.userId === userId
            );

            if (!existingView) {
                reel.views.push({
                    userId,
                    viewedAt: new Date()
                });
                reel.viewCount = (reel.viewCount || 0) + 1;
                await reel.save();
            }
        }

        const stats = {
            likes: reel.likeCount || reel.likes.length,
            comments: reel.commentCount || reel.comments.length,
            views: reel.viewCount || reel.views.length,
        };

        const formattedReel = {
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats,
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        };

        res.status(200).json({
            success: true,
            data: formattedReel
        });
    } catch (error) {
        console.error('Error fetching reel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reel'
        });
    }
});

// GET /api/reels/:id/comments - Get comments for a reel
router.get('/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const comments = reel.comments.slice(skip, skip + limit);

        res.status(200).json({
            success: true,
            data: comments,
            pagination: {
                total: reel.comments.length,
                page,
                limit,
                totalPages: Math.ceil(reel.comments.length / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comments'
        });
    }
});

// GET /api/reels/author/:authorId - Get reels by author
router.get('/author/:authorId', async (req, res) => {
    try {
        const { authorId } = req.params;
        const userId = req.query.userId || 'guest';
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [reels, total] = await Promise.all([
            Reel.find({ authorId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Reel.countDocuments({ authorId }),
        ]);

        const formattedReels = reels.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching author reels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch author reels'
        });
    }
});

// GET /api/reels/tag/:tag - Get reels by tag
router.get('/tag/:tag', async (req, res) => {
    try {
        const { tag } = req.params;
        const userId = req.query.userId || 'guest';
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [reels, total] = await Promise.all([
            Reel.find({ tags: { $in: [tag] } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Reel.countDocuments({ tags: { $in: [tag] } }),
        ]);

        const formattedReels = reels.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching reels by tag:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reels by tag'
        });
    }
});

// GET /api/reels/:id/related - Get related reels
router.get('/:id/related', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId || 'guest';
        const limit = parseInt(req.query.limit) || 5;

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const related = await Reel.find({
            _id: { $ne: reel._id },
            tags: { $in: reel.tags },
        })
            .sort({ likeCount: -1 })
            .limit(limit)
            .lean()
            .exec();

        const formattedReels = related.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels
        });
    } catch (error) {
        console.error('Error fetching related reels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch related reels'
        });
    }
});

// GET /api/reels/stats/:id - Get engagement stats for a reel
router.get('/stats/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                reelId: reel.id || reel._id.toString(),
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
                uniqueViewers: reel.views.length,
                engagementRate: reel.views.length > 0
                    ? ((reel.likeCount || reel.likes.length) / reel.views.length * 100).toFixed(2)
                    : 0,
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats'
        });
    }
});

// ==================== UPDATE ====================

// PUT /api/reels/:id - Update a reel
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, video, poster, tags, authorId } = req.body;

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        // Check authorization (optional - can be removed if no auth)
        if (authorId && reel.authorId !== authorId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: You can only edit your own reels'
            });
        }

        // Update fields
        if (title) reel.title = title;
        if (description) reel.description = description;
        if (video) reel.video = video;
        if (poster) reel.poster = poster;
        if (tags) reel.tags = tags;
        reel.updatedAt = new Date();

        await reel.save();

        res.status(200).json({
            success: true,
            data: reel
        });
    } catch (error) {
        console.error('Error updating reel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update reel'
        });
    }
});

// ==================== DELETE ====================

// DELETE /api/reels/:id - Delete a reel
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { authorId } = req.query;

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        // Check authorization (optional - can be removed if no auth)
        if (authorId && reel.authorId !== authorId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: You can only delete your own reels'
            });
        }

        await reel.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Reel deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting reel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete reel'
        });
    }
});

// ==================== LIKES ====================

// POST /api/reels/:id/like - Toggle like
router.post('/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, username } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const existingLikeIndex = reel.likes.findIndex(
            (like) => like.userId === userId
        );

        let liked;
        let likeCount;

        if (existingLikeIndex >= 0) {
            // Remove like
            reel.likes.splice(existingLikeIndex, 1);
            reel.likeCount = Math.max(0, reel.likeCount - 1);
            liked = false;
        } else {
            // Add like
            reel.likes.push({
                userId,
                username: username || 'Anonymous',
                createdAt: new Date()
            });
            reel.likeCount = (reel.likeCount || 0) + 1;
            liked = true;
        }

        likeCount = reel.likeCount || reel.likes.length;
        await reel.save();

        res.status(200).json({
            success: true,
            data: {
                liked,
                likeCount
            }
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle like'
        });
    }
});

// GET /api/reels/:id/like/check - Check if user liked a reel
router.get('/:id/like/check', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const isLiked = reel.likes.some((like) => like.userId === userId);

        res.status(200).json({
            success: true,
            data: {
                isLiked,
                likeCount: reel.likeCount || reel.likes.length
            }
        });
    } catch (error) {
        console.error('Error checking like:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check like'
        });
    }
});

// ==================== COMMENTS ====================

// POST /api/reels/:id/comments - Add a comment
router.post('/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, username, displayName, text, avatar } = req.body;

        if (!userId || !username || !text) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, username, text'
            });
        }

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const comment = {
            id: new mongoose.Types.ObjectId().toString(),
            userId,
            username,
            displayName: displayName || username,
            avatar: avatar || null,
            text,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        reel.comments.unshift(comment);
        reel.commentCount = (reel.commentCount || 0) + 1;
        await reel.save();

        res.status(201).json({
            success: true,
            data: comment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add comment'
        });
    }
});

// DELETE /api/reels/:id/comments/:commentId - Delete a comment
router.delete('/:id/comments/:commentId', async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const commentIndex = reel.comments.findIndex(
            (c) => c.id === commentId
        );

        if (commentIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        const comment = reel.comments[commentIndex];

        // Check if user is comment author or reel author
        if (comment.userId !== userId && reel.authorId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to delete this comment'
            });
        }

        reel.comments.splice(commentIndex, 1);
        reel.commentCount = Math.max(0, reel.commentCount - 1);
        await reel.save();

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete comment'
        });
    }
});

// PUT /api/reels/:id/comments/:commentId - Update a comment
router.put('/:id/comments/:commentId', async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { userId, text } = req.body;

        if (!userId || !text) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, text'
            });
        }

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const commentIndex = reel.comments.findIndex(
            (c) => c.id === commentId
        );

        if (commentIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        const comment = reel.comments[commentIndex];

        // Check if user is comment author
        if (comment.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to edit this comment'
            });
        }

        comment.text = text;
        comment.updatedAt = new Date();
        await reel.save();

        res.status(200).json({
            success: true,
            data: comment
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update comment'
        });
    }
});

// ==================== VIEWS ====================

// POST /api/reels/:id/view - Record a view
router.post('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        const existingView = reel.views.find(
            (view) => view.userId === userId
        );

        if (!existingView) {
            reel.views.push({
                userId,
                viewedAt: new Date()
            });
            reel.viewCount = (reel.viewCount || 0) + 1;
            await reel.save();
        }

        res.status(200).json({
            success: true,
            data: {
                viewed: true,
                viewCount: reel.viewCount || reel.views.length
            }
        });
    } catch (error) {
        console.error('Error recording view:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record view'
        });
    }
});

// GET /api/reels/:id/views - Get view count
router.get('/:id/views', async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ Fix: use findOne({ id })
        const reel = await Reel.findOne({ id: id });
        if (!reel) {
            return res.status(404).json({
                success: false,
                error: 'Reel not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                viewCount: reel.viewCount || reel.views.length,
                uniqueViewers: reel.views.length
            }
        });
    } catch (error) {
        console.error('Error fetching views:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch views'
        });
    }
});

// ==================== BATCH ====================

// POST /api/reels/batch - Get multiple reels by IDs
router.post('/batch', async (req, res) => {
    try {
        const { ids } = req.body;
        const userId = req.query.userId || 'guest';

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const reels = await Reel.find({
            _id: { $in: ids }
        }).lean().exec();

        const formattedReels = reels.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels
        });
    } catch (error) {
        console.error('Error fetching batch reels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reels'
        });
    }
});

// GET /api/reels/tags - Get all unique tags
router.get('/tags/all', async (req, res) => {
    try {
        const reels = await Reel.find().lean().exec();
        const tagSet = new Set();

        reels.forEach(reel => {
            reel.tags.forEach(tag => tagSet.add(tag));
        });

        const tags = Array.from(tagSet).sort();

        res.status(200).json({
            success: true,
            data: tags
        });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tags'
        });
    }
});

// ==================== REORDER ====================

// PATCH /api/reels/reorder - Reorder reels by their custom `id` field
router.patch('/reorder', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids array is required' });
        }

        // Update each reel's order based on its index in the array
        // We need to find by the custom `id` field, not `_id`
        const updates = ids.map((id, index) => ({
            updateOne: {
                filter: { id: id }, // 👈 use the custom `id` field
                update: { order: index },
            },
        }));

        await Reel.bulkWrite(updates);

        // Return updated reels sorted by order
        const reels = await Reel.find().sort({ order: 1, createdAt: -1 }).lean();
        const userId = req.query.userId || 'guest';

        const formattedReels = reels.map((reel) => ({
            id: reel.id || reel._id.toString(),
            title: reel.title,
            description: reel.description,
            author: reel.author,
            authorId: reel.authorId,
            authorAvatar: reel.authorAvatar,
            video: reel.video,
            poster: reel.poster,
            tags: reel.tags,
            stats: {
                likes: reel.likeCount || reel.likes.length,
                comments: reel.commentCount || reel.comments.length,
                views: reel.viewCount || reel.views.length,
            },
            userInteraction: {
                isLiked: reel.likes.some((like) => like.userId === userId),
                hasViewed: reel.views.some((view) => view.userId === userId),
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: formattedReels,
            message: 'Reels reordered successfully',
        });
    } catch (error) {
        console.error('Error reordering reels:', error);
        res.status(500).json({ success: false, error: 'Failed to reorder reels' });
    }
});

export default router;