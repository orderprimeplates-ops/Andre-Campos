-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "historicalMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 70;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "staffNotes" TEXT;

-- CreateTable
CREATE TABLE "ExpenseReceipt" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalRevenue" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseReceipt_expenseId_key" ON "ExpenseReceipt"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalRevenue_month_key" ON "HistoricalRevenue"("month");

-- AddForeignKey
ALTER TABLE "ExpenseReceipt" ADD CONSTRAINT "ExpenseReceipt_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "EventExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
