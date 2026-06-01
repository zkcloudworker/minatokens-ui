import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { describe, test } from "node:test";
import assert from "node:assert";

const adapter = new PrismaPg({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});
const prisma = new PrismaClient({ adapter });

describe("Prisma Tests", () => {
  test.skip("should connect to the database", async () => {
    const result = await prisma.aPIKey.findMany();
    assert.ok(Array.isArray(result));
    console.log(result);
  });

  test("should calculate statistics for each endpoint", async () => {
    // Calculate statistics for each endpoint
    const stats = await prisma.aPIKeyCalls.groupBy({
      by: ["endpoint"],
      _min: {
        responseTimeMs: true,
      },
      _max: {
        responseTimeMs: true,
      },
      _avg: {
        responseTimeMs: true,
      },
    });

    assert.ok(stats);
    assert.ok(Array.isArray(stats));

    // Log the statistics for each endpoint
    stats.forEach((stat) => {
      console.log(`Endpoint: ${stat.endpoint}`);
      console.log(`Min response time: ${stat._min.responseTimeMs}ms`);
      console.log(`Max response time: ${stat._max.responseTimeMs}ms`);
      console.log(`Avg response time: ${stat._avg.responseTimeMs}ms`);
      console.log("---");
    });
  });

  test("should count UserActivity records", async () => {
    const count = await prisma.userActivity.count();
    console.log("UserActivity count:", count);
    assert.ok(typeof count === "number");
  });

  test.skip("should fetch specific data", async () => {
    const user = await prisma.aPIKey.findFirst({
      where: {
        email: "test@example.com",
      },
    });
    assert.ok(user);
    console.log(user);
  });
});
