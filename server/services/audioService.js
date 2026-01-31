import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cron from 'node-cron';
import { db } from './db.js';
import { storage } from './storage.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// State
let isRunning = false;
let currentProcessingCourse = null;
let processedCount = 0;
let lastLog = "";

// Helper: Download JSON if remote
async function getJsonContent(course) {
    if (course.jsonUrl.startsWith('http')) {
        try {
            const fileName = path.basename(course.jsonUrl);
            const localPath = path.join(UPLOADS_DIR, fileName);

            if (fs.existsSync(localPath)) {
                return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
            }

            const response = await axios.get(course.jsonUrl);
            const content = response.data;
            // Cache locally
            fs.writeFileSync(localPath, JSON.stringify(content, null, 2));
            return content;
        } catch (e) {
            console.error(`Failed to fetch JSON for ${course.title}`, e);
            return null;
        }
    } else {
        const fileName = path.basename(course.jsonUrl);
        const localPath = path.join(UPLOADS_DIR, fileName);
        if (fs.existsSync(localPath)) {
            return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
        }
    }
    return null;
}

// Generate SoundOfText (Reused logic)
async function generateGenericAudio(text) {
    try {
        const createRes = await axios.post('https://api.soundoftext.com/sounds', {
            engine: 'Google',
            data: { text: text, voice: 'th-TH' }
        });

        if (!createRes.data.success) throw new Error('Failed to create sound');
        const soundId = createRes.data.id;

        let attempts = 0;
        while (attempts < 10) {
            await new Promise(r => setTimeout(r, 1000));
            const statusRes = await axios.get(`https://api.soundoftext.com/sounds/${soundId}`);
            if (statusRes.data.status === 'Done') return statusRes.data.location;
            if (statusRes.data.status === 'Error') throw new Error('Sound generation error');
            attempts++;
        }
        return null;
    } catch (err) {
        console.error(`SOT Error [${text}]: ${err.message}`);
        return null;
    }
}

// Main Process Function
async function processMissingAudio() {
    if (isRunning) return;
    isRunning = true;
    processedCount = 0;
    console.log("Starting Audio Auto-Generation Task...");

    try {
        await db.read();
        const courses = db.data.courses;

        for (const course of courses) {
            currentProcessingCourse = course.title;
            const jsonContent = await getJsonContent(course);
            if (!jsonContent || !jsonContent.sentences) continue;

            let fileUpdated = false;
            let courseAttempts = 0;

            for (const sentence of jsonContent.sentences) {
                if (!sentence.words) continue;
                for (const word of sentence.words) {
                    // Stop if we processed too many in one run to avoid ban? 
                    // Let's just do a rate limit delay instead.

                    if (word.thai && !word.audioUrl) {
                        lastLog = `Generating: ${course.title} - ${word.thai}`;
                        console.log(lastLog);

                        // Rate Limit Delay (3 seconds)
                        await new Promise(r => setTimeout(r, 3000));

                        const audioUrl = await generateGenericAudio(word.thai);
                        if (audioUrl) {
                            try {
                                // Download & Upload to Storage
                                const response = await axios.get(audioUrl, { responseType: 'stream' });
                                const tempFileName = `word-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
                                const tempFilePath = path.join(UPLOADS_DIR, tempFileName);
                                const writer = fs.createWriteStream(tempFilePath);
                                response.data.pipe(writer);

                                await new Promise((resolve, reject) => {
                                    writer.on('finish', resolve);
                                    writer.on('error', reject);
                                });

                                const savedUrl = await storage.save({
                                    filename: tempFileName,
                                    path: tempFilePath,
                                    originalname: tempFileName
                                });

                                word.audioUrl = savedUrl;
                                fileUpdated = true;
                                processedCount++;
                            } catch (e) {
                                console.error("Failed to save audio", e);
                            }
                        }
                    }
                }
            }

            if (fileUpdated) {
                // Save updated JSON
                const tempJsonName = `course-${course.id}-${Date.now()}.json`;
                const tempJsonPath = path.join(UPLOADS_DIR, tempJsonName);
                fs.writeFileSync(tempJsonPath, JSON.stringify(jsonContent, null, 2));

                const newJsonUrl = await storage.save({
                    filename: tempJsonName,
                    path: tempJsonPath,
                    originalname: tempJsonName
                });

                // Update DB
                await db.read(); // Refresh
                const freshCourse = db.data.courses.find(c => c.id === course.id);
                if (freshCourse) {
                    freshCourse.jsonUrl = newJsonUrl;
                    freshCourse.updatedAt = new Date().toISOString();
                    await db.write();
                    console.log(`Saved updates for course: ${course.title}`);
                }
            }
        }
    } catch (err) {
        console.error("Audio Task Error:", err);
    } finally {
        isRunning = false;
        currentProcessingCourse = null;
        lastLog = "Task Idle";
        console.log("Audio Auto-Generation Task Finished.");
    }
}

// Stats Helper (Shared)
export async function getCourseStats(course) {
    let totalWords = 0;
    let hasAudioCount = 0;

    try {
        const jsonContent = await getJsonContent(course);
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
        // ignore
    }

    return {
        totalWords,
        hasAudioCount,
        isComplete: totalWords > 0 && totalWords === hasAudioCount
    };
}

// Initialize Cron
export function initAudioService() {
    // Run every day at 3:00 AM
    cron.schedule('0 3 * * *', () => {
        processMissingAudio();
    });
}

// API Methods
export const audioService = {
    getStatus: () => ({ isRunning, currentProcessingCourse, processedCount, lastLog }),
    trigger: () => {
        if (!isRunning) processMissingAudio();
        return isRunning;
    },
    getStats: getCourseStats
};
