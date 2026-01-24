import fs from 'fs';
import path from 'path';
import { JSONFilePreset } from 'lowdb/node';

const DATA_DIR = path.resolve('data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = { courses: [] };
// Initialize DB
const db = await JSONFilePreset(path.join(DATA_DIR, 'db.json'), defaultData);

export { db };
