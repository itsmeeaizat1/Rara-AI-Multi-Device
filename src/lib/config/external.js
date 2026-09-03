// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// external.js — Config layanan eksternal (Pterodactyl, DigitalOcean, Alight Motion, Vercel)
// API keys di-import dari apikey.js

import { apiKeys } from "./apikey.js";

export const vercel = {
  token: apiKeys.vercelToken,
};

export const pterodactyl = (() => {
  // 100 slot config panel Pterodactyl (server1 - server100)
  // server1 default dari apikey.js; sisanya diisi via .setpanel (disimpan ke src/data/ptero-panels.json)
  const slots = {
    server1: {
      domain: apiKeys.pterodactyl.server1.domain,
      apikey: apiKeys.pterodactyl.server1.apikey,
      capikey: apiKeys.pterodactyl.server1.capikey,
      egg: "15",
      nestid: "5",
      location: "1",
    },
  };
  for (let i = 2; i <= 100; i++) {
    slots[`server${i}`] = { domain: "", apikey: "", capikey: "", egg: "15", nestid: "5", location: "1" };
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
