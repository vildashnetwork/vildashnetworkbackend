// models/Application.js
import mongoose from "mongoose";

const ApplicationSchema = new mongoose.Schema({
    applicationNumber: {
        type: String,
        required: true,
        unique: true // Added unique constraint
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    linkedin: {
        type: String,
        required: false, // Changed to false
        default: "" // Added default
    },
    portfolio: {
        type: String,
        required: false, // Changed to false
        default: "" // Added default
    },
    position: {
        type: String,
        required: true
    },
    coverLetter: {
        type: String,
        required: true
    },
    resumeName: {
        type: String,
        required: false, // Changed to false
        default: "" // Added default
    },
    resumeUrl: {
        type: String,
        default: "" // Added for Cloudinary URL
    },
    notes: {
        type: String,
        default: "" // Added for interview notes
    },
    date: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Received", "Reviewing", "Interview", "Rejected", "Hired"],
        default: "Received" // Changed from "Reviewing" to "Received" as first status
    }
}, {
    timestamps: true // Added timestamps
});

// Add index for better query performance
ApplicationSchema.index({ email: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ position: 1 });
ApplicationSchema.index({ applicationNumber: 1 });

const Application = mongoose.model("Application", ApplicationSchema);

export default Application;