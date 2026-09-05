ALTER TABLE "Payment" ADD COLUMN "amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN "clientToken" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "idempotencyKey" TEXT NOT NULL,
ADD COLUMN "providerOrderID" TEXT;

CREATE TABLE "PaymentWebhookEvent" (
    "id" SERIAL NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerOrderID" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentWebhookEvent_providerOrderID_idx" ON "PaymentWebhookEvent"("providerOrderID");
CREATE INDEX "PaymentWebhookEvent_receivedAt_idx" ON "PaymentWebhookEvent"("receivedAt");
CREATE UNIQUE INDEX "Payment_providerOrderID_key" ON "Payment"("providerOrderID");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_orderID_status_idx" ON "Payment"("orderID", "status");
CREATE INDEX "Payment_status_expiresAt_idx" ON "Payment"("status", "expiresAt");
