import express from 'express';
import mongoose from 'mongoose';
import News from '../models/News.js';
import User from '../models/User.js';
import axios from 'axios';

const router = express.Router();

// ==================== EMAIL SERVICE ====================

const sendNewsEmailToAllUsers = async (newsData) => {
    try {
        // Get all users with emails
        const users = await User.find({ email: { $ne: null } }).select('email name').lean();

        if (users.length === 0) {
            console.log('No users found to send news email');
            return;
        }

        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        // Prepare HTML content
        const imageHtml = newsData.image && newsData.image.length > 0
            ? `<img src="${newsData.image[0]}" alt="${newsData.title}" style="width:100%; max-height:300px; object-fit:cover; border-radius:8px; margin-bottom:20px;">`
            : '';

        const bodyHtml = newsData.body && newsData.body.length > 0
            ? newsData.body.map(paragraph => `<p style="line-height:1.8; color:#334155; font-size:15px;">${paragraph}</p>`).join('')
            : '';

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Newsletter",
                email: process.env.SUPPORT_EMAIL || "noreply@yourdomain.com"
            },
            to: users.map(user => ({
                email: user.email,
                name: user.name || 'Subscriber'
            })),
            subject: `📰 ${newsData.title}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="padding: 30px 30px 20px 30px; border-bottom: 3px solid #2563eb;">
                            <h1 style="color: #0f172a; font-size: 24px; margin: 0; font-weight: 700;">📰 News Update</h1>
                            <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">
                                ${new Date(newsData.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}
                            </p>
                        </div>
                        
                        <div style="padding: 30px;">
                            ${imageHtml}
                            
                            <div style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                                ${newsData.category}
                            </div>
                            
                            <h2 style="color: #0f172a; font-size: 22px; margin: 0 0 10px 0; font-weight: 700;">
                                ${newsData.title}
                            </h2>
                            
                            <p style="color: #475569; font-size: 16px; font-weight: 500; margin: 0 0 20px 0; border-left: 4px solid #2563eb; padding-left: 16px;">
                                ${newsData.excerpt}
                            </p>
                            
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 10px;">
                                ${bodyHtml}
                            </div>
                            
                            <div style="border-top: 1px solid #e2e8f0; margin-top: 25px; padding-top: 20px; color: #94a3b8; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                                <span>✍️ By ${newsData.author}</span>
                                <span>📅 ${new Date(newsData.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
                            <p style="margin: 5px 0 0 0;">
                                <a href="${process.env.FRONTEND_URL || '#'}" style="color: #2563eb; text-decoration: none;">Visit Website</a>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const response = await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            }
        });

        console.log(`News email sent to ${users.length} subscribers`);
        return { success: true, count: users.length };
    } catch (error) {
        console.error('Error sending news email:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// ==================== CREATE ====================

// POST /api/news - Create a new news article and send to all users
router.post('/', async (req, res) => {
    try {
        const { slug, title, excerpt, body, image, date, category, author } = req.body;

        // Validate required fields
        if (!slug || !title || !excerpt || !body || !date || !category || !author) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: slug, title, excerpt, body, date, category, author'
            });
        }

        // Check if slug already exists
        const existingNews = await News.findOne({ slug });
        if (existingNews) {
            return res.status(409).json({
                success: false,
                error: 'A news article with this slug already exists'
            });
        }

        const news = new News({
            slug,
            title,
            excerpt,
            body: Array.isArray(body) ? body : [body],
            image: image || [],
            date,
            category,
            author
        });

        await news.save();

        // Send email to all users (async - don't block response)
        sendNewsEmailToAllUsers(news).catch(err =>
            console.error('Failed to send news emails:', err)
        );

        res.status(201).json({
            success: true,
            data: news,
            message: 'News article created and sent to all subscribers'
        });
    } catch (error) {
        console.error('Error creating news article:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create news article'
        });
    }
});

// ==================== READ ====================

// GET /api/news - Get all news articles with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const category = req.query.category;
        const search = req.query.search || null;
        const skip = (page - 1) * limit;

        let query = {};

        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        const [news, total] = await Promise.all([
            News.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            News.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: news,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news articles'
        });
    }
});

// GET /api/news/:slug - Get a single news article by slug
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const news = await News.findOne({ slug });
        if (!news) {
            return res.status(404).json({
                success: false,
                error: 'News article not found'
            });
        }

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error('Error fetching news article:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news article'
        });
    }
});

// GET /api/news/id/:id - Get a single news article by ID
router.get('/id/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({
                success: false,
                error: 'News article not found'
            });
        }

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error('Error fetching news article:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news article'
        });
    }
});

// GET /api/news/category/:category - Get news articles by category
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [news, total] = await Promise.all([
            News.find({ category: { $regex: category, $options: 'i' } })
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            News.countDocuments({ category: { $regex: category, $options: 'i' } }),
        ]);

        res.status(200).json({
            success: true,
            data: news,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching news by category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news articles'
        });
    }
});

// GET /api/news/author/:author - Get news articles by author
router.get('/author/:author', async (req, res) => {
    try {
        const { author } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [news, total] = await Promise.all([
            News.find({ author: { $regex: author, $options: 'i' } })
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            News.countDocuments({ author: { $regex: author, $options: 'i' } }),
        ]);

        res.status(200).json({
            success: true,
            data: news,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching news by author:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news articles'
        });
    }
});

// GET /api/news/latest/limit - Get latest news articles
router.get('/latest/limit', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 5, 20);

        const news = await News.find()
            .sort({ date: -1, createdAt: -1 })
            .limit(limit)
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error('Error fetching latest news:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest news'
        });
    }
});

// GET /api/news/stats/overview - Get news statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const total = await News.countDocuments();

        const categoryCounts = await News.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const authorCounts = await News.aggregate([
            {
                $group: {
                    _id: '$author',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const recentNews = await News.find()
            .sort({ date: -1, createdAt: -1 })
            .limit(5)
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            data: {
                total,
                byCategory: categoryCounts,
                topAuthors: authorCounts,
                recentNews
            }
        });
    } catch (error) {
        console.error('Error fetching news stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news statistics'
        });
    }
});

// GET /api/news/search/:query - Search news
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [news, total] = await Promise.all([
            News.find({
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { excerpt: { $regex: query, $options: 'i' } },
                    { body: { $regex: query, $options: 'i' } },
                    { author: { $regex: query, $options: 'i' } },
                    { category: { $regex: query, $options: 'i' } }
                ]
            })
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            News.countDocuments({
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { excerpt: { $regex: query, $options: 'i' } },
                    { body: { $regex: query, $options: 'i' } },
                    { author: { $regex: query, $options: 'i' } },
                    { category: { $regex: query, $options: 'i' } }
                ]
            }),
        ]);

        res.status(200).json({
            success: true,
            data: news,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error searching news:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search news'
        });
    }
});

// ==================== UPDATE ====================

// PUT /api/news/:slug - Update a news article
router.put('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { title, excerpt, body, image, date, category, author } = req.body;

        const news = await News.findOne({ slug });
        if (!news) {
            return res.status(404).json({
                success: false,
                error: 'News article not found'
            });
        }

        // Check if new slug conflicts with existing
        if (req.body.slug && req.body.slug !== slug) {
            const existing = await News.findOne({ slug: req.body.slug });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'A news article with this slug already exists'
                });
            }
            news.slug = req.body.slug;
        }

        // Update fields
        if (title) news.title = title;
        if (excerpt) news.excerpt = excerpt;
        if (body) news.body = Array.isArray(body) ? body : [body];
        if (image) news.image = image;
        if (date) news.date = date;
        if (category) news.category = category;
        if (author) news.author = author;

        await news.save();

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error('Error updating news article:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update news article'
        });
    }
});

// ==================== DELETE ====================

// DELETE /api/news/:slug - Delete a news article
router.delete('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const news = await News.findOne({ slug });
        if (!news) {
            return res.status(404).json({
                success: false,
                error: 'News article not found'
            });
        }

        await news.deleteOne();

        res.status(200).json({
            success: true,
            message: 'News article deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting news article:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete news article'
        });
    }
});

// DELETE /api/news/batch - Delete multiple news articles
router.delete('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const result = await News.deleteMany({
            _id: { $in: ids }
        });

        res.status(200).json({
            success: true,
            data: {
                deleted: result.deletedCount
            },
            message: `${result.deletedCount} news articles deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting batch news:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete news articles'
        });
    }
});

