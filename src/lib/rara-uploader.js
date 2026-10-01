// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 rara-uploader.js — engine upload multi-host TANPA API key
// 🔹 1 Okt 2026: Termai (host upload termai.cc) dilepas penuh — jadi
//    free-tier dengan limit kecil (upload masih 200 tapi cepat kena limit,
//    logic-bell 429 permanen). Zelapi TIDAK dipakai buat upload karena
//    endpoint /tools/upload-nya mati (diuji live semua varian multipart →
//    selalu "Missing 'file' field" walau field bener).
// 🔹 Host pengganti diuji LIVE dari IP datacenter 1 Okt 2026 (upload+download,
//    gambar+audio, semua 200): kappa.lol (permanen) → pone.rs (permanen) →
//    uguu.se (60 menit, terbukti di zelaichat/omnivton). catbox mati
//    ("Invalid uploader"), qu.ax balikin HTML landing (bikin API downstream
//    gagal) — dua-duanya sengaja gak dipakai di rantai utama.
// 🔹 Semua nama export LAMA dipertahankan (uploadImage, uploadToTelegraph,
//    uploadTo0x0, dst) biar 38+ importer gak perlu diubah.
// ═════════════════════════════════════════════
import axios from 'axios'
import FormData from 'form-data'

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36'

function guessContentType(filename = '') {
  const ext = String(filename).toLowerCase().split('.').pop()
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', bmp: 'image/bmp', mp3: 'audio/mpeg', ogg: 'audio/ogg',
    m4a: 'audio/mp4', wav: 'audio/wav', opus: 'audio/ogg', mp4: 'video/mp4',
    '3gp': 'video/3gpp', mov: 'video/quicktime', pdf: 'application/pdf',
    zip: 'application/zip', txt: 'text/plain', bin: 'application/octet-stream',
  }
  return map[ext] || 'application/octet-stream'
}

// ── kappa.lol (permanen, response: { link } ) ──────────────────────
async function uploadToKappaHost(buffer, filename) {
  const form = new FormData()
  form.append('file', buffer, { filename, contentType: guessContentType(filename) })
  const res = await axios.post('https://kappa.lol/api/upload', form, {
    headers: { ...form.getHeaders(), 'User-Agent': UA },
    timeout: 60000,
    validateStatus: () => true,
  })
  const url = res.data?.link
  if (res.status < 200 || res.status >= 300 || !url) {
    throw new Error(`Kappa gagal (HTTP ${res.status})`)
  }
  return url
}

// ── pone.rs (permanen, response: { files: [{ url }] } ) ─────────────
async function uploadToPoneHost(buffer, filename) {
  const form = new FormData()
  form.append('files[]', buffer, { filename, contentType: guessContentType(filename) })
  const res = await axios.post('https://pone.rs/upload.php', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': UA,
      'Origin': 'https://pone.rs',
      'Referer': 'https://pone.rs/',
    },
    timeout: 60000,
    validateStatus: () => true,
  })
  const url = String(res.data?.files?.[0]?.url || '').replaceAll('\\/', '/')
  if (res.status < 200 || res.status >= 300 || !url) {
    throw new Error(`Pone gagal (HTTP ${res.status})`)
  }
  return url
}

// ── uguu.se (60 menit, response: { files: [{ url }] } ) ─────────────
async function uploadToUguuHost(buffer, filename) {
  const form = new FormData()
  form.append('files[]', buffer, { filename, contentType: guessContentType(filename) })
  const res = await axios.post('https://uguu.se/upload', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': UA,
      'Origin': 'https://uguu.se',
      'Referer': 'https://uguu.se/',
    },
    timeout: 60000,
    validateStatus: () => true,
  })
  const url = String(res.data?.files?.[0]?.url || '').replaceAll('\\/', '/')
  if (res.status < 200 || res.status >= 300 || !url) {
    throw new Error(`Uguu gagal (HTTP ${res.status})`)
  }
  return url
}

const CHAIN = [
  { name: 'Kappa', fn: uploadToKappaHost },
  { name: 'Pone', fn: uploadToPoneHost },
  { name: 'Uguu', fn: uploadToUguuHost },
]

// seam test — inject HTTP fake biar e2e gak nyentuh internet
let _http = null
let _chainOverride = null
export function _setUploaderHttpForTest(fn) { _http = fn } // override total
export function _setUploaderHostsForTest(hosts) { _chainOverride = hosts } // override rantai host
export function _resetUploaderHttpForTest() { _http = null; _chainOverride = null }

/**
 * Upload buffer → URL publik. Rantai fallback Kappa → Pone → Uguu.
 * @param {Buffer} buffer file yang mau diupload
 * @param {string} [filename='image.jpg'] nama file (nentuin content-type)
 * @returns {Promise<string>} URL publik file
 */
export async function uploadFile(buffer, filename = 'image.jpg') {
  if (!Buffer.isBuffer(buffer)) throw new Error('buffer harus Buffer')
  if (_http) return _http(buffer, filename)

  const errors = []
  for (const host of (_chainOverride || CHAIN)) {
    try {
      return await host.fn(buffer, filename)
    } catch (e) {
      errors.push(`${host.name}: ${e.message}`)
    }
  }
  throw new Error(`Semua host upload gagal (${errors.join(' | ')})`)
}

// ── Kompatibilitas nama export lama (termai dulu) — 38+ importer gak berubah ──
export const uploadImage = uploadFile
export const uploadToTelegraph = uploadFile
export const uploadTo0x0 = uploadFile
export const uploadToCatbox = uploadFile
export const uploadToTmpfiles = uploadFile
export const uploadToUguu = uploadFile
export const uploadToTermai = uploadFile

// ─────────────────────────────────────────────────────────────────────
// updateAssetUrl — simpan buffer asset ke file lokal + config (gak pake host)
// ─────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import config from '../../config.js';

import { updateAssetAndSave } from './rara-asset-manager.js';

export async function updateAssetUrl(assetKey, buffer, filename = 'image.jpg') {
  let localPath = config.assets?.[assetKey];

  if (!localPath || localPath.startsWith('http')) {
    let folder = 'image';
    if (filename.endsWith('.mp4')) folder = 'video';
    else if (filename.endsWith('.mp3')) folder = 'audio';

    localPath = `./assets/${folder}/${filename}`;

    if (!config.assets) config.assets = {};
    config.assets[assetKey] = localPath;

    const configPath = path.join(process.cwd(), 'config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');

    const regex = new RegExp(`("${assetKey}"\\s*:\\s*)"([^"]+)"`);
    if (regex.test(configContent)) {
      configContent = configContent.replace(regex, `$1"${localPath}"`);
    } else {
      const assetsBlockRegex = /(assets\s*:\s*\{)([^}]*)(\})/;
      if (assetsBlockRegex.test(configContent)) {
        configContent = configContent.replace(assetsBlockRegex, (match, p1, p2, p3) => {
          let inner = p2.trim();
          if (inner.endsWith(',')) inner = inner.slice(0, -1);
          if (inner.length > 0) return `${p1}\n    ${inner},\n    "${assetKey}": "${localPath}"\n  ${p3}`;
          return `${p1}\n    "${assetKey}": "${localPath}"\n  ${p3}`;
        });
      }
    }
    fs.writeFileSync(configPath, configContent, 'utf8');
  }

  const fullPath = path.resolve(process.cwd(), localPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  updateAssetAndSave(assetKey, buffer, localPath);

  return localPath;
}
