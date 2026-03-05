/*
  Warnings:

  - You are about to drop the column `productid` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the `Produt` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `productId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productid_fkey";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "productid",
ADD COLUMN     "productId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Produt";

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[],

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
