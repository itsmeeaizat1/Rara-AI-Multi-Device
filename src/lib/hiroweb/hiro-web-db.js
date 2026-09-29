// hiro-web-db.js — shim database gaya HIROBOT buat web dashboard (db.data / loadDatabase)
// File JSON sendiri di src/database/panel/hiroweb-db.json — gak nyampur db Nova. Auto-save 10 dtk.
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "src", "database", "panel", "hiroweb-db.json");
let _data = null;

export function read() {
  try {
    if (!fs.existsSync(FILE)) _data = {};
    else _data = JSON.parse(fs.readFileSync(FILE, "utf8") || "{}");
  } catch { _data = {}; }
  return _data;
}
export function write() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(_data ?? {}, null, 2));
  } catch (e) { console.error("[hiroweb-db]:", e.message); }
}
export const loadDatabase = read;
export const saveSync = write;
if (!_data) read();
setInterval(() => { if (_data) write(); }, 10000).unref?.();

const db = { get data() { if (!_data) read(); return _data; }, set data(v) { _data = v; write(); }, read, write, saveSync: write };
export default db;
