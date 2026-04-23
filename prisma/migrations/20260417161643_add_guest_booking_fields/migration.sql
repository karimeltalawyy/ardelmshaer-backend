-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_rider_id_fkey";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "rider_name" TEXT,
ADD COLUMN     "rider_phone" TEXT,
ALTER COLUMN "rider_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
