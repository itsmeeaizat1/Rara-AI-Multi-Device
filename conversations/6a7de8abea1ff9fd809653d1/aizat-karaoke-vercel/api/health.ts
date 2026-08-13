import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ status: "ok", app: "Aizat Karaoke Studio" });
}
