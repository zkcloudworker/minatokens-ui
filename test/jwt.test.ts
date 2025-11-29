import { describe, it } from "node:test";
import assert from "node:assert";
import { SignJWT, jwtVerify } from "jose";

const API_SECRET = process.env.API_SECRET;

const testAddress = "B62qiuRRNqLHkyyqFzhfBtrc8LgNDN9N4P7FzfxJkhgxBxJdMewAjAv";
const testName = "Test User";
const testEmail = "test@example.com";

async function generateJWT(params: {
  address: string;
  name: string;
  email: string;
  expiry: string;
}): Promise<string> {
  const { address, name, email, expiry } = params;

  if (!API_SECRET) {
    throw new Error("API_SECRET not set");
  }

  const secret = new TextEncoder().encode(API_SECRET);

  const token = await new SignJWT({
    address,
    name,
    email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("minatokens.com")
    .setExpirationTime(expiry)
    .sign(secret);

  return token;
}

async function verifyJWT(token: string): Promise<{
  address: string;
  name: string;
  email: string;
} | null> {
  try {
    if (!API_SECRET) {
      throw new Error("API_SECRET not set");
    }

    const secret = new TextEncoder().encode(API_SECRET);
    const result = await jwtVerify(token, secret);

    if (
      !result?.payload?.address ||
      typeof result.payload.address !== "string" ||
      !result.payload.name ||
      typeof result.payload.name !== "string" ||
      !result.payload.email ||
      typeof result.payload.email !== "string"
    ) {
      return null;
    }

    return {
      address: result.payload.address as string,
      name: result.payload.name as string,
      email: result.payload.email as string,
    };
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

describe("JWT Generation and Verification", () => {
  it("should generate and verify JWT", async () => {
    const jwt = await generateJWT({
      address: testAddress,
      name: testName,
      email: testEmail,
      expiry: "1y",
    });
    console.log("Generated JWT:", jwt);
    assert.ok(jwt);
    assert.strictEqual(typeof jwt, "string");

    const payload = await verifyJWT(jwt);
    console.log("JWT payload:", payload);
    assert.ok(payload);
    assert.strictEqual(payload?.address, testAddress);
    assert.strictEqual(payload?.name, testName);
    assert.strictEqual(payload?.email, testEmail);
  });

  it("should generate JWT for activity API", async () => {
    const customAddress =
      "B62qo69VLUPMXEC6AFWRgjdTEGsA3xKvqeU5CgYm3jAbBJL7dTvaQkv";
    const customName = "Zekoboom";
    const customEmail = "zekoboom@zeko.io";

    const customJWT = await generateJWT({
      address: customAddress,
      name: customName,
      email: customEmail,
      expiry: "1y",
    });

    console.log("\n=== Custom JWT for Activity API ===");
    console.log("Address:", customAddress);
    console.log("Name:", customName);
    console.log("Email:", customEmail);
    console.log("JWT:", customJWT);
    console.log("===================================\n");

    const payload = await verifyJWT(customJWT);
    assert.ok(payload);
    assert.strictEqual(payload?.address, customAddress);
    assert.strictEqual(payload?.name, customName);
    assert.strictEqual(payload?.email, customEmail);
  });
});
