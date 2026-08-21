// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Root bot directory (2 level up dari src/lib/)
const BOT_ROOT = path.resolve(__dirname, '..', '..');

// Memory cache for all local assets
const assetCache = {};

/**
 * Preload all assets into memory at startup.
 * @param {Object} configAssets - botConfig.assets or config.assets object
 */
export function preloadAssets(configAssets) {
  if (!configAssets) return;
  for (const [key, filepath] of Object.entries(configAssets)) {
    try {
      if (typeof filepath === 'string' && !filepath.startsWith('http')) {
        // Coba dari process.cwd() dulu, fallback ke BOT_ROOT
        let fullPath = path.resolve(process.cwd(), filepath);
        if (!fs.existsSync(fullPath)) {
          fullPath = path.resolve(BOT_ROOT, filepath);
        }
        if (fs.existsSync(fullPath)) {
          assetCache[key] = fs.readFileSync(fullPath);
          console.log(`[AssetManager] 📂 Successfully cached: ${key} (${assetCache[key].length} bytes)`);
        } else {
          console.error(`[AssetManager] ❌ File not found: ${filepath} (tried cwd + BOT_ROOT)`);
        }
      }
    } catch (e) {
      console.error(`[AssetManager] ❌ Failed to load ${key}:`, e.message);
    }
  }
}

import config from '../../config.js';

/**
 * Get the cached asset buffer by key (e.g. 'nova', 'nova2').
 * If not in cache but available in config, loads it synchronously.
 * 
 * @param {string} key - The asset key defined in config.assets
 * @param {Object} [configAssets] - Optional config.assets reference for fallback
 * @returns {Buffer | null} The asset as a Buffer, or null if missing.
 */
export function getAssetBuffer(key, configAssets = null) {
  if (assetCache[key]) {
    return assetCache[key];
  }
  
  const assets = configAssets || config?.assets;
  if (assets && assets[key] && !assets[key].startsWith('http')) {
    try {
      // Coba dari process.cwd() dulu, fallback ke BOT_ROOT
      let fullPath = path.resolve(process.cwd(), assets[key]);
      if (!fs.existsSync(fullPath)) {
        fullPath = path.resolve(BOT_ROOT, assets[key]);
      }
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        assetCache[key] = buf; 
        console.log(`[AssetManager] 📂 Loaded on-demand: ${key} (${buf.length} bytes)`);
        return buf;
      } else {
        console.error(`[AssetManager] ❌ File not found for ${key}: ${assets[key]}`);
      }
    } catch (e) {
      console.error(`[AssetManager] Failed to read ${key} from disk:`, e.message);
    }
  }
  
  return null;
}

/**
 * Update an asset buffer in memory and save it to disk (useful for owner commands that change assets).
 * 
 * @param {string} key - Asset key
 * @param {Buffer} buffer - New asset buffer
 * @param {string} filepath - The path where it should be saved
 */
export function updateAssetAndSave(key, buffer, filepath) {
  assetCache[key] = buffer;
  if (filepath && !filepath.startsWith('http')) {
    try {
      const fullPath = path.resolve(process.cwd(), filepath);
      fs.writeFileSync(fullPath, buffer);
    } catch (e) {
      console.error(`[AssetManager] Failed to write updated asset ${key} to disk:`, e.message);
    }
  }
}

// ── Menu Image: 2 Mode (asset / url) ──
import sharp from 'sharp';

let urlMenuCache = null; // cache buffer hasil fetch URL
let urlMenuCacheUrl = null; // URL yang sudah di-cache

/**
 * Get the menu preview image buffer (supports asset mode & url mode).
 * Mode dikontrol oleh config.bot.menuImage:
 *   - mode "asset": baca dari config.assets[asset] (lokal file)
 *   - mode "url":   fetch dari URL, cache di memory
 * 
 * @param {string} [fallbackKey] - Key asset fallback jika config gak ada (default: "nova")
 * @returns {Promise<Buffer|null>} Image buffer
 */
