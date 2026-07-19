// routes/user.js
import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
const router = express.Router();
const SALT_ROUNDS = 10;

// ---------- Helper: exclude password from response ----------
const filterUser = (userDoc) => {
    const { password, ...rest } = userDoc.toObject();
    return rest;
};

// ---------- GET all users (without passwords) ----------
router.get("/", async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        const filtered = users.map(user => filterUser(user));
        res.status(200).json(filtered);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(filterUser(user));
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
});

// ---------- GET a single user by ID (without password) ----------
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(filterUser(user));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ---------- CREATE a new user ----------
// avatar is taken as a string (URL, Base64, etc.)
router.post("/", async (req, res) => {
    try {
        const { name, email, password, avatar, about } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        // Check for duplicate email
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            avatar: avatar || "",
            about: about || "",
        });

        const savedUser = await newUser.save();
        res.status(201).json(filterUser(savedUser));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ---------- UPDATE a user (partial updates allowed) ----------
// Password update is optional – if provided, it will be hashed
router.put("/:id", async (req, res) => {
    try {
        const { name, email, password, avatar, about } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If email is being changed, check uniqueness
        if (email && email !== user.email) {
            const emailTaken = await User.findOne({ email });
            if (emailTaken) {
                return res.status(409).json({ message: "Email already in use" });
            }
        }

        // Prepare update data
        const updateData = {
            name: name || user.name,
            email: email || user.email,
            avatar: avatar !== undefined ? avatar : user.avatar,
            about: about !== undefined ? about : user.about,
        };

        // If password is provided, hash it
        if (password) {
            updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json(filterUser(updatedUser));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ---------- DELETE a user ----------
router.delete("/:id", async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ---------- LOGIN (authentication) ----------
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Return user data without password
        res.status(200).json({
            message: "Login successful",
            user: filterUser(user)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});






export default router;