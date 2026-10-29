-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT;

-- CreateTable
CREATE TABLE "WeeklyResult" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "winnerId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "optionalCount" INTEGER NOT NULL DEFAULT 0,
    "perfectWeek" BOOLEAN NOT NULL DEFAULT false,
    "topFive" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyResult_weekStart_key" ON "WeeklyResult"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklyResult_winnerId_idx" ON "WeeklyResult"("winnerId");

-- AddForeignKey
ALTER TABLE "WeeklyResult" ADD CONSTRAINT "WeeklyResult_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