// ==================== BATCH ====================

// POST /api/news/batch - Get multiple news articles by IDs
router.post('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const news = await News.find({
            _id: { $in: ids }
        })
            .sort({ date: -1 })
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error('Error fetching batch news:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch news articles'
        });
    }
});

// ==================== RESEND EMAIL ====================

// POST /api/news/:slug/resend - Resend news email to all users
router.post('/:slug/resend', async (req, res) => {
    try {
        const { slug } = req.params;

        const news = await News.findOne({ slug });
        if (!news) {
            return res.status(404).json({
                success: false,
                error: 'News article not found'
            });
        }

        // Resend email to all users
        const result = await sendNewsEmailToAllUsers(news);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `News email resent to ${result.count} subscribers`,
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send news emails',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error resending news email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend news email'
        });
    }
});

// POST /api/news/test-email - Send test email to a single user
router.post('/test-email', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Create a sample news article for testing
        const sampleNews = {
            title: 'Test Newsletter',
            excerpt: 'This is a test email to verify the newsletter system is working properly.',
            body: ['This is a test email. If you received this, the email system is working correctly.'],
            image: ['https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800'],
            date: new Date().toISOString(),
            category: 'Test',
            author: 'System'
        };

        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Newsletter",
                email: process.env.SUPPORT_EMAIL || "noreply@yourdomain.com"
            },
            to: [{ email, name: name || 'Test User' }],
            subject: "📧 Test Newsletter - System Check",
            htmlContent: `
                <div style="font-family: sans-serif; background: #f4f7fe; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px;">
                        <h1 style="color: #0f172a;">✅ Test Newsletter</h1>
                        <p style="color: #475569; font-size: 16px;">This is a test email to verify the newsletter system.</p>
                        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0; color: #166534;">If you received this, the email system is working correctly!</p>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Your Company</p>
                    </div>
                </div>
            `
        };

        await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            }
        });

        res.status(200).json({
            success: true,
            message: `Test email sent to ${email}`
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send test email'
        });
    }
});

export default router;