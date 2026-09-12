// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-skills-zones.js — mapping nama kota → IANA timezone (helper skill
// "waktu" nova-skills.js, request owner 12 Sep 2026 tool lengkap agent).
export const CITY_ZONES = {
  jakarta: "Asia/Jakarta", bandung: "Asia/Jakarta", surabaya: "Asia/Jakarta", medan: "Asia/Jakarta",
  denpasar: "Asia/Makassar", makassar: "Asia/Makassar", ujung: "Asia/Makassar", manado: "Asia/Makassar",
  ambon: "Asia/Jayapura", "jayapura": "Asia/Jayapura", sorong: "Asia/Jayapura",
  tokyo: "Asia/Tokyo", osaka: "Asia/Tokyo", seoul: "Asia/Seoul", busan: "Asia/Seoul",
  beijing: "Asia/Shanghai", shanghai: "Asia/Shanghai", hongkong: "Asia/Hong_Kong", "hong kong": "Asia/Hong_Kong",
  taipei: "Asia/Taipei", singapore: "Asia/Singapore", "singapura": "Asia/Singapore",
  bangkok: "Asia/Bangkok", "thailand": "Asia/Bangkok", "vietnam": "Asia/Ho_Chi_Minh", hanoi: "Asia/Ho_Chi_Minh",
  "kuala lumpur": "Asia/Kuala_Lumpur", malaysia: "Asia/Kuala_Lumpur", manila: "Asia/Manila", "filipina": "Asia/Manila",
  mumbai: "Asia/Kolkata", delhi: "Asia/Kolkata", india: "Asia/Kolkata", "india": "Asia/Kolkata",
  dubai: "Asia/Dubai", uae: "Asia/Dubai", doha: "Asia/Qatar", "qatar": "Asia/Qatar",
  riyadh: "Asia/Riyadh", istanbul: "Europe/Istanbul", "turki": "Europe/Istanbul", "turkey": "Europe/Istanbul",
  london: "Europe/London", "inggris": "Europe/London", "uk": "Europe/London", paris: "Europe/Paris",
  "prancis": "Europe/Paris", france: "Europe/Paris", berlin: "Europe/Berlin", "jerman": "Europe/Berlin",
  amsterdam: "Europe/Amsterdam", madrid: "Europe/Madrid", roma: "Europe/Rome", "italia": "Europe/Rome",
  moskow: "Europe/Moscow", russia: "Europe/Moscow", "rusia": "Europe/Moscow", kyiv: "Europe/Kyiv",
  "new york": "America/New_York", washington: "America/New_York", chicago: "America/Chicago",
  "los angeles": "America/Los_Angeles", "san francisco": "America/Los_Angeles", vegas: "America/Los_Angeles",
  texas: "America/Chicago", dallas: "America/Chicago", denver: "America/Denver", seattle: "America/Los_Angeles",
  toronto: "America/Toronto", canada: "America/Toronto", "kanada": "America/Toronto",
  "meksiko": "America/Mexico_City", mexico: "America/Mexico_City", "sao paulo": "America/Sao_Paulo",
  brazil: "America/Sao_Paulo", "brasil": "America/Sao_Paulo", "argentina": "America/Argentina/Buenos_Aires",
  buenos: "America/Argentina/Buenos_Aires", "santiago": "America/Santiago",
  sydney: "Australia/Sydney", melbourne: "Australia/Melbourne", brisbane: "Australia/Brisbane",
  perth: "Australia/Perth", auckland: "Pacific/Auckland", "new zealand": "Pacific/Auckland", zealand: "Pacific/Auckland",
  cairo: "Africa/Cairo", mesir: "Africa/Cairo", lagos: "Africa/Lagos", nigeria: "Africa/Lagos",
  nairobi: "Africa/Nairobi", kenya: "Africa/Nairobi", johannesburg: "Africa/Johannesburg", "afrika selatan": "Africa/Johannesburg",
  "cape town": "Africa/Johannesburg", casablanca: "Africa/Casablanca", maroko: "Africa/Casablanca",
}
export function findZoneByCity(city) {
  const q = String(city || "").trim().toLowerCase()
  return CITY_ZONES[q] || null
}
