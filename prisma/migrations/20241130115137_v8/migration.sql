-- CreateTable
CREATE TABLE "EmailSubscriptions" (
    "email" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSubscriptions_pkey" PRIMARY KEY ("email")
);
