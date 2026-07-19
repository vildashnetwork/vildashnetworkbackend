import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import axios from 'axios';

const router = express.Router();

// ==================== EMAIL SERVICES ====================

// Send order confirmation to customer
const sendOrderConfirmationEmail = async (order) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Order System",
                email: process.env.SUPPORT_EMAIL || "orders@yourdomain.com"
            },
            to: [{
                email: order.email,
                name: order.name
            }],
            subject: `✅ Order Confirmed - #${order.orderNumber}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Order Confirmed</h1>
                            <p style="color: #93c5fd; margin: 5px 0 0 0;">Thank you for your order!</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #166534; font-weight: 500;">
                                    Order #${order.orderNumber}
                                </p>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Product:</td>
                                    <td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${order.product}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Priority:</td>
                                    <td style="padding: 8px 0;">
                                        <span style="background: ${order.priority === 'Express' ? '#fef3c7' : '#e0e7ff'}; 
                                                     color: ${order.priority === 'Express' ? '#92400e' : '#3730a3'}; 
                                                     padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${order.priority}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Status:</td>
                                    <td style="padding: 8px 0;">
                                        <span style="background: #fef3c7; color: #92400e; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${order.status}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Date:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${order.date}</td>
                                </tr>
                            </table>
                            
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                <h3 style="color: #0f172a; margin: 0 0 8px 0;">Company Details</h3>
                                <p style="margin: 0; color: #475569; font-size: 14px;">${order.company}</p>
                                <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;">${order.phone}</p>
                            </div>
                            
                            ${order.message ? `
                            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 20px;">
                                <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">Message:</p>
                                <p style="margin: 0; color: #0f172a;">${order.message}</p>
                            </div>
                            ` : ''}
                            
                            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    You will receive updates when your order status changes.
                                </p>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
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

        console.log(`Order confirmation email sent to ${order.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending order confirmation:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// Send order status update email to customer
const sendOrderStatusUpdateEmail = async (order, oldStatus) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        const statusColors = {
            'Pending': '#fef3c7',
            'Processing': '#dbeafe',
            'Completed': '#d1fae5',
            'Cancelled': '#fee2e2'
        };

        const statusTextColors = {
            'Pending': '#92400e',
            'Processing': '#1e40af',
            'Completed': '#065f46',
            'Cancelled': '#991b1b'
        };

        const statusEmojis = {
            'Pending': 'pending',
            'Processing': 'processing',
            'Completed': 'completed',
            'Cancelled': '❌'
        };

        const statusMessages = {
            'Pending': 'Your order has been received and is awaiting processing.',
            'Processing': 'Your order is currently being processed.',
            'Completed': 'Your order has been completed successfully!',
            'Cancelled': 'Your order has been cancelled.'
        };

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Order System",
                email: process.env.SUPPORT_EMAIL || "orders@yourdomain.com"
            },
            to: [{
                email: order.email,
                name: order.name
            }],
            subject: `📦 Order Update - #${order.orderNumber}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">${statusEmojis[order.status]} Status Update</h1>
                            <p style="color: #93c5fd; margin: 5px 0 0 0;">Order #${order.orderNumber}</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="display: inline-block; background: ${statusColors[order.status]}; 
                                            color: ${statusTextColors[order.status]}; 
                                            padding: 8px 24px; border-radius: 24px; font-size: 18px; font-weight: 700;">
                                    ${order.status}
                                </div>
                                ${oldStatus ? `
                                <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">
                                    Previously: ${oldStatus}
                                </p>
                                ` : ''}
                            </div>
                            
                            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #475569; text-align: center; font-size: 16px;">
                                    ${statusMessages[order.status] || 'Your order status has been updated.'}
                                </p>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Product:</td>
                                    <td style="padding: 8px 0; font-weight: 500; color: #0f172a;">${order.product}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Priority:</td>
                                    <td style="padding: 8px 0;">
                                        <span style="background: ${order.priority === 'Express' ? '#fef3c7' : '#e0e7ff'}; 
                                                     color: ${order.priority === 'Express' ? '#92400e' : '#3730a3'}; 
                                                     padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${order.priority}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Company:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${order.company}</td>
                                </tr>
                            </table>
                            
                            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    Need help? Contact us at ${process.env.SUPPORT_EMAIL || 'support@yourdomain.com'}
                                </p>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
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

        console.log(`Order status update email sent to ${order.email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending status update:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// Send order notification to owner/admin
const sendOrderNotificationToOwner = async (order) => {
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
                name: process.env.SENDER_NAME || "Order System",
                email: process.env.SUPPORT_EMAIL || "orders@yourdomain.com"
            },
            to: [{
                email: ownerEmail,
                name: "Order Owner"
            }],
            subject: `🔔 New Order Received - #${order.orderNumber}`,
            htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 30px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Order!</h1>
                            <p style="color: #fca5a5; margin: 5px 0 0 0;">Action Required</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #92400e; font-weight: 500;">
                                    New order #${order.orderNumber} from ${order.name}
                                </p>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Customer:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${order.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">
                                        <a href="mailto:${order.email}" style="color: #2563eb; text-decoration: none;">${order.email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Phone:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${order.phone}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Company:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${order.company}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Product:</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${order.product}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Priority:</td>
                                    <td style="padding: 8px 0;">
                                        <span style="background: ${order.priority === 'Express' ? '#fef3c7' : '#e0e7ff'}; 
                                                     color: ${order.priority === 'Express' ? '#92400e' : '#3730a3'}; 
                                                     padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${order.priority}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Date:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">${order.date}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Status:</td>
                                    <td style="padding: 8px 0;">
                                        <span style="background: #fef3c7; color: #92400e; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${order.status}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                            
                            ${order.message ? `
                            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px; font-weight: 600;">Customer Message:</p>
                                <p style="margin: 0; color: #0f172a;">${order.message}</p>
                            </div>
                            ` : ''}
                            
                            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                                <a href="${process.env.FRONTEND_URL || '#'}/orders/${order._id}" 
                                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                                    View Order
                                </a>
                                <a href="mailto:${order.email}" 
                                   style="background: #f1f5f9; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                                    Reply to Customer
                                </a>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
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

        console.log(`Order notification sent to owner (${ownerEmail})`);
        return { success: true };
    } catch (error) {
        console.error('Error sending owner notification:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

// ==================== ROUTES ====================

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
    try {
        const {
            orderNumber,
            product,
            name,
            company,
            email,
            phone,
            message,
            priority,
            date,
            status,
            canbeordered
        } = req.body;

        // Validate required fields
        if (!orderNumber || !product || !name || !company || !email || !phone || !message || !date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: orderNumber, product, name, company, email, phone, message, date'
            });
        }

        // Check for duplicate email
        const existingOrder = await Order.findOne({ email });
        if (existingOrder) {
            return res.status(409).json({
                success: false,
                error: 'An order with this email already exists'
            });
        }

        const order = new Order({
            orderNumber,
            product,
            name,
            company,
            email,
            phone,
            message,
            priority: priority || 'Standard',
            date,
            status: status || 'Pending',
            canbeordered: canbeordered !== undefined ? canbeordered : true
        });

        await order.save();

        // Send emails (async - don't block response)
        Promise.all([
            sendOrderConfirmationEmail(order),
            sendOrderNotificationToOwner(order)
        ]).catch(err => console.error('Failed to send order emails:', err));

        res.status(201).json({
            success: true,
            data: order,
            message: 'Order created successfully. Email notifications sent.'
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
        });
    }
});

