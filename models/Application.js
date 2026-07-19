// models/Application.js

import mongoose from "mongoose";

const ApplicationSchema = new mongoose.Schema({
    applicationNumber: {
        type: String,
        required: true
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
        required: true
    },
    portfolio: {
        type: String,
        required: true
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
        required: true
    },
    date: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Received", "Reviewing", "Interview", "Rejected", "Hired"],
        default: "Reviewing"
    },
});


const Application = mongoose.model("Application", ApplicationSchema);

export default Application;