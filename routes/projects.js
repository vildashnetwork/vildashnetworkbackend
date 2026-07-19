import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Projects.js';
import axios from 'axios';

const router = express.Router();

// ==================== EMAIL SERVICES ====================

// Send project status update email to all subscribers
const sendProjectStatusUpdateEmail = async (project, oldStatus) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        // Get all users with emails
        const users = await User.find({ email: { $ne: null } }).select('email name').lean();

        if (users.length === 0) {
            console.log('No users found to send project update');
            return { success: true, count: 0 };
        }

        const statusText = {
            'canorder': 'Available for Order',
            'cannotorder': 'Currently Unavailable'
        };

        const statusColors = {
            'canorder': '#10b981',
            'cannotorder': '#ef4444'
        };

        const imageHtml = project.image && project.image.length > 0
            ? `<img src="${project.image[0]}" alt="${project.name}" style="width:100%; max-height:250px; object-fit:cover; border-radius:8px; margin-bottom:20px;">`
            : '';

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Project Updates",
                email: process.env.SUPPORT_EMAIL || "noreply@yourdomain.com"
            },
            to: users.map(user => ({
                email: user.email,
                name: user.name || 'Subscriber'
            })),
            subject: `Project Update: ${project.name} - ${statusText[project.statuse]}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Project Status Update</h1>
                            <p style="color: #94a3b8; margin: 5px 0 0 0;">${project.name}</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            ${imageHtml}
                            
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; background: ${statusColors[project.statuse]}; 
                                            color: white; padding: 8px 24px; border-radius: 24px; font-size: 16px; font-weight: 600;">
                                    ${statusText[project.statuse]}
                                </div>
                                ${oldStatus ? `
                                <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">
                                    Previously: ${statusText[oldStatus]}
                                </p>
                                ` : ''}
                            </div>
                            
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 10px;">
                                <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 10px 0;">${project.name}</h2>
                                <p style="color: #475569; font-size: 16px; margin: 0 0 8px 0;">${project.tagline}</p>
                                <div style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px;">
                                    ${project.tag}
                                </div>
                            </div>
                            
                            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 20px;">
                                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.8;">${project.description}</p>
                            </div>
                            
                            ${project.metrics && project.metrics.length > 0 ? `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
                                ${project.metrics.map(metric => `
                                <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center;">
                                    <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${metric.value}</div>
                                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${metric.label}</div>
                                </div>
                                `).join('')}
                            </div>
                            ` : ''}
                            
                            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                <a href="${process.env.FRONTEND_URL || '#'}/projects/${project.slug}" 
                                   style="background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                                    View Project Details
                                </a>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
                            <p style="margin: 5px 0 0 0;">
                                <a href="${process.env.FRONTEND_URL || '#'}" style="color: #2563eb; text-decoration: none;">Visit Website</a>
                            </p>
                        </div>
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

        console.log(`Project status update email sent to ${users.length} subscribers`);
        return { success: true, count: users.length };
    } catch (error) {
        console.error('Error sending project update email:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// ==================== ROUTES ====================

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
    try {
        const {
            slug,
            name,
            tag,
            image,
            tagline,
            description,
            longDescription,
            features,
            metrics,
            orderKey,
            statuse,
            active
        } = req.body;

        // Validate required fields
        if (!slug || !name || !tag || !image || !tagline || !description ||
            !longDescription || !orderKey) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: slug, name, tag, image, tagline, description, longDescription, orderKey'
            });
        }

        // Check if slug already exists
        const existingProject = await Project.findOne({ slug });
        if (existingProject) {
            return res.status(409).json({
                success: false,
                error: 'A project with this slug already exists'
            });
        }

        // Check if orderKey already exists
        const existingOrderKey = await Project.findOne({ orderKey });
        if (existingOrderKey) {
            return res.status(409).json({
                success: false,
                error: 'A project with this orderKey already exists'
            });
        }

        const project = new Project({
            slug,
            name,
            tag,
            image: Array.isArray(image) ? image : [image],
            tagline,
            description,
            longDescription: Array.isArray(longDescription) ? longDescription : [longDescription],
            features: features || [],
            metrics: metrics || [],
            orderKey,
            statuse: statuse || 'cannotorder',
            active: active !== undefined ? active : true
        });

        await project.save();

        res.status(201).json({
            success: true,
            data: project,
            message: 'Project created successfully'
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create project'
        });
    }
});

// GET /api/projects - Get all projects with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const statuse = req.query.statuse;
        const tag = req.query.tag;
        const active = req.query.active;
        const search = req.query.search || null;
        const skip = (page - 1) * limit;

        let query = {};

        if (statuse) {
            query.statuse = statuse;
        }

        if (tag) {
            query.tag = { $regex: tag, $options: 'i' };
        }

        if (active !== undefined && active !== null) {
            query.active = active === 'true';
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { tagline: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tag: { $regex: search, $options: 'i' } }
            ];
        }

        const [projects, total] = await Promise.all([
            Project.find(query)
                .sort({ orderKey: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Project.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: projects,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects'
        });
    }
});

// GET /api/projects/:slug - Get a single project by slug
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const project = await Project.findOne({ slug });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project'
        });
    }
});

// GET /api/projects/id/:id - Get a single project by ID
router.get('/id/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project'
        });
    }
});

// GET /api/projects/tag/:tag - Get projects by tag
router.get('/tag/:tag', async (req, res) => {
    try {
        const { tag } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            Project.find({ tag: { $regex: tag, $options: 'i' }, active: true })
                .sort({ orderKey: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Project.countDocuments({ tag: { $regex: tag, $options: 'i' }, active: true }),
        ]);

        res.status(200).json({
            success: true,
            data: projects,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching projects by tag:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects'
        });
    }
});

// GET /api/projects/status/:statuse - Get projects by status
router.get('/status/:statuse', async (req, res) => {
    try {
        const { statuse } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const validStatuses = ['canorder', 'cannotorder'];
        if (!validStatuses.includes(statuse)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: canorder, cannotorder'
            });
        }

        const [projects, total] = await Promise.all([
            Project.find({ statuse, active: true })
                .sort({ orderKey: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Project.countDocuments({ statuse, active: true }),
        ]);

        res.status(200).json({
            success: true,
            data: projects,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching projects by status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects'
        });
    }
});

// GET /api/projects/stats/overview - Get project statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const total = await Project.countDocuments();
        const active = await Project.countDocuments({ active: true });
        const inactive = await Project.countDocuments({ active: false });

        const statusCounts = await Project.aggregate([
            {
                $group: {
                    _id: '$statuse',
                    count: { $sum: 1 }
                }
            }
        ]);

        const tagCounts = await Project.aggregate([
            {
                $group: {
                    _id: '$tag',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const recentProjects = await Project.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
            .exec();

        const statusMap = {};
        statusCounts.forEach(item => {
            statusMap[item._id] = item.count;
        });

        res.status(200).json({
            success: true,
            data: {
                total,
                active,
                inactive,
                byStatus: statusMap,
                topTags: tagCounts,
                recentProjects
            }
        });
    } catch (error) {
        console.error('Error fetching project stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

// GET /api/projects/active/true - Get all active projects
router.get('/active/true', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            Project.find({ active: true })
                .sort({ orderKey: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Project.countDocuments({ active: true }),
        ]);

        res.status(200).json({
            success: true,
            data: projects,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching active projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active projects'
        });
    }
});

// PUT /api/projects/:slug - Update a project (triggers status change email)
router.put('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const updateData = req.body;

        const project = await Project.findOne({ slug });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Check if new slug conflicts with existing
        if (updateData.slug && updateData.slug !== slug) {
            const existing = await Project.findOne({ slug: updateData.slug });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'A project with this slug already exists'
                });
            }
        }

        // Check if new orderKey conflicts with existing
        if (updateData.orderKey && updateData.orderKey !== project.orderKey) {
            const existing = await Project.findOne({ orderKey: updateData.orderKey });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'A project with this orderKey already exists'
                });
            }
        }

        // Track status change
        const oldStatus = project.statuse;
        const statusChanged = updateData.statuse && updateData.statuse !== oldStatus;

        // Update fields
        Object.keys(updateData).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
                if (key === 'image' && typeof updateData.image === 'string') {
                    project.image = [updateData.image];
                } else if (key === 'longDescription' && typeof updateData.longDescription === 'string') {
                    project.longDescription = [updateData.longDescription];
                } else {
                    project[key] = updateData[key];
                }
            }
        });

        await project.save();

        // Send status update email if status changed
        if (statusChanged) {
            sendProjectStatusUpdateEmail(project, oldStatus).catch(err =>
                console.error('Failed to send project status update email:', err)
            );
        }

        res.status(200).json({
            success: true,
            data: project,
            message: statusChanged ? 'Project updated. Status change notification sent.' : 'Project updated successfully.'
        });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update project'
        });
    }
});

// PATCH /api/projects/:slug/status - Update project status (sends email notification)
router.patch('/:slug/status', async (req, res) => {
    try {
        const { slug } = req.params;
        const { statuse } = req.body;

        if (!statuse) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const validStatuses = ['canorder', 'cannotorder'];
        if (!validStatuses.includes(statuse)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: canorder, cannotorder'
            });
        }

        const project = await Project.findOne({ slug });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const oldStatus = project.statuse;
        project.statuse = statuse;
        await project.save();

        // Send status update email
        sendProjectStatusUpdateEmail(project, oldStatus).catch(err =>
            console.error('Failed to send project status update email:', err)
        );

        res.status(200).json({
            success: true,
            data: project,
            message: `Project status updated from ${oldStatus} to ${statuse}. Notification sent.`
        });
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update project status'
        });
    }
});

// PATCH /api/projects/:slug/active - Toggle project active status
router.patch('/:slug/active', async (req, res) => {
    try {
        const { slug } = req.params;
        const { active } = req.body;

        if (active === undefined || active === null) {
            return res.status(400).json({
                success: false,
                error: 'Active status is required'
            });
        }

        const project = await Project.findOne({ slug });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        project.active = active;
        await project.save();

        res.status(200).json({
            success: true,
            data: project,
            message: `Project ${active ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Error toggling project active status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update project active status'
        });
    }
});

// DELETE /api/projects/:slug - Delete a project
router.delete('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const project = await Project.findOne({ slug });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        await project.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete project'
        });
    }
});

// DELETE /api/projects/batch - Delete multiple projects
router.delete('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const result = await Project.deleteMany({
            _id: { $in: ids }
        });

        res.status(200).json({
            success: true,
            data: {
                deleted: result.deletedCount
            },
            message: `${result.deletedCount} projects deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting batch projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete projects'
        });
    }
});

// POST /api/projects/batch - Get multiple projects by IDs
router.post('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const projects = await Project.find({
            _id: { $in: ids }
        })
            .sort({ orderKey: 1 })
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            data: projects
        });
    } catch (error) {
        console.error('Error fetching batch projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects'
        });
    }
});

// POST /api/projects/:slug/resend-status - Resend status update email
router.post('/:slug/resend-status', async (req, res) => {
    try {
        const { slug } = req.params;

        const project = await Project.findOne({ slug });
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const result = await sendProjectStatusUpdateEmail(project, null);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Status update email resent to ${result.count} subscribers`
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send status update email',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error resending status update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend status update'
        });
    }
});

export default router;