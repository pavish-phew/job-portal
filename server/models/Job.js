import mongoose from "mongoose";


const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String },
    level: { type: String },
    salary: { type: String, required: true },
    date: { type: Number },
    visible: { type: Boolean, default: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    company: { type: String },
    companyLogo: { type: String },
    experience: { type: String },
    type: { type: String },
});

const Job = mongoose.model('Job', jobSchema)

export default Job 
