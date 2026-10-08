-- CreateEnum
CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'PROTECTED', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "AccessDecision" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "AiRequestClassification" AS ENUM ('ORGANFLOW_RELEVANT', 'OUT_OF_SCOPE', 'PRIVATE_DATA_REQUEST', 'CREDENTIAL_REQUEST', 'SECURITY_ABUSE', 'INAPPROPRIATE_CONTENT', 'AUTHORIZED_SECURITY_ANALYSIS');

-- CreateTable
CREATE TABLE "security_policies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "classification" "DataClassification" NOT NULL,
    "requires_ownership" BOOLEAN NOT NULL,
    "decision" "AccessDecision" NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "security_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "classification" "DataClassification" NOT NULL,
    "decision" "AccessDecision" NOT NULL,
    "policy_code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_security_events" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_role" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "classification" "AiRequestClassification" NOT NULL,
    "decision" "AccessDecision" NOT NULL,
    "reason" TEXT NOT NULL,
    "question_excerpt" TEXT,
    "tools_authorized" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_policies_code_key" ON "security_policies"("code");

-- CreateIndex
CREATE INDEX "security_policies_role_resource_action_idx" ON "security_policies"("role", "resource", "action");

-- CreateIndex
CREATE INDEX "security_events_decision_created_at_idx" ON "security_events"("decision", "created_at");

-- CreateIndex
CREATE INDEX "security_events_actor_role_created_at_idx" ON "security_events"("actor_role", "created_at");

-- CreateIndex
CREATE INDEX "security_events_resource_action_idx" ON "security_events"("resource", "action");

-- CreateIndex
CREATE INDEX "security_events_created_at_idx" ON "security_events"("created_at");

-- CreateIndex
CREATE INDEX "ai_security_events_decision_created_at_idx" ON "ai_security_events"("decision", "created_at");

-- CreateIndex
CREATE INDEX "ai_security_events_classification_created_at_idx" ON "ai_security_events"("classification", "created_at");

-- CreateIndex
CREATE INDEX "ai_security_events_created_at_idx" ON "ai_security_events"("created_at");
