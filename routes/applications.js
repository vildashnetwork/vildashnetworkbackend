import express from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';

const router = express.Router();

// ==================== CREATE ====================

// POST /api/applications - Create a new application
router.post('/', async (req, res) => {
    try {
        const {
            applicationNumber,
            firstName,
            lastName,
            email,
            linkedin,
            portfolio,
            position,
            coverLetter,
            resumeName,
            date,
            status
        } = req.body;

        // Validate required fields
        if (!applicationNumber || !firstName || !lastName || !email ||
            !linkedin || !portfolio || !position || !coverLetter ||
            !resumeName || !date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: applicationNumber, firstName, lastName, email, linkedin, portfolio, position, coverLetter, resumeName, date'
            });
        }

        // Check for duplicate email
        const existingApplication = await Application.findOne({ email });
        if (existingApplication) {
            return res.status(409).json({
                success: false,
                error: 'An application with this email already exists'
            });
        }

        const application = new Application({
            applicationNumber,
            firstName,
            lastName,
            email,
            linkedin,
            portfolio,
            position,
            coverLetter,
            resumeName,
            date,
            status: status || 'Reviewing'
        });

        await application.save();

        res.status(201).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create application'
        });
    }
});

// ==================== READ ====================

// GET /api/applications - Get all applications with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const status = req.query.status;
        const position = req.query.position;
        const search = req.query.search || null;
        const skip = (page - 1) * limit;

        let query = {};

        if (status) {
            query.status = status;
        }

        if (position) {
            query.position = { $regex: position, $options: 'i' };
        }

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { applicationNumber: { $regex: search, $options: 'i' } },
            ];
        }

        const [applications, total] = await Promise.all([
            Application.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Application.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: applications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications'
        });
    }
});

// GET /api/applications/:id - Get a single application by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        res.status(200).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch application'
        });
    }
});

// GET /api/applications/email/:email - Get application by email
router.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const application = await Application.findOne({ email });
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found for this email'
            });
        }

        res.status(200).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error fetching application by email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch application'
        });
    }
});

// GET /api/applications/status/:status - Get applications by status
router.get('/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = (page - 1) * limit;

        const validStatuses = ['Received', 'Reviewing', 'Interview', 'Rejected', 'Hired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: Received, Reviewing, Interview, Rejected, Hired'
            });
        }

        const [applications, total] = await Promise.all([
            Application.find({ status })
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Application.countDocuments({ status }),
        ]);

        res.status(200).json({
            success: true,
            data: applications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching applications by status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications'
        });
    }
});

// GET /api/applications/position/:position - Get applications by position
router.get('/position/:position', async (req, res) => {
    try {
        const { position } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = (page - 1) * limit;

        const [applications, total] = await Promise.all([
            Application.find({
                position: { $regex: position, $options: 'i' }
            })
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Application.countDocuments({
                position: { $regex: position, $options: 'i' }
            }),
        ]);

        res.status(200).json({
            success: true,
            data: applications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching applications by position:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications'
        });
    }
});

// GET /api/applications/stats/overview - Get application statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const total = await Application.countDocuments();
        const statusCounts = await Application.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const positionCounts = await Application.aggregate([
            {
                $group: {
                    _id: '$position',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const recentApplications = await Application.find()
            .sort({ date: -1, createdAt: -1 })
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
                byStatus: statusMap,
                topPositions: positionCounts,
                recentApplications
            }
        });
    } catch (error) {
        console.error('Error fetching application stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

// GET /api/applications/check/email/:email - Check if email exists
router.get('/check/email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const application = await Application.findOne({ email });

        res.status(200).json({
            success: true,
            data: {
                exists: !!application,
                application: application || null
            }
        });
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check email'
        });
    }
});

// ==================== UPDATE ====================

// PUT /api/applications/:id - Update an application
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow updating email to a duplicate
        if (updateData.email) {
            const existing = await Application.findOne({
                email: updateData.email,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Another application with this email already exists'
                });
            }
        }

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Update fields
        Object.keys(updateData).forEach(key => {
            if (key !== '_id' && key !== '__v') {
                application[key] = updateData[key];
            }
        });

        await application.save();

        res.status(200).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update application'
        });
    }
});

// PATCH /api/applications/:id/status - Update application status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const validStatuses = ['Received', 'Reviewing', 'Interview', 'Rejected', 'Hired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: Received, Reviewing, Interview, Rejected, Hired'
            });
        }

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        application.status = status;
        await application.save();

        res.status(200).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update application status'
        });
    }
});

// ==================== DELETE ====================

// DELETE /api/applications/:id - Delete an application
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        await application.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete application'
        });
    }
});

// DELETE /api/applications/email/:email - Delete application by email
router.delete('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const application = await Application.findOne({ email });
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found for this email'
            });
        }

        await application.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete application'
        });
    }
});

// ==================== BATCH ====================

// POST /api/applications/batch - Get multiple applications by IDs
router.post('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const applications = await Application.find({
            _id: { $in: ids }
        }).lean().exec();

        res.status(200).json({
            success: true,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching batch applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications'
        });
    }
});

// PUT /api/applications/batch/status - Update status for multiple applications
router.put('/batch/status', async (req, res) => {
    try {
        const { ids, status } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const validStatuses = ['Received', 'Reviewing', 'Interview', 'Rejected', 'Hired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: Received, Reviewing, Interview, Rejected, Hired'
            });
        }

        const result = await Application.updateMany(
            { _id: { $in: ids } },
            { status }
        );

        res.status(200).json({
            success: true,
            data: {
                matched: result.matchedCount,
                modified: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Error updating batch status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update applications'
        });
    }
});

// DELETE /api/applications/batch - Delete multiple applications
router.delete('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const result = await Application.deleteMany({
            _id: { $in: ids }
        });

        res.status(200).json({
            success: true,
            data: {
                deleted: result.deletedCount
            },
            message: `${result.deletedCount} applications deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting batch applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete applications'
        });
    }
});

export default router;