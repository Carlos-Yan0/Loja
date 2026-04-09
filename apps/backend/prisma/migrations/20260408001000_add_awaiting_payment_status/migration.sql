DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum enum_values
    JOIN pg_type enum_types ON enum_types.oid = enum_values.enumtypid
    WHERE enum_types.typname = 'OrderStatus'
      AND enum_values.enumlabel = 'AWAITING_PAYMENT'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_PAYMENT';
  END IF;
END $$;

ALTER TABLE "Order"
ALTER COLUMN "status" SET DEFAULT 'AWAITING_PAYMENT';

