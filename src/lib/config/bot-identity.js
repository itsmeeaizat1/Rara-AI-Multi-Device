// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
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
    name: "Nova AI Whatsapp Bot",
    version: "22.0.0",
    developer: "Aizat",
    menuImage: {
      mode: "asset",
      url: "",
      asset: "nova",
    },
  },

  mode: "self",

  command: {
    prefix: ".",
  },

  sticker: {
    packname: "Nova Ai Multi Device",
    author: "Aizat",
  },

  saluran: {
    // id numerik (120363xxx@newsletter) di-resolve OTOMATIS dari link invite
    // saat runtime (sock.newsletterMetadata) — lihat nova-menu-card.js.
    id: "@newsletter",
    name: "Nova AI Official",
    link: "https://whatsapp.com/channel/0029Vb97Nir9RZAWiwelWi29",
  },
};
