-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('PENDING_SIGNATURES', 'PARTIALLY_SIGNED', 'FULLY_SIGNED');

-- AlterTablee
ALTER TABLE "rental_agreements" ADD COLUMN     "landlordSignature" TEXT,
ADD COLUMN     "landlordSignedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AgreementStatus" NOT NULL DEFAULT 'PENDING_SIGNATURES',
ADD COLUMN     "tenantSignature" TEXT,
ADD COLUMN     "tenantSignedAt" TIMESTAMP(3);

