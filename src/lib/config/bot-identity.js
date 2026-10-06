// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// bot-identity.js — Identitas bot, owner, session, mode, sticker, saluran

export const botIdentity = {
  info: {
    // ⚠️ Website masih URL ilegal (underscore di hostname) — WA gak ngerender
    // link preview darinya. Ganti ke domain asli kalau sudah ada.
    website: "https://itsmee_aizat.oneapp.dev/",
    // Link grup owner (2026-09-05) — query param ?s=... dibuang, cukup invite inti
    grupwa: "https://chat.whatsapp.com/DrPxF0Ipx530TzBMWGqdev",
  },

  owner: {
    name: "Aizat",
    number: ["628174887770"],
  },

  session: {
    pairingNumber: "628xxxxxxxx",
    usePairingCode: true,
  },

  bot: {
    name: "Rara AI - Multi Device",
    version: "24.0.0",
    developer: "Aizat",
    menuImage: {
      mode: "asset",
      url: "",
      asset: "rara",
    },
  },

  mode: "self",

  command: {
    prefix: ".",
  },

  sticker: {
    packname: "Rara Ai Multi Device",
    author: "Aizat",
  },

  saluran: {
    // FIX 6 Okt 2026: id placeholder "@newsletter" bikin resolve selalu jatuh ke
    // fallback lama (120363404849776664) yang udah MATI — newsletterMetadata
    // ('jid'|'invite') di baileys2 fork ini balikin {} → notif "terkirim" tapi
    // nyasar. Id channel resmi bot = hasil newsletterFetchAllSubscribe().
    id: "120363411845816839@newsletter",
    name: "Rara AI Official",
    link: "https://whatsapp.com/channel/0029Vb97Nir9RZAWiwelWi29",
  },
};
