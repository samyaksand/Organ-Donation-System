-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "recovery_logs" (
    "id" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "initiator_email" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL,
    "message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "recovery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recovery_logs_started_at_idx" ON "recovery_logs"("started_at");
