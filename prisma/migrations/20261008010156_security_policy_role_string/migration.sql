/*
  Warnings:

  - Changed the type of `role` on the `security_policies` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "security_policies" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "security_policies_role_resource_action_idx" ON "security_policies"("role", "resource", "action");
