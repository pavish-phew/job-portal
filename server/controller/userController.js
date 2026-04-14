import User from "../models/User.js";
import JobApplication from "../models/JobApplication.js";
import Job from "../models/Job.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { clerkClient } from "@clerk/express";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Get user Data
export const getUserData = async (req, res) => {
  const userId = req.auth.userId;

  try {
    let user = await User.findById(userId);

    if (!user) {
      // Fallback: If webhook didn't create user, create it here
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await User.create({
        _id: clerkUser.id,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        image: clerkUser.imageUrl,
        resume: "",
      });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.log("Error fetching user:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Apply For a Job
export const applyForJob = async (req, res) => {
  const { jobId } = req.body;
  const userId = req.auth.userId;

  try {
    const isAlreadyApplied = await JobApplication.findOne({ userId, jobId });

    if (isAlreadyApplied) {
      return res.json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    const jobData = await Job.findById(jobId);

    if (!jobData) {
      return res.json({ success: false, message: "Job not found" });
    }

    await JobApplication.create({
      companyId: jobData.companyId || null,
      userId,
      jobId,
      date: Date.now(),
    });

    res.json({ success: true, message: "Applied Successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get User applied applications
export const getUserJobApplications = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const applications = await JobApplication.find({ userId })
      .populate("companyId", "name email image")
      .populate("jobId", "title description location level salary")
      .exec();

    if (!applications) {
      return res.json({
        success: false,
        message: "No applications found for this User",
      });
    }

    return res.json({ success: true, applications });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update User Profile (resume)
export const updateUserResume = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const resumeFile = req.file;

    if (!resumeFile) {
      return res.json({ success: false, message: "No resume file provided" });
    }

    let userData = await User.findById(userId);

    if (!userData) {
      // Fallback auto-sync
      const clerkUser = await clerkClient.users.getUser(userId);
      userData = await User.create({
        _id: clerkUser.id,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        image: clerkUser.imageUrl,
        resume: "",
      });
    }

    // Upload to Cloudinary
    const resumeUpload = await cloudinary.uploader.upload(resumeFile.path, {
      resource_type: "image", // Cloudinary natively handles PDFs as "image"
      folder: "resumes", // Keeps it organized
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { resume: resumeUpload.secure_url },
      { new: true }
    );

    // Clean up temp file
    try {
      if (fs.existsSync(resumeFile.path)) {
        fs.unlinkSync(resumeFile.path);
      }
    } catch (e) {
      // ignore cleanup errors
    }

    return res.json({ 
      success: true, 
      message: "Resume Updated Successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    res.json({ success: false, message: error.message });
  }
};

// Analyze Resume
export const analyzeResume = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const resumeFile = req.file;

    if (!resumeFile) {
      return res.json({ success: false, message: "No resume file provided" });
    }

    // Read file and parse PDF
    const dataBuffer = fs.readFileSync(resumeFile.path);
    const data = await pdfParse(dataBuffer);
    const text = data.text.toLowerCase();

    // Define a list of common tech skills to look for
    const predefinedSkills = [
      "react", "node", "mongodb", "java", "python", "express", "javascript", 
      "sql", "aws", "docker", "kubernetes", "typescript", "c++", "c#", "ruby", 
      "php", "go", "swift", "angular", "vue", "django", "spring", "html", "css",
      "machine learning", "cloud", "agile", "scrum", "git", "linux", "azure"
    ];
    
    // Extract unique skills found in the resume
    const extractedSkills = predefinedSkills.filter((skill) => text.includes(skill));

    // Cleanup temp file
    try {
      if (fs.existsSync(resumeFile.path)) {
        fs.unlinkSync(resumeFile.path);
      }
    } catch (e) {
      // ignore cleanup errors
    }

    // Match jobs based on extracted skills
    let matchedJobs = [];
    if (extractedSkills.length > 0) {
      // Create regex for case-insensitive matching
      const regexQueries = extractedSkills.map(skill => new RegExp(skill, 'i'));
      
      matchedJobs = await Job.find({
        visible: true,
        $or: [
          { description: { $in: regexQueries } },
          { title: { $in: regexQueries } },
          { category: { $in: regexQueries } }
        ]
      })
      .populate("companyId", "name email image")
      .limit(10);
    } else {
      // Fallback: If no skills found, suggest latest jobs
      matchedJobs = await Job.find({ visible: true })
        .populate("companyId", "name email image")
        .sort({ date: -1 })
        .limit(6);
    }

    return res.json({
      success: true,
      skills: extractedSkills,
      matchedJobs
    });

  } catch (error) {
    console.error("Resume analysis error:", error);
    res.json({ success: false, message: error.message });
  }
};