import type { NextApiRequest, NextApiResponse } from "next";
const MINATOKENS_API_KEY = process.env.MINATOKENS_API_KEY;

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export function checkApiKey(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!MINATOKENS_API_KEY) {
      console.error("API key not set");
      return res.status(500).json({ error: "API key not set" });
    }
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.MINATOKENS_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Proceed to the handler if the API key is valid
    return handler(req, res);
  };
}
