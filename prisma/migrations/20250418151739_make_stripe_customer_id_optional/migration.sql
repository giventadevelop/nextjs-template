/*
  Warnings:

  - The primary key for the `Subscription` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `status` on table `Subscription` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_pkey",
ALTER COLUMN "stripe_customer_id" DROP NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY ("userId");
