-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEPOSIT', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'CASH', 'RECEIVABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "TxnType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'FEE', 'INTEREST');

-- CreateEnum
CREATE TYPE "Period" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NONE', 'PENDING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExtractedStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('SYSTEM', 'USER', 'RULE', 'AI');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('BANK_API', 'PDF', 'IMAGE', 'MANUAL');

-- CreateEnum
CREATE TYPE "InstallmentReviewStatus" AS ENUM ('OK', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('UPLOAD', 'EMAIL_FORWARD', 'BANK_EXPORT');

-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('USER', 'SYSTEM', 'API');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'TRY',
    "preferredCurrency" TEXT NOT NULL DEFAULT 'TRY',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT,
    "type" "AccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionGroup" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCardMeta" (
    "accountId" TEXT NOT NULL,
    "apr" DECIMAL(7,4),
    "creditLimit" DECIMAL(18,2),
    "statementDay" INTEGER,
    "paymentDay" INTEGER,
    "minPaymentRate" DECIMAL(5,4),
    "annualFee" DECIMAL(18,2),
    "issuer" TEXT,

    CONSTRAINT "CreditCardMeta_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "TxnType" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionTag" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" "TagSource" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "TransactionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "type" "TxnType" NOT NULL,
    "categoryId" TEXT,
    "source" "TransactionSource" NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NONE',
    "installmentPlanId" TEXT,
    "statementDocumentId" TEXT,
    "externalId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "period" "Period" NOT NULL,
    "interval" INTEGER,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "categoryId" TEXT,
    "lifeDomain" TEXT,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "period" "Period" NOT NULL,
    "interval" INTEGER,
    "nextExpectedAt" TIMESTAMP(3) NOT NULL,
    "variability" DECIMAL(5,4),
    "accountId" TEXT,
    "categoryId" TEXT,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardAccountId" TEXT NOT NULL,
    "originalTransactionId" TEXT,
    "merchant" TEXT,
    "description" TEXT,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "numInstallments" INTEGER NOT NULL,
    "installmentAmount" DECIMAL(18,2) NOT NULL,
    "firstDueAt" TIMESTAMP(3) NOT NULL,
    "frequencyDays" INTEGER NOT NULL DEFAULT 30,
    "remainingInstallments" INTEGER NOT NULL,
    "tags" TEXT[],
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reviewStatus" "InstallmentReviewStatus" NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetCash" DECIMAL(18,2) NOT NULL,
    "assetInvestments" DECIMAL(18,2) NOT NULL,
    "assetReceivables" DECIMAL(18,2) NOT NULL,
    "liabilityCreditCards" DECIMAL(18,2) NOT NULL,
    "liabilityLoans" DECIMAL(18,2) NOT NULL,
    "assets" DECIMAL(18,2) NOT NULL,
    "liabilities" DECIMAL(18,2) NOT NULL,
    "netWorth" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "NetWorthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "horizon" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "series" JSONB NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "sourceType" "ImportSourceType" NOT NULL DEFAULT 'UPLOAD',
    "sourceHint" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "modelUsed" TEXT,

    CONSTRAINT "DocumentUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedLineItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "lineIndex" INTEGER NOT NULL,
    "rawText" TEXT,
    "date" TIMESTAMP(3),
    "amount" DECIMAL(18,2),
    "currency" TEXT,
    "merchant" TEXT,
    "description" TEXT,
    "suggestedCategoryId" TEXT,
    "suggestedTagNames" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "linkedTransactionId" TEXT,
    "status" "ExtractedStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "tagIds" TEXT[],
    "categoryId" TEXT,
    "confidenceBoost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdFromTransactionId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'USER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE INDEX "Account_userId_type_idx" ON "Account"("userId", "type");

-- CreateIndex
CREATE INDEX "Account_userId_countryCode_regionGroup_idx" ON "Account"("userId", "countryCode", "regionGroup");

-- CreateIndex
CREATE INDEX "Account_userId_isActive_idx" ON "Account"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Category_userId_type_idx" ON "Category"("userId", "type");

-- CreateIndex
CREATE INDEX "Category_userId_parentId_idx" ON "Category"("userId", "parentId");

-- CreateIndex
CREATE INDEX "Tag_userId_name_idx" ON "Tag"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_slug_key" ON "Tag"("userId", "slug");

-- CreateIndex
CREATE INDEX "TransactionTag_tagId_idx" ON "TransactionTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionTag_transactionId_tagId_key" ON "TransactionTag"("transactionId", "tagId");

-- CreateIndex
CREATE INDEX "Transaction_accountId_postedAt_idx" ON "Transaction"("accountId", "postedAt");

-- CreateIndex
CREATE INDEX "Transaction_accountId_merchant_idx" ON "Transaction"("accountId", "merchant");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_source_reviewStatus_idx" ON "Transaction"("source", "reviewStatus");

-- CreateIndex
CREATE INDEX "Transaction_postedAt_idx" ON "Transaction"("postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_accountId_externalId_key" ON "Transaction"("accountId", "externalId");

-- CreateIndex
CREATE INDEX "FixedExpense_userId_isActive_idx" ON "FixedExpense"("userId", "isActive");

-- CreateIndex
CREATE INDEX "FixedExpense_nextDueAt_idx" ON "FixedExpense"("nextDueAt");

-- CreateIndex
CREATE INDEX "IncomeSource_userId_isActive_idx" ON "IncomeSource"("userId", "isActive");

-- CreateIndex
CREATE INDEX "IncomeSource_nextExpectedAt_idx" ON "IncomeSource"("nextExpectedAt");

-- CreateIndex
CREATE INDEX "InstallmentPlan_userId_cardAccountId_idx" ON "InstallmentPlan"("userId", "cardAccountId");

-- CreateIndex
CREATE INDEX "InstallmentPlan_firstDueAt_idx" ON "InstallmentPlan"("firstDueAt");

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_userId_takenAt_idx" ON "NetWorthSnapshot"("userId", "takenAt");

-- CreateIndex
CREATE UNIQUE INDEX "NetWorthSnapshot_userId_takenAt_key" ON "NetWorthSnapshot"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "Prediction_userId_createdAt_idx" ON "Prediction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentUpload_userId_status_idx" ON "DocumentUpload"("userId", "status");

-- CreateIndex
CREATE INDEX "DocumentUpload_uploadedAt_idx" ON "DocumentUpload"("uploadedAt");

-- CreateIndex
CREATE INDEX "ExtractedLineItem_documentId_status_idx" ON "ExtractedLineItem"("documentId", "status");

-- CreateIndex
CREATE INDEX "ExtractedLineItem_status_idx" ON "ExtractedLineItem"("status");

-- CreateIndex
CREATE INDEX "TagRule_userId_pattern_idx" ON "TagRule"("userId", "pattern");

-- CreateIndex
CREATE INDEX "TagRule_userId_active_idx" ON "TagRule"("userId", "active");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrency_toCurrency_date_idx" ON "ExchangeRate"("fromCurrency", "toCurrency", "date");

-- CreateIndex
CREATE INDEX "ExchangeRate_userId_date_idx" ON "ExchangeRate"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_userId_fromCurrency_toCurrency_date_key" ON "ExchangeRate"("userId", "fromCurrency", "toCurrency", "date");

-- CreateIndex
CREATE INDEX "ApiCredential_userId_provider_idx" ON "ApiCredential"("userId", "provider");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_seenAt_idx" ON "WebhookEvent"("processed", "seenAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardMeta" ADD CONSTRAINT "CreditCardMeta_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTag" ADD CONSTRAINT "TransactionTag_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTag" ADD CONSTRAINT "TransactionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statementDocumentId_fkey" FOREIGN KEY ("statementDocumentId") REFERENCES "DocumentUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_cardAccountId_fkey" FOREIGN KEY ("cardAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetWorthSnapshot" ADD CONSTRAINT "NetWorthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentUpload" ADD CONSTRAINT "DocumentUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedLineItem" ADD CONSTRAINT "ExtractedLineItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedLineItem" ADD CONSTRAINT "ExtractedLineItem_suggestedCategoryId_fkey" FOREIGN KEY ("suggestedCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedLineItem" ADD CONSTRAINT "ExtractedLineItem_linkedTransactionId_fkey" FOREIGN KEY ("linkedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagRule" ADD CONSTRAINT "TagRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagRule" ADD CONSTRAINT "TagRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

