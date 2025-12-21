-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "jurisdictionCode" TEXT NOT NULL,
    "jurisdictionName" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dateIntroduced" TIMESTAMP(3),
    "datePassed" TIMESTAMP(3),
    "dateEffective" TIMESTAMP(3),
    "policyType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyTag" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicySource" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "name" TEXT,
    "externalId" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZipProfile" (
    "id" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "utilityType" TEXT,
    "climateZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZipProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRelevanceRule" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "PolicyRelevanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Policy_jurisdictionCode_level_idx" ON "Policy"("jurisdictionCode", "level");

-- CreateIndex
CREATE INDEX "Policy_status_idx" ON "Policy"("status");

-- CreateIndex
CREATE INDEX "Policy_datePassed_idx" ON "Policy"("datePassed");

-- CreateIndex
CREATE INDEX "PolicyTag_tag_idx" ON "PolicyTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyTag_policyId_tag_key" ON "PolicyTag"("policyId", "tag");

-- CreateIndex
CREATE INDEX "PolicySource_sourceType_idx" ON "PolicySource"("sourceType");

-- CreateIndex
CREATE INDEX "PolicySource_externalId_idx" ON "PolicySource"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ZipProfile_zipCode_key" ON "ZipProfile"("zipCode");

-- CreateIndex
CREATE INDEX "PolicyRelevanceRule_dimension_idx" ON "PolicyRelevanceRule"("dimension");

-- AddForeignKey
ALTER TABLE "PolicyTag" ADD CONSTRAINT "PolicyTag_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicySource" ADD CONSTRAINT "PolicySource_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRelevanceRule" ADD CONSTRAINT "PolicyRelevanceRule_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
