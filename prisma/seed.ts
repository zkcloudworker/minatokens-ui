import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.POSTGRES_PRISMA_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Define your initial data here
  // Create a user
  // await prisma.user.create({
  //   data: {
  //     name: "Alice",
  //     email: "alice@example.com",
  //   },
  // });
  // Create other entities
  // await prisma.post.create({ ... })
}

main()
  .then(() => {
    console.log("Database has been seeded. 🌱");
  })
  .catch((e) => {
    console.error("Seeding failed: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
