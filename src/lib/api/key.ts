"use server";
import { ApiName, ApiResponse } from "./api-types";
import { APIKey, PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import formData from "form-data";
import { checkAddress } from "./utils/address";
import { getBlockberryScamInfo } from "../blockberry-tokens";
import { log as logtail } from "@logtail/next";
import { getChain } from "@/lib/chain";
const chain = getChain();
const log = logtail.with({
  service: "api",
  function: "key",
  chain,
});
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

export async function generateApiKey(props: {
  params: Record<string, any>;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<KeyResponse>> {
  console.log("Generating API key", props);
  const params = parseFormData(props.params);
  console.log("Parsed form data", params);
  const { address, email, name, discord } = params;
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

    const prisma = new PrismaClient({
      datasourceUrl: process.env.POSTGRES_PRISMA_URL,
    });

    const addressBlacklist = await prisma.addressBlacklist.findUnique({
      where: { address },
    });
    if (addressBlacklist) {
      await sendSlackNotification(
        generateBlackListMessage(params, "address", address)
      );
      return {
        status: 400,
        json: { error: "Address is blacklisted" },
      };
    }
    const emailBlacklist = await prisma.emailBlacklist.findUnique({
      where: { email },
    });
    if (emailBlacklist) {
      await sendSlackNotification(
        generateBlackListMessage(params, "email", email)
      );
      return {
        status: 400,
        json: { error: "Email is blacklisted" },
      };
    }
    if (discord) {
      const discordBlacklist = await prisma.discordBlacklist.findUnique({
        where: { discord },
      });
      if (discordBlacklist) {
        await sendSlackNotification(
          generateBlackListMessage(params, "discord", discord)
        );
        return {
          status: 400,
          json: { error: "Discord is blacklisted" },
        };
      }
    }
    const blockberryScamInfo = await getBlockberryScamInfo({ address });
    if (blockberryScamInfo && blockberryScamInfo.length > 0) {
      await sendSlackNotification(
        generateBlackListMessage(params, "scam address", address)
      );
      return {
        status: 400,
        json: { error: "Address is a scam" },
      };
    }
    const key = await prisma.aPIKey.findUnique({
      where: { address },
    });
    if (key && key.email !== email) {
      await sendErrorEmail({ email, address });
      await sendSlackNotification(generateErrorMessage(params, key));
      return {
        status: 400,
        json: { error: "Key already exists" },
      };
    }
    await prisma.aPIKey.upsert({
      where: { address },
      update: {
        email,
        name,
        discord,
      },
      create: {
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
    await prisma.aPIKeyHistory.create({
      data: {
        address,
        email,
        discord,
      },
    });
    const jwt = await generateJWT({ address, name, email, expiry: "1y" });
    await sendEmail({ email, jwt });
    await sendSlackNotification(generateSlackMessage(params));

    return {
      status: 200,
      json: { sent: true },
    };
  } catch (error) {
    log.error("generateApiKey catch", { error });
    return {
      status: 500,
      json: { error: "Internal server error" },
    };
  }
}

export interface SubscriptionResponse {
  status: "success";
}

export async function generateSubscription(
  email: string
): Promise<ApiResponse<SubscriptionResponse>> {
  console.log("Generating subscription", email);
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

    if (!email) {
      return {
        status: 400,
        json: { error: "Missing email" },
      };
    }

    if (!validateEmail(email)) {
      return {
        status: 400,
        json: { error: "Invalid email" },
      };
    }

    const prisma = new PrismaClient({
      datasourceUrl: process.env.POSTGRES_PRISMA_URL,
    });

    const emailBlacklist = await prisma.emailBlacklist.findUnique({
      where: { email },
    });
    if (emailBlacklist) {
      await sendSlackNotification(
        generateSubscriptionMessage({
          email,
          isNew: false,
          isBlacklisted: true,
        })
      );
      return {
        status: 400,
        json: { error: "Email is not accepted" },
      };
    }

    const subscription = await prisma.emailSubscriptions.findUnique({
      where: { email },
    });
    await sendSlackNotification(
      generateSubscriptionMessage({
        email,
        isNew: subscription === null,
        isBlacklisted: false,
      })
    );

    await prisma.emailSubscriptions.upsert({
      where: { email },
      update: {
        email,
      },
      create: {
        email,
      },
    });
    await sendSubscriptionEmail({ email });

    return {
      status: 200,
      json: { status: "success" },
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

export async function generateJWT(params: {
  address: string;
  name: string;
  email: string;
  expiry: string;
}): Promise<string> {
  const { address, name, email, expiry } = params;

  const secret = new TextEncoder().encode(API_SECRET);

  const jwt = await new SignJWT({
    address,
    name,
    email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("minatokens.com")
    .setExpirationTime(expiry)
    .sign(secret);

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
          }\n${
            features
              ? "*Features requested:*\n" + features
              : "*Features requested:* No"
          }\n*Chains requested:* ${chains?.join(", ") ?? "N/A"}`,
        },
      },
    ],
  };
  return message;
}

function generateErrorMessage(params: KeyParams, existingKey: APIKey): object {
  const { address, email, name, discord, features, chains } = params;
  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `API Key cannot be generated for ${name} as it already exists`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Address:* ${address}\n*Email:* ${email}\n*Discord:* ${
            discord ?? "N/A"
          }\n${
            features
              ? "*Features requested:*\n" + features
              : "*Features requested:* No"
          }\n*Chains requested:* ${chains?.join(", ") ?? "N/A"}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Existing key:*\n*Email:* ${existingKey.email}\n*Discord:* ${
            existingKey.discord ?? "N/A"
          }`,
        },
      },
    ],
  };
  return message;
}

function generateSubscriptionMessage(params: {
  email: string;
  isNew: boolean;
  isBlacklisted: boolean;
}): object {
  const { email, isNew, isBlacklisted } = params;
  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Subscription to MinaTokens news${isNew ? "" : " (repeated)"}${
            isBlacklisted ? " (blacklisted)" : ""
          }`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Email:* ${email}`,
        },
      },
    ],
  };
  return message;
}

