// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bot-identity.js — Identitas bot, owner, session, mode, sticker, saluran

export const botIdentity = {
  info: {
    website: "https://itsmee_aizat.oneapp.dev/",
    grupwa: "https://chat.whatsapp.com/xxxx",
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
    version: "21.4.0",
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
    id: "@newsletter",
    name: "Nova AI Official",
    link: "https://whatsapp.com/channel/",
  },
};
