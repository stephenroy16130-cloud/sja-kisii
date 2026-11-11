-- AlterTable
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FieldOp" ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION;
ALTER TABLE "FieldOp" ADD COLUMN IF NOT EXISTS "geoLng" DOUBLE PRECISION;
ALTER TABLE "FieldOp" ADD COLUMN IF NOT EXISTS "geoRadius" INTEGER;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "geoLng" DOUBLE PRECISION;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "geoRadius" INTEGER;

-- AlterTable
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION;
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "geoLng" DOUBLE PRECISION;
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "geoRadius" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