function generateBlackListMessage(
  params: KeyParams,
  key: string,
  value: string
): object {
  const { address, email, name, discord, features, chains } = params;
  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `API Key cannot be generated for ${name} as it is blacklisted`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Address:* ${address}\n*Email:* ${email}\n*Discord:* ${
            discord ?? "N/A"
          }\n${
            features
              ? "*Features requested:*\n" + features
              : "*Features requested:* No"
          }\n*Chains requested:* ${chains?.join(", ") ?? "N/A"}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Blacklisted:*\n*key:* ${key}\n*value:* ${value}`,
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
  form.append("template", "API key");
  form.append("h:X-Mailgun-Variables", `{"jwt": "${jwt}"}`);

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

async function sendSubscriptionEmail(params: { email: string }) {
  if (!MAILGUN_API_ENDPOINT || !MAILGUN_API_SEND_KEY) {
    throw new Error("MAILGUN_API_ENDPOINT or MAILGUN_API_SEND_KEY not set");
  }
  const { email } = params;
  const form = new formData();
  form.append("from", "MinaTokens <news@minatokens.com>");
  form.append("to", email);
  form.append("subject", "Thank you for subscribing to MinaTokens news");
  form.append("template", "subscription");

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
    console.error(`Failed to send subscription email: ${response.statusText}`);
  } else {
    console.log("Subscription email sent:", await response.text());
  }
}

async function sendErrorEmail(params: { email: string; address: string }) {
  if (!MAILGUN_API_ENDPOINT || !MAILGUN_API_SEND_KEY) {
    throw new Error("MAILGUN_API_ENDPOINT or MAILGUN_API_SEND_KEY not set");
  }
  const { email, address } = params;
  const form = new formData();
  form.append("from", "MinaTokens API <api@minatokens.com>");
  form.append("to", email);
  form.append("subject", "Your MinaTokens API Key cannot be generated");
  form.append("template", "API key error");
  form.append("h:X-Mailgun-Variables", `{"address": "${address}"}`);

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
    console.error(`Failed to send error email: ${response.statusText}`);
  } else {
    console.log("Error email sent:", await response.text());
  }
}

/*
{
  'Your name': 'name',
  'Your MINA address (B62...)': 'B62qrmxBQZp7czXnBjqXtqzdMTr9oh3gjFUwVwjmUgMi9kMmLh2Fn6G',
  'On what chains do you plan to use API key?': [ 'Mina devnet', 'Mina mainnet' ],
  'What features do you want us to add to MinaTokens Custom Token Launchpad?': 'features\n123',
  'Your discord handle': 'discord'
}
*/

function parseFormData(formData: Record<string, any>): KeyParams {
  const params: KeyParams = {
    address: formData["Your MINA address (B62...)"] as string,
    email: formData["email"] as string,
    name: formData["Your name"] as string,
    discord: formData["Your discord handle"] as string | undefined,
    features: formData[
      "What features do you want us to add to MinaTokens Custom Token Launchpad?"
    ] as string,
    chains: formData["On what chains do you plan to use API key?"] as
      | string[]
      | undefined,
  };
  return params;
}
