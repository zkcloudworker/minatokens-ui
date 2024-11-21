import { PrismaClient } from "@prisma/client";
import { describe, expect, test } from "@jest/globals";

const prisma = new PrismaClient();

describe("Prisma Tests", () => {
  it.skip("should connect to the database", async () => {
    const result = await prisma.aPIKey.findMany();
    expect(Array.isArray(result)).toBe(true);
    console.log(result);
  });

  it("should calculate statistics for each endpoint", async () => {
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

    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);

    // Log the statistics for each endpoint
    stats.forEach((stat) => {
      console.log(`Endpoint: ${stat.endpoint}`);
      console.log(`Min response time: ${stat._min.responseTimeMs}ms`);
      console.log(`Max response time: ${stat._max.responseTimeMs}ms`);
      console.log(`Avg response time: ${stat._avg.responseTimeMs}ms`);
      console.log("---");
    });
  });

  // Add more test cases as needed
  it.skip("should fetch specific data", async () => {
    // Example: fetching a user by email
    const user = await prisma.aPIKey.findFirst({
      where: {
        email: "test@example.com",
      },
    });
    expect(user).toBeDefined();
    console.log(user);
  });
});
