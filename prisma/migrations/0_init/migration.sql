-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('researching', 'applied', 'screen', 'interview', 'offer', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('resume', 'cover_letter', 'ninety_day', 'dossier');

-- CreateEnum
CREATE TYPE "AtsProvider" AS ENUM ('greenhouse', 'lever', 'ashby', 'workday');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('new', 'viewed', 'drafted', 'dismissed');

-- CreateEnum
CREATE TYPE "ApplicationEventKind" AS ENUM ('created', 'status_change', 'note', 'document_generated', 'follow_up');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillsDB" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "positioning" TEXT NOT NULL DEFAULT '',
    "contact" JSONB NOT NULL,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "awards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobs" JSONB NOT NULL DEFAULT '[]',
    "coreSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "methods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillsDB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "salaryRange" TEXT,
    "jobDescription" TEXT,
    "status" "ApplicationStatus" NOT NULL,
    "appliedDate" TEXT,
    "followUpDate" TEXT,
    "notes" TEXT,
    "alignmentAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" "ApplicationEventKind" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus",
    "documentId" TEXT,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistCompany" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "atsProvider" "AtsProvider" NOT NULL,
    "atsSlug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastPolled" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredPosting" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "watchlistCompanyId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "atsProvider" "AtsProvider" NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "remote" BOOLEAN NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "salaryRange" TEXT,
    "jobDescription" TEXT NOT NULL DEFAULT '',
    "alignmentScore" INTEGER,
    "status" "DiscoveryStatus" NOT NULL,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveredPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SkillsDB_ownerId_key" ON "SkillsDB"("ownerId");

-- CreateIndex
CREATE INDEX "Application_ownerId_status_idx" ON "Application"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Application_ownerId_createdAt_idx" ON "Application"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_at_idx" ON "ApplicationEvent"("applicationId", "at");

-- CreateIndex
CREATE INDEX "Document_ownerId_kind_idx" ON "Document"("ownerId", "kind");

-- CreateIndex
CREATE INDEX "Document_applicationId_idx" ON "Document"("applicationId");

-- CreateIndex
CREATE INDEX "WatchlistCompany_active_lastPolled_idx" ON "WatchlistCompany"("active", "lastPolled");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistCompany_ownerId_atsProvider_atsSlug_key" ON "WatchlistCompany"("ownerId", "atsProvider", "atsSlug");

-- CreateIndex
CREATE INDEX "DiscoveredPosting_ownerId_status_postedAt_idx" ON "DiscoveredPosting"("ownerId", "status", "postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredPosting_watchlistCompanyId_externalId_key" ON "DiscoveredPosting"("watchlistCompanyId", "externalId");

-- AddForeignKey
ALTER TABLE "SkillsDB" ADD CONSTRAINT "SkillsDB_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistCompany" ADD CONSTRAINT "WatchlistCompany_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredPosting" ADD CONSTRAINT "DiscoveredPosting_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

