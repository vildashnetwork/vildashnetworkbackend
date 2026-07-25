



// routes/admin.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import axios from "axios";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const OTP_EXPIRY_MINUTES = 10;

// ------------------------- Helper: filter admin data -------------------------
const filterAdmin = (adminDoc) => {
    const { password, __v, otpcode, expirydate, ...rest } = adminDoc.toObject();
    return rest; // includes isVerified, googleId, etc.
};

// ------------------------- Brevo Email Sender (OTP) -------------------------
const sendAdminOtpEmail = async (admin) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";
        const otp = admin.otpcode;

        const emailContent = {
            sender: {
                name: process.env.SENDER_NAME || "Vildash Admin",
                email: process.env.SUPPORT_EMAIL || "noreply@vildashnetwork.com",
            },
            to: [{ email: admin.email, name: admin.name }],
            subject: "🔐 Your Vildash Admin OTP",
            htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f7fe; padding: 30px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">🔐 Two-Factor Authentication</h1>
            </div>
            <div style="padding: 30px;">
              <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">
                Hi <strong>${admin.name}</strong>,
              </p>
              <p style="color: #334155; font-size: 15px; line-height: 1.8;">
                Your one-time verification code is:
              </p>
              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${otp}</span>
              </div>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>. If you didn't request this, please ignore this email.
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} Vildash Network. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
        };

        await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
            },
        });

        console.log(`OTP email sent to ${admin.email}`);
    } catch (error) {
        console.error("OTP email error:", error.response?.data || error.message);
        throw new Error("Failed to send OTP email");
    }
};

// ------------------------- OTP Generation -------------------------
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const setOtpForAdmin = async (admin) => {
    const otp = generateOtp();
    admin.otpcode = otp;
    admin.expirydate = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await admin.save();
    return otp;
};

// ------------------------- Temp Token (short-lived) -------------------------
const generateTempToken = (adminId) => {
    return jwt.sign({ id: adminId, purpose: "otp" }, JWT_SECRET, { expiresIn: "15m" });
};

const verifyTempToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.purpose !== "otp") throw new Error("Invalid token purpose");
        return decoded;
    } catch (error) {
        throw new Error("Invalid or expired temporary token");
    }
};

