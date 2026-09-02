// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// features.js — Toggle fitur, energi, registrasi, welcome/goodbye

export const features = {
  antiCall: true,
  blockIfCall: false,
  autoTyping: false,
  autoRead: true,
  logMessage: false,
  dailyLimitReset: true,
  smartTriggers: false,
  commandSuggestion: true,
  commandSuggestionCooldown: 5,
  commandSuggestionSmart: false,
};

export const registration = {
  enabled: false,
  rewards: {
    koin: 30000,
    energi: 300,
    exp: 300000,
  },
};

export const energi = {
  enabled: true,
  default: 300,
  premium: 1000,
  owner: -1,
};

export const welcome = { defaultEnabled: false };
export const goodbye = { defaultEnabled: false };
