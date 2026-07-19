import mongoose from "mongoose"

const ProjectSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    tag: {
        type: String,
        required: true
    },

    image: {
        type: [String],
        required: true
    },
    tagline: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    longDescription: {
        type: [String],
        required: true
    },
    weburl: {
        type: String,
        required: true
    },
    features: [
        {
            title: {
                type: String,
                required: true
            },
            desc: {
                type: String,
                required: true
            }
        }
    ],

    metrics: [
        {
            label: {
                type: String,
                required: true
            },
            value: {
                type: String,
                required: true
            }

        }
    ],
    orderKey: {
        type: String,
        required: true,
        unique: true
    },
    statuse: {
        type: String,
        enum: ["canorder", "cannotorder"],
        default: "cannotorder"
    },
    active: {
        type: Boolean,
        default: true
    }


}, { timestamps: true });

const Project = mongoose.model("Project", ProjectSchema)

export default Project
