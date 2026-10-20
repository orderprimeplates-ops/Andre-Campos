-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseCategory" ADD VALUE 'KITCHEN_RENTAL';
ALTER TYPE "ExpenseCategory" ADD VALUE 'MARKETING';
ALTER TYPE "ExpenseCategory" ADD VALUE 'SOFTWARE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'INSURANCE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'PROFESSIONAL';

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "overheadPerEventCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownerHourlyRateCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ownerHours" DOUBLE PRECISION,
ADD COLUMN     "salesTaxCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventExpense" ADD COLUMN     "paymentMethod" TEXT,
ALTER COLUMN "eventId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "salesTaxCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "EventExpense_date_idx" ON "EventExpense"("date");
