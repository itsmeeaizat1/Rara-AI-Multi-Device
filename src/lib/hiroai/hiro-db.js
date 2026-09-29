// hiro-db.js — shim database gaya HIROBOT (db.data / db.read / db.write)
// File JSON sendiri di src/database/ai/hiroai-db.json — gak nyampur db Nova.
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'src', 'database', 'ai', 'hiroai-db.json');
let _data = null;

export function read() {
  try {
    if (!fs.existsSync(FILE)) _data = {};
    else _data = JSON.parse(fs.readFileSync(FILE, 'utf8') || '{}');
  } catch { _data = {}; }
  return _data;
}

export function write() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(_data ?? {}, null, 2));
  } catch (e) { console.error('[hiro-db]:', e.message); }
}

if (!_data) read();

const db = { get data() { if (!_data) read(); return _data; }, read, write };
export default db;
