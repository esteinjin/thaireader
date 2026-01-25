import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { storage } from './services/storage.js';
import { db } from './services/db.js';
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
        if (!files || !files.cover || !files.audio || !files.json) {
            return res.status(400).json({ message: 'Missing files' });
        }

        // 1. Read JSON content to get metadata (Title, Desc)
        // We read from the temp path before storage.save might move/delete it (in OSS mode)
        const jsonPath = files.json[0].path;
        const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        // 2. Save files to storage (Local or OSS)
        // Note: storage.save might delete the local file if in OSS mode
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
            createdAt: new Date().toISOString()
        };

        await db.update(({ courses }) => courses.push(newCourse));

        res.json({ success: true, course: newCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// Get All Courses (with pagination)
app.get('/api/courses', async (req, res) => {
    await db.read();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    // Sort by createdAt desc
    const sortedCourses = [...db.data.courses].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (endIndex < sortedCourses.length) {
        results.next = {
            page: page + 1,
            limit: limit
        };
    }

    if (startIndex > 0) {
        results.previous = {
            page: page - 1,
            limit: limit
        };
    }

    // Calculate word stats for each course
    const coursesWithStats = await Promise.all(sortedCourses.slice(startIndex, endIndex).map(async (course) => {
        let totalWords = 0;
        let hasAudioCount = 0;

        try {
            let jsonContent;
            if (course.jsonUrl.startsWith('http')) {
                const fileName = path.basename(course.jsonUrl);
                const localPath = path.join(UPLOADS_DIR, fileName);

                if (fs.existsSync(localPath)) {
                    jsonContent = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
                } else {
                    // Local cache missing, download from OSS
                    try {
                        const resp = await axios.get(course.jsonUrl);
                        jsonContent = resp.data;
                        // Save to local for next time
                        fs.writeFileSync(localPath, JSON.stringify(jsonContent, null, 2));
                    } catch (err) {
                        console.error(`Failed to download JSON for stats: ${course.jsonUrl}`, err.message);
                    }
                }
            } else {
                const fileName = path.basename(course.jsonUrl);
                const localPath = path.join(UPLOADS_DIR, fileName);
                if (fs.existsSync(localPath)) {
                    jsonContent = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
                }
            }

            if (jsonContent && jsonContent.sentences) {
                jsonContent.sentences.forEach(s => {
                    if (s.words) {
                        s.words.forEach(w => {
                            totalWords++;
                            if (w.audioUrl && w.audioUrl.trim() !== "") hasAudioCount++;
                        });
                    }
                });
            }
        } catch (e) {
            console.error(`Error reading stats for course ${course.id}:`, e);
        }

        return {
            ...course,
            stats: {
                totalWords,
                hasAudioCount,
                isComplete: totalWords > 0 && totalWords === hasAudioCount
            }
        };
    }));

    results.results = coursesWithStats;
    results.total = sortedCourses.length;

    res.json(results);
});

// Update Course (Re-upload)
app.put('/api/admin/courses/:id', uploadFields, async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files || {};

        await db.read();
        const courseIndex = db.data.courses.findIndex(c => c.id === id);
        if (courseIndex === -1) return res.status(404).json({ message: 'Course not found' });

        const oldCourse = db.data.courses[courseIndex];
        const updates = { ...oldCourse };

        // Update files if provided
        if (files.cover) updates.coverUrl = await storage.save(files.cover[0]);
        if (files.audio) updates.audioUrl = await storage.save(files.audio[0]);
        if (files.json) {
            updates.jsonUrl = await storage.save(files.json[0]);
            // Update metadata from new JSON
            const jsonContent = JSON.parse(fs.readFileSync(files.json[0].path, 'utf-8'));
            updates.title = jsonContent.title || oldCourse.title;
            updates.description = jsonContent.description || oldCourse.description;
        }

        updates.updatedAt = new Date().toISOString();
        db.data.courses[courseIndex] = updates;
        await db.write();

        res.json({ success: true, course: updates });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
});

// Delete Course
app.delete('/api/admin/courses/:id', async (req, res) => {

    try {
        const { id } = req.params;
        await db.read();
        const initialLength = db.data.courses.length;
        db.data.courses = db.data.courses.filter(c => c.id !== id);

        if (db.data.courses.length === initialLength) {
            return res.status(404).json({ message: 'Course not found' });
        }

        await db.write();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
});

// Get Course Detail
app.get('/api/courses/:id', async (req, res) => {
    await db.read();
    const course = db.data.courses.find(c => c.id === req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
});

// Helper: Generate Audio via SoundOfText
async function generateSoundOfTextAudio(text) {
    try {
        // 1. Create Sound
        const createRes = await axios.post('https://api.soundoftext.com/sounds', {
            engine: 'Google',
            data: {
                text: text,
                voice: 'th-TH'
            }
        });

        if (!createRes.data.success) throw new Error('Failed to create sound');
        const soundId = createRes.data.id;

        // 2. Poll for status
        let attempts = 0;
        while (attempts < 10) {
            await new Promise(r => setTimeout(r, 1000));
            const statusRes = await axios.get(`https://api.soundoftext.com/sounds/${soundId}`);
            if (statusRes.data.status === 'Done') {
                return statusRes.data.location;
            } else if (statusRes.data.status === 'Error') {
                throw new Error('Sound generation error');
            }
            attempts++;
        }
        throw new Error('Timeout waiting for sound generation');
    } catch (err) {
        console.error(`Error generating audio for ${text}:`, err.message);
        return null;
    }
}

// Generate Audio for Course Words
app.post('/api/admin/courses/:id/generate-audio', async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();
        const course = db.data.courses.find(c => c.id === id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Read JSON
        let jsonContent;
        if (course.jsonUrl.startsWith('http')) {
            const response = await axios.get(course.jsonUrl);
            jsonContent = response.data;
        } else {
            // Local file
            // course.jsonUrl is like /uploads/file.json or just file.json
            const fileName = path.basename(course.jsonUrl);
            const localPath = path.join(UPLOADS_DIR, fileName);

            if (fs.existsSync(localPath)) {
                jsonContent = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
            } else {
                return res.status(404).json({ message: 'JSON file not found at ' + localPath });
            }
        }

        let updatedCount = 0;
        let totalWords = 0;
        let attemptedWords = 0;
        const logs = [];

        // Iterate sentences and words
        if (jsonContent.sentences) {
            for (const sentence of jsonContent.sentences) {
                if (sentence.words) {
                    for (const word of sentence.words) {
                        totalWords++;
                        if (!word.audioUrl && word.thai) {
                            attemptedWords++;
                            try {
                                const audioUrl = await generateSoundOfTextAudio(word.thai);
                                if (audioUrl) {
                                    // Download to temp file
                                    const response = await axios.get(audioUrl, { responseType: 'stream' });
                                    const tempFileName = `word-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
                                    const tempFilePath = path.join(UPLOADS_DIR, tempFileName);
                                    const writer = fs.createWriteStream(tempFilePath);
                                    response.data.pipe(writer);

                                    await new Promise((resolve, reject) => {
                                        writer.on('finish', resolve);
                                        writer.on('error', reject);
                                    });

                                    // Upload to OSS
                                    const savedUrl = await storage.save({
                                        filename: tempFileName,
                                        path: tempFilePath,
                                        originalname: tempFileName
                                    });

                                    word.audioUrl = savedUrl;
                                    updatedCount++;
                                } else {
                                    logs.push(`Failed to generate audio for: ${word.thai} (API returned null)`);
                                }
                            } catch (innerErr) {
                                logs.push(`Error processing ${word.thai}: ${innerErr.message}`);
                            }
                        }
                    }
                }
            }
        }

        if (updatedCount > 0) {
            // Save updated JSON
            const tempJsonName = `course-${id}-${Date.now()}.json`;
            const tempJsonPath = path.join(UPLOADS_DIR, tempJsonName);
            fs.writeFileSync(tempJsonPath, JSON.stringify(jsonContent, null, 2));

            const newJsonUrl = await storage.save({
                filename: tempJsonName,
                path: tempJsonPath,
                originalname: tempJsonName
            });

            // Update course record
            course.jsonUrl = newJsonUrl;
            course.updatedAt = new Date().toISOString();
            await db.write();
        }

        res.json({
            success: true,
            updatedCount,
            totalWords,
            attemptedWords,
            logs
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Generation failed', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