// GET /api/orders - Get all orders with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const status = req.query.status;
        const priority = req.query.priority;
        const search = req.query.search || null;
        const skip = (page - 1) * limit;

        let query = {};

        if (status) {
            query.status = status;
        }

        if (priority) {
            query.priority = priority;
        }

        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { product: { $regex: search, $options: 'i' } }
            ];
        }

        const [orders, total] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Order.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// GET /api/orders/:id - Get a single order by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order'
        });
    }
});

// GET /api/orders/email/:email - Get orders by email
router.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find({ email })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Order.countDocuments({ email }),
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching orders by email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// GET /api/orders/status/:status - Get orders by status
router.get('/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: Pending, Processing, Completed, Cancelled'
            });
        }

        const [orders, total] = await Promise.all([
            Order.find({ status })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Order.countDocuments({ status }),
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching orders by status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// GET /api/orders/stats/overview - Get order statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const total = await Order.countDocuments();

        const statusCounts = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const priorityCounts = await Order.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
            .exec();

        const statusMap = {};
        statusCounts.forEach(item => {
            statusMap[item._id] = item.count;
        });

        const priorityMap = {};
        priorityCounts.forEach(item => {
            priorityMap[item._id] = item.count;
        });

        res.status(200).json({
            success: true,
            data: {
                total,
                byStatus: statusMap,
                byPriority: priorityMap,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

// PUT /api/orders/:id - Update an order (triggers status change email)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Check for duplicate email if updating
        if (updateData.email && updateData.email !== order.email) {
            const existing = await Order.findOne({
                email: updateData.email,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Another order with this email already exists'
                });
            }
        }

        // Check for duplicate phone if updating
        if (updateData.phone && updateData.phone !== order.phone) {
            const existing = await Order.findOne({
                phone: updateData.phone,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Another order with this phone already exists'
                });
            }
        }

        // Track status change
        const oldStatus = order.status;
        const statusChanged = updateData.status && updateData.status !== oldStatus;

        // Update fields
        Object.keys(updateData).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
                order[key] = updateData[key];
            }
        });

        await order.save();

        // Send status update email if status changed
        if (statusChanged) {
            sendOrderStatusUpdateEmail(order, oldStatus).catch(err =>
                console.error('Failed to send status update email:', err)
            );
        }

        res.status(200).json({
            success: true,
            data: order,
            message: statusChanged ? 'Order updated. Status change notification sent.' : 'Order updated successfully.'
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order'
        });
    }
});

// PATCH /api/orders/:id/status - Update order status (sends email notification)
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

        const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: Pending, Processing, Completed, Cancelled'
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const oldStatus = order.status;
        order.status = status;
        await order.save();

        // Send status update email
        sendOrderStatusUpdateEmail(order, oldStatus).catch(err =>
            console.error('Failed to send status update email:', err)
        );

        res.status(200).json({
            success: true,
            data: order,
            message: `Order status updated from ${oldStatus} to ${status}. Notification sent.`
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
});

// DELETE /api/orders/:id - Delete an order
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete order'
        });
    }
});

// DELETE /api/orders/batch - Delete multiple orders
router.delete('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const result = await Order.deleteMany({
            _id: { $in: ids }
        });

        res.status(200).json({
            success: true,
            data: {
                deleted: result.deletedCount
            },
            message: `${result.deletedCount} orders deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting batch orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete orders'
        });
    }
});

// POST /api/orders/batch - Get multiple orders by IDs
router.post('/batch', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'ids array is required'
            });
        }

        const orders = await Order.find({
            _id: { $in: ids }
        })
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching batch orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// POST /api/orders/:id/resend-confirmation - Resend order confirmation email
router.post('/:id/resend-confirmation', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const result = await sendOrderConfirmationEmail(order);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Confirmation email resent to ${order.email}`
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

// POST /api/orders/:id/resend-status - Resend status update email
router.post('/:id/resend-status', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const result = await sendOrderStatusUpdateEmail(order, null);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Status update email resent to ${order.email}`
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