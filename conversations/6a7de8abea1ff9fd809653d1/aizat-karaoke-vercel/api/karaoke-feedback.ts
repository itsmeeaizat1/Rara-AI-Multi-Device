import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { songTitle, score, accuracy, fxUsed } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      feedback: `Kerja bagus! Suaramu di lagu "${songTitle || "Karaoke"}" mendapat skor ${score || 92}/100. Vokal jernih dengan EQ 12-band Aizat!`,
      vocalTips: ["Pertahankan pernapasan diafragma", "Tambah Reverb ke 35% untuk efek Smule"],
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analisis penampilan karaoke user di lagu "${songTitle || "Lagu"}" skor ${score || 90}/100, akurasi ${accuracy || "88%"}, efek: ${fxUsed || "12-Band EQ & Reverb"}. Berikan review juri vokal dalam bahasa Indonesia. Format JSON: {"feedback":"string","vocalTips":["string1","string2","string3"]}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const data = JSON.parse(response.text || "{}");
    return res.json(data);
  } catch (err: any) {
    return res.json({
      feedback: "Suara vokalmu luar biasa! Rekaman bersih tanpa kompresi dengan EQ 12-band.",
      vocalTips: ["Manfaatkan mic monitor untuk dengar reverb real-time", "Naikkan 2kHz-4kHz untuk klaritas vokal"],
    });
  }
}
