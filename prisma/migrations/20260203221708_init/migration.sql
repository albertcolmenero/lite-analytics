-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('pageview', 'custom');

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pathname" TEXT NOT NULL,
    "hostname" TEXT,
    "referrer" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "country" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "eventName" TEXT,
    "properties" JSONB,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "websites_domain_key" ON "websites"("domain");

-- CreateIndex
CREATE INDEX "events_websiteId_createdAt_idx" ON "events"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "events_websiteId_pathname_idx" ON "events"("websiteId", "pathname");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
