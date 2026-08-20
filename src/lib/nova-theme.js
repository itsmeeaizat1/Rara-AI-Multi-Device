// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const THEME = {
  botName: "Nova AI",
  ownerName: "Owner",
  prefix: ".",
  boxWidth: 22,
  emojis: {
    header: "🪸",
    menu: "📋",
    info: "ℹ️",
    download: "📥",
    search: "🔍",
    ai: "🤖",
    user: "👤",
    bot: "🤖",
    music: "🎵",
    video: "🎬",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    tip: "💡",
    loading: "🕕",
    play: "▶️",
    heart: "💙",
    star: "⭐",
  },
  labels: {
    title: "Title",
    artist: "Artist",
    duration: "Duration",
    size: "Size",
    quality: "Quality",
    format: "Format",
    author: "Author",
    channel: "Channel",
    views: "Views",
    likes: "Likes",
    description: "Description",
    status: "Status",
    version: "Version",
    role: "Role",
    id: "ID",
    name: "Name",
  },
};

function getBotName() {
  return THEME.botName;
}

function getEmoji(key) {
  return THEME.emojis[key] || "";
}

function getLabel(key) {
  return THEME.labels[key] || key;
}

function updateTheme(partial) {
  Object.assign(THEME, partial);
}

export { THEME, getBotName, getEmoji, getLabel, updateTheme };
