-- CreateTable
CREATE TABLE "pledges" (
    "id" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "organ_preference" "OrganType" NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pledges_reference_id_key" ON "pledges"("reference_id");

-- CreateIndex
CREATE INDEX "pledges_email_idx" ON "pledges"("email");

-- CreateIndex
CREATE INDEX "pledges_created_at_idx" ON "pledges"("created_at");
