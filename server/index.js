import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { storage } from './services/storage.js';
import { db } from './services/db.js';
import { audioService, initAudioService } from './services/audioService.js';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

console.log('Admin Password Loaded:', ADMIN_PASSWORD ? 'Yes' : 'No');
if (ADMIN_PASSWORD) console.log('Password length:', ADMIN_PASSWORD.length);

// Middleware
app.use(cors());
app.use(express.json());

// Static files (uploads)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

app.use('/uploads', express.static(UPLOADS_DIR));

// Multer Config
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    })
});

// Routes

// Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin-session-token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Upload
const uploadFields = upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    { name: 'json', maxCount: 1 }
]);

app.post('/api/admin/upload', uploadFields, async (req, res) => {
    try {
        const files = req.files;
        const { category, series } = req.body; // Get new fields

        if (!files || !files.cover || !files.audio || !files.json) {
            return res.status(400).json({ message: 'Missing files' });
        }

        // 1. Read JSON content to get metadata (Title, Desc)
        const jsonPath = files.json[0].path;
        const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        // 2. Save files to storage (Local or OSS)
        const coverUrl = await storage.save(files.cover[0]);
        const audioUrl = await storage.save(files.audio[0]);
        const jsonFileUrl = await storage.save(files.json[0]);

        const newCourse = {
            id: Date.now().toString(),
            title: jsonContent.title || 'Untitled Course',
            description: jsonContent.description || '',
            coverUrl,
            audioUrl,
            jsonUrl: jsonFileUrl,
            createdAt: new Date().toISOString(),
            category: category || 'directory', // Default to directory
            series: series || ''
        };

        await db.update(({ courses }) => courses.push(newCourse));

        res.json({ success: true, course: newCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

import { audioService } from './services/audioService.js';

// Init background service
initAudioService(); // Call init function we just imported? No, wait, I need to import it properly.

// ... (Wait, I need to update imports first) 
// I will do separate edits for import and logic to be safe.
// This edit replaces the OLD Generate API and updates Get Course and Get Courses logic.

// Get All Courses (with pagination)
app.get('/api/courses', async (req, res) => {
    await db.read();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    let filteredCourses = [...db.data.courses];
    if (category) {
        filteredCourses = filteredCourses.filter(c => {
            const cCategory = c.category || 'directory';
            return cCategory === category;
        });
    }

    const sortedCourses = filteredCourses.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (endIndex < sortedCourses.length) {
        results.next = { page: page + 1, limit: limit };
    }
    if (startIndex > 0) {
        results.previous = { page: page - 1, limit: limit };
    }

    // Use shared service for stats
    const coursesWithStats = await Promise.all(sortedCourses.slice(startIndex, endIndex).map(async (course) => {
        const stats = await audioService.getStats(course);
        return { ...course, stats };
    }));

    results.results = coursesWithStats;
    results.total = sortedCourses.length;

    res.json(results);
});

// ... [Skipping upload/update routes which are fine] ...

// Get Course Detail (Updated with Stats)
app.get('/api/courses/:id', async (req, res) => {
    await db.read();
    const course = db.data.courses.find(c => c.id === req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Append stats
    const stats = await audioService.getStats(course);
    res.json({ ...course, stats });
});

// Admin Audio Status
app.get('/api/admin/audio-status', (req, res) => {
    res.json(audioService.getStatus());
});

// Manual Trigger
app.post('/api/admin/audio-trigger', (req, res) => {
    audioService.trigger();
    res.json({ success: true, message: 'Task started' });
});

// Legacy single course generate (Optional, can keep or redirect to service trigger)
// keeping it for specific manual override on a single course if needed, 
// OR we can make the service smart enough. 
// For now let's simplify and rely on the global trigger or just keep the old logic?
// The user asked to "replace" with background check. 
// But keeping the specific button logic is also fine. 
// Actually I'll remove the huge block of code and just say "Triggered" or fail.
// Wait, the user might still want to click "Generate" on a specific course.
// I'll leave the OLD generate route BUT update it to use the new service logic if possible?
// The new service is "process ALL missing". 
// Let's deprecate the per-course generate button in favor of the global task manager, 
// OR simpler: The per-course button can just trigger the function for that specific course?
// For simplicity given the request, I will REMOVE the old complex endpoint 
// since we now have a global manager.


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
