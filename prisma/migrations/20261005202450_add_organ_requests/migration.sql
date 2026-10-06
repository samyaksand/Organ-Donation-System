-- CreateEnum
CREATE TYPE "OrganRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "WorkflowEntityType" ADD VALUE 'ORGAN_REQUEST';

-- CreateTable
CREATE TABLE "organ_requests" (
    "id" TEXT NOT NULL,
    "organ_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "status" "OrganRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "decline_reason" TEXT,
    "requested_by_id" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organ_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organ_requests_organ_id_status_idx" ON "organ_requests"("organ_id", "status");

-- CreateIndex
CREATE INDEX "organ_requests_hospital_id_status_idx" ON "organ_requests"("hospital_id", "status");

-- CreateIndex
CREATE INDEX "organ_requests_status_created_at_idx" ON "organ_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "organ_requests" ADD CONSTRAINT "organ_requests_organ_id_fkey" FOREIGN KEY ("organ_id") REFERENCES "organs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organ_requests" ADD CONSTRAINT "organ_requests_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organ_requests" ADD CONSTRAINT "organ_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organ_requests" ADD CONSTRAINT "organ_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
