import express from 'express';
import mongoose from 'mongoose';
import env from "dotenv";
import cors from "cors";
import passport from "passport";
import helmet from "helmet";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import session from "express-session";
import MongoStore from "connect-mongo";
import axios from "axios";
import reelRoutes from './routes/reels.js';
import users from "./routes/user.js"
import application from "./routes/applications.js"
import gellary from "./routes/gallery.js"
import news from "./routes/news.js"
import orders from "./routes/orders.js"
import projects from "./routes/projects.js"
import "./config/passport.js";

env.config();

const app = express();

// CORS Configuration
app.use(cors({
    origin: [
        "https://www.vildashnetwork.com",
        "https://dashboard.vildashnetwork.com",
        "https://vildash-horizon.vercel.app",
        "http://localhost:8081",
        "http://localhost:8080",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan(":method :url :status :response-time ms - :res[content-length]"));
app.use(express.urlencoded({ extended: true }));

// Constants
const JWT_SECRET = process.env.JWT_SECRET;
const MONGOURL = process.env.MONGOURI;
const FRONTEND = process.env.FRONTEND_URL;

// Database Connection
const connectdb = async () => {
    try {
        await mongoose.connect(MONGOURL);
        console.log("Database connection successful");
    } catch (error) {
        console.log("Database connection error:", error);
        process.exit(1);
    }
};

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || "your_session_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGOURL,
        collectionName: "sessions",
        ttl: 24 * 60 * 60 // 24 hours
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Health Check Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// ============ REEL ROUTES ============
// All reel routes are mounted at /api/reels
app.use('/api/reels', reelRoutes);
app.use("/api/user", users)
app.use("/api/application", application)
app.use("/api/gellary", gellary)
app.use("/api/news", news)
app.use("/api/orders", orders)
app.use("/api/projects", projects)

// ============ GOOGLE OAUTH ROUTES ============
app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));

app.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: `${FRONTEND}/login-failed`,
        session: true
    }),
    async (req, res) => {
        try {
            // Generate JWT token
            const token = jwt.sign(
                {
                    id: req.user._id,
                    email: req.user.email,
                    name: req.user.name
                },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            // Check if user is new
            const isNewUser = req.user.isNew || !req.user.lastLogin;

            if (isNewUser) {
                // Send welcome email asynchronously
                sendBrevoEmail(req.user.email, req.user.name).catch(err =>
                    console.error("Background email failed:", err)
                );
            }

            // Redirect to frontend with token
            const redirectUrl = `${FRONTEND}/?token=${encodeURIComponent(token)}`;
            return res.redirect(redirectUrl);
        } catch (jwtErr) {
            console.error("JWT generation error:", jwtErr);
            return res.redirect(`${FRONTEND}/`);
        }
    }
);

// ============ EMAIL SERVICE ============
const sendBrevoEmail = async (email, name) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        // Branding Constants
        const BRAND_BLUE = "#0B119A";
        const BRAND_GOLD = "#FFD700";
        const BANNER_URL = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000";

        const emailContent = {
            sender: { name: "Ladder Up Support", email: process.env.SUPPORT_EMAIL },
            to: [{ email: email }],
            subject: "Welcome to Ladder Up 1.0",
            htmlContent: `
                <div style="font-family: sans-serif; background: #f4f7fe; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                        <div style="background: url('${BANNER_URL}') center/cover; height: 180px; position: relative;">
                            <div style="background-color: ${BRAND_BLUE}; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(11,17,154,0.7), ${BRAND_BLUE});"></div>
                            <div style="position: relative; padding: 40px; text-align: center;">
                                <h1 style="color: ${BRAND_GOLD}; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">LADDER UP 1.0</h1>
                            </div>
                        </div>
                        <div style="padding: 40px; color: #1e293b;">
                            <h2 style="color: ${BRAND_BLUE}; margin-top: 0;">Welcome, ${name}!</h2>
                            <p style="line-height: 1.6; font-size: 16px;">You are now part of a network dedicated to high-performance growth and leadership.</p>
                            <div style="background: #f8fafc; border-left: 4px solid ${BRAND_BLUE}; padding: 20px; margin: 25px 0; font-style: italic; color: #475569;">
                                "Your journey toward intentional growth starts here."
                            </div>
                            <a href="${process.env.FRONTEND_URL || '#'}" 
                               style="display: block; text-align: center; background: ${BRAND_BLUE}; color: #ffffff; padding: 16px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                               Get Started Today
                            </a>
                            <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center;">
                                © ${new Date().getFullYear()} Ladder Up Network. All rights reserved.
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

        console.log(`Welcome email dispatched to ${email}`);
    } catch (error) {
        console.error("Email failed to send:", error.response?.data || error.message);
    }
};

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;

connectdb().then(() => {
    app.listen(PORT, () => {
        console.log(` Server running on port ${PORT}`);
        console.log(` Reels API available at: http://localhost:${PORT}/api/reels`);
        console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}).catch(error => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

export default app;