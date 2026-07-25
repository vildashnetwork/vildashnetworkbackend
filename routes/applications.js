import express from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import axios from 'axios';

const router = express.Router();

// ==================== EMAIL SERVICES ====================

// Send application confirmation to applicant
const sendApplicationConfirmationEmail = async (application) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Vildash Network",
                email: process.env.SUPPORT_EMAIL || "careers@vildash.com"
            },
            to: [{
                email: application.email,
                name: `${application.firstName} ${application.lastName}`
            }],
            subject: `✅ Application Received - #${application.applicationNumber}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Application Received</h1>
                            <p style="color: #93c5fd; margin: 5px 0 0 0;">Thank you for applying!</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #166534; font-weight: 500;">
                                    Application #${application.applicationNumber}
                                </p>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Position:</td>
                                    <td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${application.position}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Name:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${application.firstName} ${application.lastName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Email:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${application.email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Status:</td>
                                    <td style="padding: 8px 0;">
                                        <span style="background: #fef3c7; color: #92400e; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${application.status}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Date:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${application.date}</td>
                                </tr>
                            </table>
                            
                            ${application.linkedin ? `
                            <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                                <p style="margin: 0; color: #64748b; font-size: 14px;">LinkedIn: <a href="${application.linkedin}" style="color: #2563eb; text-decoration: none;">${application.linkedin}</a></p>
                            </div>
                            ` : ''}
                            
                            ${application.portfolio ? `
                            <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                                <p style="margin: 0; color: #64748b; font-size: 14px;">Portfolio: <a href="${application.portfolio}" style="color: #2563eb; text-decoration: none;">${application.portfolio}</a></p>
                            </div>
                            ` : ''}
                            
                            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 20px;">
                                <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">Cover Letter:</p>
                                <p style="margin: 0; color: #0f172a; white-space: pre-wrap;">${application.coverLetter}</p>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    You will receive updates when your application status changes.
                                </p>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Vildash Network'}. All rights reserved.</p>
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

        console.log(`Application confirmation email sent to ${application.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending application confirmation:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// Send application status update email
const sendApplicationStatusUpdateEmail = async (application, oldStatus) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        const statusColors = {
            'Received': '#fef3c7',
            'Reviewing': '#dbeafe',
            'Interview': '#f3e8ff',
            'Rejected': '#fee2e2',
            'Hired': '#d1fae5'
        };

        const statusTextColors = {
            'Received': '#92400e',
            'Reviewing': '#1e40af',
            'Interview': '#6b21a8',
            'Rejected': '#991b1b',
            'Hired': '#065f46'
        };

        const statusEmojis = {
            'Received': '📩',
            'Reviewing': '🔍',
            'Interview': '🤝',
            'Rejected': '📧',
            'Hired': '🎉'
        };

        const statusMessages = {
            'Received': 'Your application has been received and is awaiting review.',
            'Reviewing': 'Your application is currently being reviewed by our team.',
            'Interview': 'Congratulations! You have been selected for an interview.',
            'Rejected': 'Thank you for your interest. We have decided to move forward with other candidates.',
            'Hired': 'Congratulations! We are pleased to offer you the position.'
        };

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Vildash Network",
                email: process.env.SUPPORT_EMAIL || "careers@vildash.com"
            },
            to: [{
                email: application.email,
                name: `${application.firstName} ${application.lastName}`
            }],
            subject: `📋 Application Status Update - #${application.applicationNumber}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">${statusEmojis[application.status]} Status Update</h1>
                            <p style="color: #93c5fd; margin: 5px 0 0 0;">Application #${application.applicationNumber}</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; background: ${statusColors[application.status]}; 
                                            color: ${statusTextColors[application.status]}; 
                                            padding: 8px 24px; border-radius: 24px; font-size: 18px; font-weight: 700;">
                                    ${application.status}
                                </div>
                                ${oldStatus ? `
                                <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">
                                    Previously: ${oldStatus}
                                </p>
                                ` : ''}
                            </div>
                            
                            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #475569; text-align: center; font-size: 16px;">
                                    ${statusMessages[application.status] || 'Your application status has been updated.'}
                                </p>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Position:</td>
                                    <td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${application.position}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Name:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${application.firstName} ${application.lastName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Email:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${application.email}</td>
                                </tr>
                            </table>
                            
                            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    Need help? Contact us at ${process.env.SUPPORT_EMAIL || 'careers@vildash.com'}
                                </p>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Vildash Network'}. All rights reserved.</p>
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

        console.log(`Application status update email sent to ${application.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending status update:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// Send application notification to owner/admin
const sendApplicationNotificationToOwner = async (application) => {
    try {
        const ownerEmail = process.env.OWNER_EMAIL || process.env.SUPPORT_EMAIL;

        if (!ownerEmail) {
            console.log('No owner email configured');
            return { success: false, error: 'Owner email not configured' };
        }

        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Vildash Network",
                email: process.env.SUPPORT_EMAIL || "careers@vildash.com"
            },
            to: [{
                email: ownerEmail,
                name: "HR Team"
            }],
            subject: `🔔 New Application Received - #${application.applicationNumber}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Application!</h1>
                            <p style="color: #fca5a5; margin: 5px 0 0 0;">Action Required</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #92400e; font-weight: 500;">
                                    New application #${application.applicationNumber} from ${application.firstName} ${application.lastName}
                                </p>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Position:</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${application.position}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Name:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${application.firstName} ${application.lastName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">
                                        <a href="mailto:${application.email}" style="color: #2563eb; text-decoration: none;">${application.email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">LinkedIn:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">
                                        ${application.linkedin ? `<a href="${application.linkedin}" style="color: #2563eb; text-decoration: none;">${application.linkedin}</a>` : 'Not provided'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Portfolio:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">
                                        ${application.portfolio ? `<a href="${application.portfolio}" style="color: #2563eb; text-decoration: none;">${application.portfolio}</a>` : 'Not provided'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Resume:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">
                                        ${application.resumeName || 'Not provided'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Date:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${application.date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
                                    <td style="padding: 8px 0;">
                                        <span style="background: #fef3c7; color: #92400e; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${application.status}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px; font-weight: 600;">Cover Letter:</p>
                                <p style="margin: 0; color: #0f172a; white-space: pre-wrap;">${application.coverLetter}</p>
                            </div>
                            
                            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                                <a href="${process.env.FRONTEND_URL || '#'}/applications/${application._id}" 
                                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                                    View Application
                                </a>
                                <a href="mailto:${application.email}" 
                                   style="background: #f1f5f9; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                                    Reply to Applicant
                                </a>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Vildash Network'}. All rights reserved.</p>
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

        console.log(`Application notification sent to owner (${ownerEmail})`);
        return { success: true };
    } catch (error) {
        console.error('Error sending owner notification:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// ==================== ROUTES ====================

// POST /api/applications - Create a new application
router.post('/', async (req, res) => {
    try {
        const {
            applicationNumber,
            firstName,
            lastName,
            email,
            linkedin = "",
            portfolio = "",
            position,
            coverLetter,
            resumeName = "",
            resumeUrl = "",
            date,
            status = "Received"
        } = req.body;

        // Validate required fields
        if (!applicationNumber || !firstName || !lastName || !email ||
            !position || !coverLetter || !date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: applicationNumber, firstName, lastName, email, position, coverLetter, date'
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
            resumeUrl,
            date,
            status
        });

        await application.save();

        // Send emails (async - don't block response)
        Promise.all([
            sendApplicationConfirmationEmail(application),
            sendApplicationNotificationToOwner(application)
        ]).catch(err => console.error('Failed to send application emails:', err));

        res.status(201).json({
            success: true,
            data: application,
            message: 'Application created successfully. Email notifications sent.'
        });
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create application'
        });
    }
});

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

// PUT /api/applications/:id - Update an application (triggers status change email)
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

        // Track status change
        const oldStatus = application.status;
        const statusChanged = updateData.status && updateData.status !== oldStatus;

        // Update fields
        Object.keys(updateData).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
                application[key] = updateData[key];
            }
        });

        await application.save();

        // Send status update email if status changed
        if (statusChanged) {
            sendApplicationStatusUpdateEmail(application, oldStatus).catch(err =>
                console.error('Failed to send status update email:', err)
            );
        }

        res.status(200).json({
            success: true,
            data: application,
            message: statusChanged ? 'Application updated. Status change notification sent.' : 'Application updated successfully.'
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update application'
        });
    }
});

// PATCH /api/applications/:id/status - Update application status (sends email notification)
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

        const oldStatus = application.status;
        application.status = status;
        await application.save();

        // Send status update email
        sendApplicationStatusUpdateEmail(application, oldStatus).catch(err =>
            console.error('Failed to send status update email:', err)
        );

        res.status(200).json({
            success: true,
            data: application,
            message: `Application status updated from ${oldStatus} to ${status}. Notification sent.`
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update application status'
        });
    }
});

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

// POST /api/applications/:id/resend-confirmation - Resend application confirmation email
router.post('/:id/resend-confirmation', async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const result = await sendApplicationConfirmationEmail(application);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Confirmation email resent to ${application.email}`
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send confirmation email',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error resending confirmation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend confirmation'
        });
    }
});

// POST /api/applications/:id/resend-status - Resend status update email
router.post('/:id/resend-status', async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const result = await sendApplicationStatusUpdateEmail(application, null);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Status update email resent to ${application.email}`
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