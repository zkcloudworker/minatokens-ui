import { Field } from "o1js";

import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Handle GET requests
    res.status(200).json({ hello: "World" });
  } else if (req.method === "POST") {
    // Handle POST requests
    const { value } = req.body;
    const field = Field.from(value);
    const field2 = field.add(Field(1));
    res.status(201).json({ message: `Result: ${field2.toJSON()}` });
  } else {
    // Handle other HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
