import mongoose from "mongoose"

const NewsSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true
    },
    body: {
        type: [String],
        required: true
    },
    image: {
        type: [String],
        default: []
    },
    date: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    }
}, { timestamps: true })

const News = mongoose.model("News", NewsSchema)

export default News