export function syncMenuImageFromDb(db) {
  try {
    if (!db || !config?.bot?.menuImage) return;
    const dbMode = db.setting('menuImageMode');
    const dbUrl = db.setting('menuImageUrl');
    const dbAsset = db.setting('menuImageAsset');
    if (dbMode) config.bot.menuImage.mode = dbMode;
    if (dbUrl !== undefined) config.bot.menuImage.url = dbUrl || '';
    if (dbAsset) config.bot.menuImage.asset = dbAsset;
    // Reset URL cache jika mode berubah
    urlMenuCache = null;
    urlMenuCacheUrl = null;
  } catch (e) {
    console.error('[AssetManager] Failed to sync menu image from db:', e.message);
  }
}

export async function getMenuImage(fallbackKey = 'nova') {
  const cfg = config?.bot?.menuImage || {};
  const mode = cfg.mode || 'asset';

  if (mode === 'url' && cfg.url) {
    // Cache hit
    if (urlMenuCache && urlMenuCacheUrl === cfg.url) {
      return urlMenuCache;
    }
    try {
      const axios = (await import('axios')).default;
      const res = await axios.get(cfg.url, { responseType: 'arraybuffer', timeout: 10000 });
      urlMenuCache = Buffer.from(res.data);
      urlMenuCacheUrl = cfg.url;
      console.log('[AssetManager] 🌐 Menu image loaded from URL:', cfg.url);
      return urlMenuCache;
    } catch (e) {
      console.error('[AssetManager] ❌ Failed to fetch menu URL, fallback to asset:', e.message);
      // Fallback ke asset mode
      return getAssetBuffer(cfg.asset || fallbackKey);
    }
  }

  // Asset mode (default)
  return getAssetBuffer(cfg.asset || fallbackKey);
}

/**
 * Get the menu preview as a 640x360 thumbnail (landscape, JPEG).
 * Uses sharp to resize. Returns Buffer or null.
 * 
 * @param {string} [fallbackKey] - Asset key fallback
 * @returns {Promise<Buffer|null>} Thumbnail buffer (640x360 JPEG)
 */
export async function getMenuThumbnail(fallbackKey = 'nova') {
  try {
    const img = await getMenuImage(fallbackKey);
    if (!img) return null;
    return await sharp(img).resize(640, 360, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  } catch (e) {
    console.error('[AssetManager] ❌ Failed to generate menu thumbnail:', e.message);
    return null;
  }
}

/**
 * Get a fixed, dedicated thumbnail (e.g. externalAdReply / jpegThumbnail preview card).
 * Unlike getMenuThumbnail(), this ALWAYS reads directly from the given asset key —
 * it ignores config.bot.menuImage overrides so the small preview thumbnail stays
 * independent from the main big header image.
 *
 * @param {string} [assetKey] - Asset key to load directly (default: 'nova-thumbnail')
 * @returns {Promise<Buffer|null>} Thumbnail buffer (640x360 JPEG)
 */
export async function getStaticThumbnail(assetKey = 'nova-thumbnail') {
  try {
    const img = getAssetBuffer(assetKey);
    if (!img) {
      console.error('[AssetManager] ❌ getStaticThumbnail: asset not found:', assetKey);
      return null;
    }
    // Sharp resize untuk thumbnail WhatsApp (640x360)
    return await sharp(img).resize(640, 360, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  } catch (e) {
    console.error('[AssetManager] ❌ Sharp failed for thumbnail, returning raw buffer:', e.message);
    // Fallback: return raw buffer tanpa resize (lebih baik gambar gak resize daripada kosong)
    const raw = getAssetBuffer(assetKey);
    return raw || null;
  }
}

/**
 * Set menu image mode (owner command helper).
 * @param {string} mode - "asset" or "url"
 * @param {string} [url] - URL if mode is "url"
 * @param {string} [asset] - Asset key if mode is "asset"
 */
export function setMenuImageMode(mode, url, asset) {
  if (!config.bot) config.bot = {};
  if (!config.bot.menuImage) config.bot.menuImage = {};
  if (mode) config.bot.menuImage.mode = mode;
  if (url !== undefined) config.bot.menuImage.url = url;
  if (asset !== undefined) config.bot.menuImage.asset = asset;
  // Reset URL cache jika ganti mode/URL
  if (mode === 'asset' || url !== undefined) {
    urlMenuCache = null;
    urlMenuCacheUrl = null;
  }
}
