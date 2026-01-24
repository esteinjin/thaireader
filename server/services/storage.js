import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OSS from 'ali-oss';
import dotenv from 'dotenv';

// Load env from parent directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

const ossConfig = {
  region: process.env.VITE_OSS_REGION,
  accessKeyId: process.env.VITE_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.VITE_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.VITE_OSS_BUCKET,
};

class LocalStorage {
  async save(file) {
    // In local mode, Multer has already saved the file to the uploads directory.
    // We just return the relative URL.
    // Assuming the server serves 'uploads' directory at '/uploads'
    return `/uploads/${file.filename}`;
  }
}

class AliOssStorage {
  constructor() {
    if (!ossConfig.accessKeyId) {
      console.warn("OSS Config missing, falling back to local or expecting errors.");
    }
    this.client = new OSS(ossConfig);
  }

  async save(file) {
    try {
      // Upload to OSS
      // file.path is the local path from Multer
      const result = await this.client.put(file.filename, file.path);

      // Delete local file after upload
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }

      // Force HTTPS
      let url = result.url;
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
      return url;
    } catch (error) {
      console.error("OSS Upload Error:", error);
      throw error;
    }
  }
}

console.log(`[Storage] Initialized in ${STORAGE_MODE} mode.`);
export const storage = STORAGE_MODE === 'oss' ? new AliOssStorage() : new LocalStorage();
