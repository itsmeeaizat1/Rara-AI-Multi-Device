// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// external.js — Config layanan eksternal (Pterodactyl, DigitalOcean, Alight Motion, Vercel)
// API keys di-import dari apikey.js

import { apiKeys } from "./apikey.js";
import { PANELS } from "../panel/config.js";

export const vercel = {
  token: apiKeys.vercelToken,
};

export const pterodactyl = (() => {
  // 100 slot config panel Pterodactyl (server1 - server100)
  // Sumber default: src/lib/panel/config.js (PANELS — edit domain di situ)
  // Key kosong di file → fallback ke misc.json (apiKeys.pterodactyl, di-set via .setkey)
  // Override .setpanel (ptero-panels.json) di-merge config.js saat startup
  const slots = {};
  for (let i = 1; i <= 100; i++) {
    const file = PANELS[i] || {};
    const legacy = apiKeys.pterodactyl?.[`server${i}`] || {};
    slots[`server${i}`] = {
      domain: file.domain || legacy.domain || "",
      apikey: file.apikey || legacy.apikey || "",
      capikey: file.capikey || legacy.capikey || "",
      egg: file.egg || "15",
      nestid: file.nestid || "5",
      location: file.location || "1",
    };
  }
  return slots;
})();

export const digitalocean = {
  token: apiKeys.digitalOceanToken,
  region: "sgp1",
  sellers: [],
  ownerPanels: [],
};

// Alight Motion Premium API (api.znn.my.id)
export const alightmotion = {
  apiBase: "https://api.znn.my.id",
  token: apiKeys.alightMotionToken,
  apiVersion: "v1",
  maxBulk: 100,
  bulkZipThreshold: 10,
};
