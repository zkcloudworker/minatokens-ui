"use server";
import { ApiResponse } from "./types";
import { PrismaClient } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import formData from "form-data";
import { checkAddress } from "@/lib/address";
import { getChain } from "@/lib/chain";
const chain = getChain();

const {
  MAILGUN_API_ENDPOINT,
  MAILGUN_API_SEND_KEY,
  SLACK_WEBHOOK_URL,
  API_SECRET,
} = process.env;

export interface KeyParams {
  address: string;
  email: string;
  name: string;
  discord?: string;
  features?: string;
  chains?: string[];
}

export interface KeyResponse {
  sent: boolean;
}

export async function generateApiKey(
  params: KeyParams
): Promise<ApiResponse<KeyResponse>> {
  const { address, email, name, discord, features, chains } = params;
  console.log("Generating API key", params);
  try {
    if (
      !API_SECRET ||
      !MAILGUN_API_ENDPOINT ||
      !MAILGUN_API_SEND_KEY ||
      !SLACK_WEBHOOK_URL
    ) {
      return {
        status: 500,
        json: { error: "Internal server error (env not set)" },
      };
    }
    if (!address || !checkAddress(address)) {
      return {
        status: 400,
        json: { error: "Invalid address" },
      };
    }
    if (!validateEmail(email)) {
      return {
        status: 400,
        json: { error: "Invalid email" },
      };
    }
    if (!name) {
      return {
        status: 400,
        json: { error: "Missing name" },
      };
    }

    if (!email) {
      return {
        status: 400,
        json: { error: "Missing email" },
      };
    }

    const jwt = await generateJWT({ address, email });
    await sendEmail({ email, jwt });
    await sendSlackNotification(generateSlackMessage(params));
    const prisma = new PrismaClient({
      datasourceUrl: process.env.POSTGRES_PRISMA_URL,
    });
    await prisma.aPIKey.create({
      data: {
        address,
        email,
        name,
        discord,
        chains: {
          create: [
            {
              chain: "mina_devnet",
              activated: true,
            },
            {
              chain: "mina_mainnet",
              activated: false,
            },
            {
              chain: "zeko_devnet",
              activated: true,
            },
            {
              chain: "zeko_mainnet",
              activated: false,
            },
          ],
        },
      },
    });
    const key = await prisma.aPIKey.findUnique({
      where: { address },
    });
    console.log("Key created:", key);

    return {
      status: 200,
      json: { sent: true },
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      json: { error: "Internal server error" },
    };
  }
}

function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

async function generateJWT(params: {
  address: string;
  email: string;
}): Promise<string> {
  const { address, email } = params;

  const secret = new TextEncoder().encode(API_SECRET);

  const jwt = await new SignJWT({
    address,
    email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("minatokens.com")
    .setExpirationTime("1y")
    .sign(secret);

  // try {
  //   const isVerified = await jwtVerify(jwt, secret);
  //   console.log("Is verified:", isVerified);
  //   console.log(
  //     "Expiry:",
  //     new Date(isVerified.payload.exp! * 1000).toISOString()
  //   );
  //   return jwt;
  // } catch (error) {
  //   console.error(error);
  //   return "";
  // }
  return jwt;
}

function generateSlackMessage(params: KeyParams): object {
  const { address, email, name, discord, features, chains } = params;
  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `API Key generated for ${name}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Address:* ${address}\n*Email:* ${email}\n*Discord:* ${
            discord ?? "N/A"
          }\n*Features requested:* ${features ?? "N/A"}\n*Chains requested:* ${
            chains ?? "N/A"
          }`,
        },
      },
    ],
  };
  return message;
}

async function sendSlackNotification(message: object) {
  if (!SLACK_WEBHOOK_URL) {
    throw new Error("SLACK_WEBHOOK_URL not set");
  }
  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    console.error(`Failed to send Slack notification: ${response.statusText}`);
  } else {
    console.log("Slack notification sent:", await response.text());
  }
}

async function sendEmail(params: { email: string; jwt: string }) {
  if (!MAILGUN_API_ENDPOINT || !MAILGUN_API_SEND_KEY) {
    throw new Error("MAILGUN_API_ENDPOINT or MAILGUN_API_SEND_KEY not set");
  }
  const { email, jwt } = params;
  const form = new formData();
  form.append("from", "MinaTokens API <api@minatokens.com>");
  form.append("to", email);
  form.append("subject", "Your MinaTokens API Key");
  form.append("text", `Your API Key is: ${jwt}`);
  //form.append("html", `<h1>Your API Key is: ${jwt}</h1>`);

  const response = await fetch(MAILGUN_API_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `api:${MAILGUN_API_SEND_KEY}`
      ).toString("base64")}`,
      ...form.getHeaders(),
    },
    body: Uint8Array.from(form.getBuffer()),
  });
  if (!response.ok) {
    console.error(`Failed to send email: ${response.statusText}`);
  } else {
    console.log("Email sent:", await response.text());
  }
}
