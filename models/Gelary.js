// models/Gelary.js

import mongoose from "mongoose";

const GelarySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    media: {
        type: String,
        required: true
    }
}, { timestamps: true });


const Gelary = mongoose.model("Gelary", GelarySchema);

export default Gelary;