import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

function parseLRC(lrcString: string) {
  const lines: { time: number; text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const rawLine of lrcString.split("\n")) {
    const match = rawLine.match(regex);
    if (match) {
      const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3].padEnd(3, "0")) / 1000;
      lines.push({ time: Number(time.toFixed(2)), text: match[4].trim() });
    }
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { title, artist, rawQuery } = req.body || {};
  const query = rawQuery || `${title || ""} ${artist || ""}`.trim();

  if (!query) {
    return res.status(400).json({ error: "Judul lagu atau kata kunci diperlukan." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = `[00:00.00] ${title || query} - ${artist || "Aizat Karaoke"}\n[00:03.00] Musik Pengantar\n[00:08.00] Saat malam datang menyapa lirik indah\n[00:13.00] Suara vokal bergema jernih\n[00:18.00] Bernyanyi bersama Aizat Karaoke`;
    return res.json({ lrcText: fallback, lines: parseLRC(fallback), source: "Offline" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Berikan lirik lagu lengkap dengan timestamp LRC format [mm:ss.xx] untuk lagu: "${query}". Kembalikan HANYA teks LRC tanpa penjelasan.`;
    const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    const lrcText = response.text || "";
    return res.json({ lrcText, lines: parseLRC(lrcText), source: "Gemini AI" });
  } catch (error: any) {
    return res.status(500).json({ error: "Gagal mengambil lirik.", details: error.message });
  }
}
