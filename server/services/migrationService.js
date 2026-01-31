import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { db } from './db.js';
import { storage } from './storage.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../uploads');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let isMigrating = false;
let migrationLog = [];

function replaceDomain(url, targetDomain) {
    if (!url || !url.startsWith('http')) return url;
    try {
        const urlObj = new URL(url);
        // Only replace if it contains aliyuncs.com (standard OSS)
        // Or if we want to force migrate everything to target
        if (urlObj.hostname.includes('aliyuncs.com')) {
            urlObj.hostname = targetDomain;
            return urlObj.toString();
        }
    } catch (e) {
        return url;
    }
    return url;
}

export const migrationService = {
    getStatus: () => ({ isMigrating, logs: migrationLog }),

    runMigration: async () => {
        if (isMigrating) return;

        const targetDomain = process.env.OSS_CUSTOM_DOMAIN || process.env.VITE_OSS_CUSTOM_DOMAIN;
        if (!targetDomain) {
            migrationLog.push("Error: OSS_CUSTOM_DOMAIN is not set in .env");
            return;
        }

        isMigrating = true;
        migrationLog = [`Starting migration to: ${targetDomain}`];
        let changedCount = 0;

        try {
            await db.read();
            const courses = db.data.courses;

            for (const course of courses) {
                let courseUpdated = false;

                // 1. Update Course Metadata URLs
                const oldCover = course.coverUrl;
                const oldAudio = course.audioUrl;
                const oldJson = course.jsonUrl;

                const newCover = replaceDomain(oldCover, targetDomain);
                const newAudio = replaceDomain(oldAudio, targetDomain);
                const newJson = replaceDomain(oldJson, targetDomain);

                if (newCover !== oldCover) { course.coverUrl = newCover; courseUpdated = true; }
                if (newAudio !== oldAudio) { course.audioUrl = newAudio; courseUpdated = true; }
                if (newJson !== oldJson) { course.jsonUrl = newJson; courseUpdated = true; }

                // 2. Deep Clean JSON Content
                if (course.jsonUrl && course.jsonUrl.startsWith('http')) {
                    try {
                        // Download JSON content (using current URL likely still works if redirected, 
                        // but safer to use original valid URL if we just changed it in memory)
                        // Actually, axios fetch should use the URL that works. 
                        // If we just changed it to custom domain but DNS hasn't propagated or HTTPS cert issue, it might fail.
                        // So let's try to fetch from the URL we have (which might be the new one if we just updated it).

                        // Wait, if we just updated course.jsonUrl to the custom domain, 
                        // and we try to fetch it, it proves the custom domain works.

                        const resp = await axios.get(course.jsonUrl);
                        let jsonContent = resp.data;
                        let jsonModified = false;

                        // Traverse Words
                        if (jsonContent.sentences) {
                            jsonContent.sentences.forEach(s => {
                                if (s.words) {
                                    s.words.forEach(w => {
                                        if (w.audioUrl) {
                                            const newWordAudio = replaceDomain(w.audioUrl, targetDomain);
                                            if (newWordAudio !== w.audioUrl) {
                                                w.audioUrl = newWordAudio;
                                                jsonModified = true;
                                            }
                                        }
                                    });
                                }
                            });
                        }

                        if (jsonModified) {
                            migrationLog.push(`Updating JSON content for: ${course.title}`);

                            // Save temp file
                            const tempFileName = `migrated-${path.basename(course.jsonUrl)}`;
                            // Sanitize filename in case it has query params
                            const cleanFileName = tempFileName.split('?')[0];
                            const tempFilePath = path.join(UPLOADS_DIR, cleanFileName);

                            fs.writeFileSync(tempFilePath, JSON.stringify(jsonContent, null, 2));

                            // Upload overwrite
                            // Note: storage.save will return the NEW url (with custom domain due to our previous change)
                            // We need to make sure we upload it with a filename that makes sense.
                            // Actually, we can just upload it as a new file to be safe, or overwrite if we knew the key.
                            // Storage service generates `filename-timestamp`. Let's just create a new file to avoid cache issues.

                            const savedUrl = await storage.save({
                                filename: cleanFileName,
                                path: tempFilePath,
                                originalname: cleanFileName
                            });

                            course.jsonUrl = savedUrl; // Update DB with the new JSON file location
                            courseUpdated = true;
                        }

                    } catch (err) {
                        migrationLog.push(`Failed to process JSON for ${course.title}: ${err.message}`);
                    }
                }

                if (courseUpdated) {
                    migrationLog.push(`Updated course: ${course.title}`);
                    course.updatedAt = new Date().toISOString();
                    changedCount++;
                    // Save DB incrementally
                    await db.write();
                }
            }

            migrationLog.push(`Migration finished. ${changedCount} courses updated.`);
        } catch (e) {
            console.error(e);
            migrationLog.push(`Fatal Error: ${e.message}`);
        } finally {
            isMigrating = false;
        }
    }
};
