// routes/user.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

// ------------------------- Helper: exclude sensitive fields -------------------------
const filterUser = (userDoc) => {
    const { password, __v, ...rest } = userDoc.toObject();
    return rest;
};

// ------------------------- GET all users (admin only; add role check if needed) -------------------------
router.get("/", async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 })
            .select("-password -__v");
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- GET current user (from token) -------------------------
router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password -__v");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching /me:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
});

// ------------------------- GET single user by ID -------------------------
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password -__v");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- SIGN UP (create user) with JWT -------------------------
router.post("/", async (req, res) => {
    try {
        const { name, email, password, avatar, about } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Check duplicate email
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const newUser = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            avatar: avatar || "",
            about: about || "",
        });

        const savedUser = await newUser.save();

        // Generate JWT
        const token = jwt.sign(
            { id: savedUser._id, email: savedUser.email, name: savedUser.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User created successfully",
            user: filterUser(savedUser),
            token,
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- LOGIN with JWT -------------------------
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            user: filterUser(user),
            token,
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- UPDATE user (partial) -------------------------
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, avatar, about } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if email is changed and unique
        if (email && email !== user.email) {
            const normalizedEmail = email.toLowerCase().trim();
            const existing = await User.findOne({ email: normalizedEmail });
            if (existing) {
                return res.status(409).json({ message: "Email already in use" });
            }
            user.email = normalizedEmail;
        }

        if (name) user.name = name.trim();
        if (avatar !== undefined) user.avatar = avatar;
        if (about !== undefined) user.about = about;

        if (password) {
            user.password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        await user.save();

        res.status(200).json({
            message: "User updated successfully",
            user: filterUser(user),
        });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- DELETE user -------------------------
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ------------------------- LOGOUT (client-side only; no server action needed) -------------------------
// The frontend simply discards the token.

export default router;