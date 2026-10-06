-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "WorkflowEntityType" AS ENUM ('DONOR', 'ORGAN', 'WITHDRAWAL_REQUEST');

-- CreateEnum
CREATE TYPE "WorkflowEventType" AS ENUM ('CREATED', 'STATUS_CHANGED');

-- AlterEnum
ALTER TYPE "DonorStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "donors" ADD COLUMN     "blood_type" "BloodType";

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "entity_type" "WorkflowEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "event_type" "WorkflowEventType" NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_events_entity_type_entity_id_idx" ON "workflow_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "workflow_events_entity_type_event_type_created_at_idx" ON "workflow_events"("entity_type", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "workflow_events_created_at_idx" ON "workflow_events"("created_at");

-- CreateIndex
CREATE INDEX "donors_blood_type_idx" ON "donors"("blood_type");
