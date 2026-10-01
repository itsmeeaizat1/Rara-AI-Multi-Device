// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-apify.js — Helper Apify bersama (request owner 10 Sep 2026: token Apify
// buat sumber data yang gak ada endpoint gratisnya — Liga 2 bola, LinkedIn jobs).
//   • getApifyToken()  — env APIFY_TOKEN → apikeys.json apifyToken
//   • apifyRunSync()   — POST run-sync-get-dataset-items (1 request, hasil array)
//
// BIAYA (PAY_PER_EVENT / PRICE_PER_DATASET_ITEM, free tier Apify $5/bln):
// pemanggil WAJIB jaga throttle + window — liat pola credit guard di
// rara-auto-bola-notifier.js & rara-linkedin-notify.js.

import fs from "fs";
import path from "path";
import axios from "axios";

let tokenCache;
export function getApifyToken() {
  if (process.env.APIFY_TOKEN) return process.env.APIFY_TOKEN;
  if (tokenCache !== undefined) return tokenCache || null;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "apikeys.json"), "utf8"));
    tokenCache = raw.apifyToken || raw?.apify?.token || raw?.flashscore?.apifyToken || null;
  } catch {
    tokenCache = null;
  }
  return tokenCache;
}

/**
 * Run actor Apify synchronous + ambil dataset items — satu call, hasil array.
 * @param {string} actorId  format "username~actor-name"
 * @param {object} input    input actor sesuai schema
 * @param {object} opts     { maxItems } — batasi biaya (PRICE_PER_DATASET_ITEM)
 */
export async function apifyRunSync(actorId, input, { maxItems = 50 } = {}) {
  const token = getApifyToken();
  if (!token) throw new Error("token Apify belum diset (env APIFY_TOKEN / apikeys.json apifyToken)");
  const res = await axios.post(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=120`,
    input,
    { timeout: 130000 },
  );
  const items = res.data || [];
  return typeof maxItems === "number" && items.length > maxItems ? items.slice(0, maxItems) : items;
}
