import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import console from "console";
import { afterAll, beforeAll } from "@jest/globals";

global.console = console;
dotenv.config({ path: ".env.test" });

const adapter = new PrismaPg({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});
const prisma = new PrismaClient({ adapter });

const logCopy = console.log.bind(console);

console.log = function () {
  const timestamp = "[" + new Date().toLocaleTimeString() + "] ";

  if (arguments.length) {
    const args = Array.prototype.slice.call(arguments, 0);

    if (typeof arguments[0] === "string") {
      args[0] = "%s" + arguments[0];
      args.splice(1, 0, timestamp);
      logCopy.apply(this, args);
    } else {
      logCopy(timestamp, args);
    }
  }
};

beforeAll(async () => {
  // Connect to the database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect after all tests
  await prisma.$disconnect();
});
