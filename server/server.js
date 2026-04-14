import './config/instrument.js'
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import 'dotenv/config'
import connectDB from "./config/db.js";
import * as Sentry from "@sentry/node";
import { clerkWebhooks } from './controller/webhooks.js';
import companyRoutes from './routes/companyRoutes.js'
import connectCloudinary from './config/cloudinary.js';
import JobRoutes from './routes/jobRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { clerkMiddleware } from '@clerk/express';
// Initialize Express
const app = express();

// Connect to MongoDB
await connectDB();
await connectCloudinary();

// Middleware
app.use(cors());

// Webhook route MUST be placed before express.json() so it receives the raw unparsed Buffer
app.post('/webhooks', express.raw({ type: 'application/json' }), clerkWebhooks);

app.use(express.json());
app.use(clerkMiddleware());

// Routes
app.get("/", (req, res) => res.send("API Working"));

app.use('/api/company', companyRoutes)
app.use('/api/jobs', JobRoutes)
app.use('/api/users', userRoutes)

// Sentry error handler MUST be after all routes
Sentry.setupExpressErrorHandler(app);

app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("My first Sentry error!");
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
