ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM (
  'AWAITING_PAYMENT',
  'COMPLETED',
  'PROCESSING',
  'CANCELED',
  'DELIVERED',
  'IN_TRANSIT'
);

ALTER TABLE "Order"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "OrderStatus"
USING ("status"::text::"OrderStatus");

ALTER TABLE "Order"
ALTER COLUMN "status" SET DEFAULT 'AWAITING_PAYMENT';

DROP TYPE "OrderStatus_old";