// ------------------------- Login (Step 1: Credentials) -------------------------
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
        if (!admin) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Check if account is verified
        if (!admin.isVerified) {
            return res.status(403).json({ message: "Account not verified. Please contact support." });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (admin.twofactorenabled) {
            await setOtpForAdmin(admin);
            await sendAdminOtpEmail(admin);

            const tempToken = generateTempToken(admin._id);
            return res.status(200).json({
                requiresOtp: true,
                tempToken,
                message: "OTP sent to your email",
            });
        } else {
            const finalToken = jwt.sign(
                { id: admin._id, email: admin.email, role: "admin" },
                JWT_SECRET,
                { expiresIn: "7d" }
            );
            await admin.updateLastLogin();

            return res.status(200).json({
                requiresOtp: false,
                token: finalToken,
                admin: filterAdmin(admin),
                message: "Login successful",
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- Verify OTP (Step 2) -------------------------
router.post("/verify-otp", async (req, res) => {
    try {
        const { tempToken, otp } = req.body;
        if (!tempToken || !otp) {
            return res.status(400).json({ message: "Temporary token and OTP are required" });
        }

        let decoded;
        try {
            decoded = verifyTempToken(tempToken);
        } catch (error) {
            return res.status(401).json({ message: error.message });
        }

        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Check verification status
        if (!admin.isVerified) {
            return res.status(403).json({ message: "Account not verified. Please contact support." });
        }

        if (admin.otpcode !== otp) {
            return res.status(401).json({ message: "Invalid OTP" });
        }

        if (!admin.expirydate || new Date() > admin.expirydate) {
            return res.status(401).json({ message: "OTP has expired" });
        }

        admin.otpcode = null;
        admin.expirydate = null;
        await admin.save();

        const finalToken = jwt.sign(
            { id: admin._id, email: admin.email, role: "admin" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        await admin.updateLastLogin();

        res.status(200).json({
            message: "Login successful",
            admin: filterAdmin(admin),
            token: finalToken,
        });
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- Resend OTP -------------------------
router.post("/resend-otp", async (req, res) => {
    try {
        const { tempToken } = req.body;
        if (!tempToken) {
            return res.status(400).json({ message: "Temporary token is required" });
        }

        let decoded;
        try {
            decoded = verifyTempToken(tempToken);
        } catch (error) {
            return res.status(401).json({ message: error.message });
        }

        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        await setOtpForAdmin(admin);
        await sendAdminOtpEmail(admin);

        res.status(200).json({
            message: "New OTP sent to your email",
        });
    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- Google OAuth with Conditional 2FA -------------------------
passport.use(
    "admin-google",
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_ADMIN_CALLBACK_URL || "/api/admin/auth/google/callback",
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const admin = await Admin.findOrCreateGoogleUser(profile);
                done(null, admin);
            } catch (error) {
                done(error, null);
            }
        }
    )
);

router.get("/auth/google", passport.authenticate("admin-google", {
    scope: ["profile", "email"],
}));

router.get(
    "/auth/google/callback",
    passport.authenticate("admin-google", {
        failureRedirect: "/admin/login-failed",
        session: false,
    }),
    async (req, res) => {
        try {
            const admin = req.user;

            // Check verification status
            if (!admin.isVerified) {
                const frontendUrl = process.env.ADMINFRONTEND_URL || process.env.ADMINFRONTEND_URL;
                return res.redirect(`${frontendUrl}/admin/login-failed?reason=unverified`);
            }

            if (admin.twofactorenabled) {
                await setOtpForAdmin(admin);
                await sendAdminOtpEmail(admin);

                const tempToken = generateTempToken(admin._id);

                const frontendUrl = process.env.ADMINFRONTEND_URL || process.env.ADMINFRONTEND_URL;
                return res.redirect(`${frontendUrl}/admin/otp?tempToken=${encodeURIComponent(tempToken)}`);
            } else {
                const finalToken = jwt.sign(
                    { id: admin._id, email: admin.email, role: "admin" },
                    JWT_SECRET,
                    { expiresIn: "7d" }
                );
                await admin.updateLastLogin();

                const frontendUrl = process.env.ADMINFRONTEND_URL || process.env.ADMINFRONTEND_URL;
                return res.redirect(`${frontendUrl}/admin?token=${encodeURIComponent(finalToken)}`);
            }
        } catch (error) {
            console.error("Google callback error:", error);
            res.redirect("/admin/login-failed");
        }
    }
);

// ------------------------- GET all admins (verified admin only) -------------------------
router.get("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const requestingAdmin = await Admin.findById(decoded.id);
        if (!requestingAdmin || !requestingAdmin.isVerified) {
            return res.status(403).json({ message: "Forbidden: Only verified admins can access this resource" });
        }

        const admins = await Admin.find().select("-password -otpcode -expirydate");
        res.status(200).json(admins);
    } catch (error) {
        console.error("Get all admins error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- PATCH toggle isVerified for a specific admin -------------------------
router.patch("/:id/verify", async (req, res) => {
    try {
        const { id } = req.params;
        const { isVerified } = req.body;

        if (typeof isVerified !== "boolean") {
            return res.status(400).json({ message: "isVerified must be a boolean" });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const requestingAdmin = await Admin.findById(decoded.id);
        if (!requestingAdmin || !requestingAdmin.isVerified) {
            return res.status(403).json({ message: "Forbidden: Only verified admins can perform this action" });
        }

        if (decoded.id === id) {
            return res.status(400).json({ message: "You cannot change your own verification status" });
        }

        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        admin.isVerified = isVerified;
        await admin.save();

        res.status(200).json({
            message: `Admin verification status updated to ${isVerified}`,
            admin: filterAdmin(admin),
        });
    } catch (error) {
        console.error("Toggle verification error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- PUT: Update Admin -------------------------
// routes/admin.js – update the PUT route
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, avatar, about, twofactorenabled, isActive, role, isVerified } = req.body;

        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (email && email !== admin.email) {
            const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
            if (existing) {
                return res.status(409).json({ message: "Email already in use" });
            }
            admin.email = email.toLowerCase().trim();
        }

        if (name) admin.name = name;
        if (avatar !== undefined) admin.avatar = avatar;
        if (about !== undefined) admin.about = about;
        if (twofactorenabled !== undefined) admin.twofactorenabled = twofactorenabled;
        if (isActive !== undefined) admin.isActive = isActive;

        // Handle role update
        if (role !== undefined) {
            if (!["member", "admin"].includes(role)) {
                return res.status(400).json({ message: "Invalid role. Must be 'member' or 'admin'" });
            }
            admin.role = role;
        }

        // 🔥 FIX: Add isVerified update
        if (isVerified !== undefined) {
            if (typeof isVerified !== "boolean") {
                return res.status(400).json({ message: "isVerified must be a boolean" });
            }
            admin.isVerified = isVerified;
        }

        if (password) {
            admin.password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        await admin.save();

        res.status(200).json({
            message: "Admin updated successfully",
            admin: filterAdmin(admin),
        });
    } catch (error) {
        console.error("Update admin error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- Toggle 2FA -------------------------
router.patch("/:id/toggle-2fa", async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== "boolean") {
            return res.status(400).json({ message: "enabled must be a boolean" });
        }

        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        admin.twofactorenabled = enabled;
        await admin.save();

        res.status(200).json({
            message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
            twofactorenabled: admin.twofactorenabled,
        });
    } catch (error) {
        console.error("Toggle 2FA error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- GET current admin profile (me) -------------------------
router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        res.status(200).json(filterAdmin(admin));
    } catch (error) {
        console.error("Me endpoint error:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
});

export default router;