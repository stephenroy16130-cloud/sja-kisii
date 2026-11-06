/*
  Warnings:

  - A unique constraint covering the columns `[qrToken]` on the table `FieldOp` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrToken]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrToken]` on the table `Training` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "FieldOp" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "qrActivatesAt" TIMESTAMP(3),
ADD COLUMN     "qrExpiresAt" TIMESTAMP(3),
ADD COLUMN     "qrToken" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "qrActivatesAt" TIMESTAMP(3),
ADD COLUMN     "qrExpiresAt" TIMESTAMP(3),
ADD COLUMN     "qrToken" TEXT;

-- AlterTable
ALTER TABLE "Training" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "qrActivatesAt" TIMESTAMP(3),
ADD COLUMN     "qrExpiresAt" TIMESTAMP(3),
ADD COLUMN     "qrToken" TEXT;

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "kind" "EventType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "crewId" INTEGER,
    "status" "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLink" (
    "id" TEXT NOT NULL,
    "kind" "EventType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckIn_kind_eventId_status_idx" ON "CheckIn"("kind", "eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_kind_eventId_userId_key" ON "CheckIn"("kind", "eventId", "userId");

-- CreateIndex
CREATE INDEX "EventLink_kind_eventId_idx" ON "EventLink"("kind", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldOp_qrToken_key" ON "FieldOp"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_qrToken_key" ON "Meeting"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Training_qrToken_key" ON "Training"("qrToken");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
