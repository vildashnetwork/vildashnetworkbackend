import mongoose from "mongoose"

const OrderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true
    },
    product: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    message: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ["Standard", "Express"],
        default: "Standard"
    },
    date: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Processing", "Completed", "Cancelled"],
        default: "Pending"
    },
    canbeordered: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

const Order = mongoose.model("Order", OrderSchema)

export default Order