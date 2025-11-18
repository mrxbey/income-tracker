-- ========================================
-- COMPLETE DATABASE SETUP FOR INCOME TRACKER
-- ========================================
-- Run this entire script in Supabase SQL Editor
-- This will create all tables, indexes, and constraints
-- ========================================

-- ========================================
-- MIGRATION 1: Initial Schema
-- ========================================

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEPOSIT', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'CASH', 'RECEIVABLE', 'OTHER');
CREATE TYPE "TxnType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'FEE', 'INTEREST');
CREATE TYPE "Period" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');
CREATE TYPE "ReviewStatus" AS ENUM ('NONE', 'PENDING', 'RESOLVED');
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "ExtractedStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'DISCARDED');
CREATE TYPE "TagSource" AS ENUM ('SYSTEM', 'USER', 'RULE', 'AI');
CREATE TYPE "TransactionSource" AS ENUM ('BANK_API', 'PDF', 'IMAGE', 'MANUAL');
CREATE TYPE "InstallmentReviewStatus" AS ENUM ('OK', 'NEEDS_REVIEW');
CREATE TYPE "ImportSourceType" AS ENUM ('UPLOAD', 'EMAIL_FORWARD', 'BANK_EXPORT');
CREATE TYPE "ExchangeRateSource" AS ENUM ('USER', 'SYSTEM', 'API');

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'TRY',
    "preferredCurrency" TEXT NOT NULL DEFAULT 'TRY',
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Institution
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Account
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

-- CreateTable: CreditCardMeta
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

-- CreateTable: Category
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

-- CreateTable: Tag
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

-- CreateTable: TransactionTag
CREATE TABLE "TransactionTag" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" "TagSource" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    CONSTRAINT "TransactionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Transaction
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

-- CreateTable: FixedExpense
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

-- CreateTable: IncomeSource
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

-- CreateTable: InstallmentPlan
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

-- CreateTable: NetWorthSnapshot
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

-- CreateTable: Prediction
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "horizon" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "series" JSONB NOT NULL,
    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DocumentUpload
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

-- CreateTable: ExtractedLineItem
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

-- CreateTable: TagRule
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

-- CreateTable: ExchangeRate
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

-- CreateTable: ApiCredential
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

-- CreateTable: WebhookEvent
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Budget
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" "Period" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransactionSplit
CREATE TABLE "TransactionSplit" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransactionSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Goal
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "currentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "targetDate" TIMESTAMP(3),
    "accountId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- ========================================
-- CREATE INDEXES (Migration 1)
-- ========================================

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");
CREATE INDEX "Account_userId_type_idx" ON "Account"("userId", "type");
CREATE INDEX "Account_userId_countryCode_regionGroup_idx" ON "Account"("userId", "countryCode", "regionGroup");
CREATE INDEX "Account_userId_isActive_idx" ON "Account"("userId", "isActive");
CREATE INDEX "Category_userId_type_idx" ON "Category"("userId", "type");
CREATE INDEX "Category_userId_parentId_idx" ON "Category"("userId", "parentId");
CREATE INDEX "Tag_userId_name_idx" ON "Tag"("userId", "name");
CREATE UNIQUE INDEX "Tag_userId_slug_key" ON "Tag"("userId", "slug");
CREATE INDEX "TransactionTag_tagId_idx" ON "TransactionTag"("tagId");
CREATE UNIQUE INDEX "TransactionTag_transactionId_tagId_key" ON "TransactionTag"("transactionId", "tagId");
CREATE INDEX "Transaction_accountId_postedAt_idx" ON "Transaction"("accountId", "postedAt");
CREATE INDEX "Transaction_accountId_merchant_idx" ON "Transaction"("accountId", "merchant");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_source_reviewStatus_idx" ON "Transaction"("source", "reviewStatus");
CREATE INDEX "Transaction_postedAt_idx" ON "Transaction"("postedAt");
CREATE UNIQUE INDEX "Transaction_accountId_externalId_key" ON "Transaction"("accountId", "externalId");
CREATE INDEX "FixedExpense_userId_isActive_idx" ON "FixedExpense"("userId", "isActive");
CREATE INDEX "FixedExpense_nextDueAt_idx" ON "FixedExpense"("nextDueAt");
CREATE INDEX "IncomeSource_userId_isActive_idx" ON "IncomeSource"("userId", "isActive");
CREATE INDEX "IncomeSource_nextExpectedAt_idx" ON "IncomeSource"("nextExpectedAt");
CREATE INDEX "InstallmentPlan_userId_cardAccountId_idx" ON "InstallmentPlan"("userId", "cardAccountId");
CREATE INDEX "InstallmentPlan_firstDueAt_idx" ON "InstallmentPlan"("firstDueAt");
CREATE INDEX "NetWorthSnapshot_userId_takenAt_idx" ON "NetWorthSnapshot"("userId", "takenAt");
CREATE UNIQUE INDEX "NetWorthSnapshot_userId_takenAt_key" ON "NetWorthSnapshot"("userId", "takenAt");
CREATE INDEX "Prediction_userId_createdAt_idx" ON "Prediction"("userId", "createdAt");
CREATE INDEX "DocumentUpload_userId_status_idx" ON "DocumentUpload"("userId", "status");
CREATE INDEX "DocumentUpload_uploadedAt_idx" ON "DocumentUpload"("uploadedAt");
CREATE INDEX "ExtractedLineItem_documentId_status_idx" ON "ExtractedLineItem"("documentId", "status");
CREATE INDEX "ExtractedLineItem_status_idx" ON "ExtractedLineItem"("status");
CREATE INDEX "TagRule_userId_pattern_idx" ON "TagRule"("userId", "pattern");
CREATE INDEX "TagRule_userId_active_idx" ON "TagRule"("userId", "active");
CREATE INDEX "ExchangeRate_fromCurrency_toCurrency_date_idx" ON "ExchangeRate"("fromCurrency", "toCurrency", "date");
CREATE INDEX "ExchangeRate_userId_date_idx" ON "ExchangeRate"("userId", "date");
CREATE UNIQUE INDEX "ExchangeRate_userId_fromCurrency_toCurrency_date_key" ON "ExchangeRate"("userId", "fromCurrency", "toCurrency", "date");
CREATE INDEX "ApiCredential_userId_provider_idx" ON "ApiCredential"("userId", "provider");
CREATE INDEX "WebhookEvent_processed_seenAt_idx" ON "WebhookEvent"("processed", "seenAt");
CREATE UNIQUE INDEX "Budget_userId_categoryId_startDate_key" ON "Budget"("userId", "categoryId", "startDate");
CREATE INDEX "Budget_userId_isActive_idx" ON "Budget"("userId", "isActive");
CREATE INDEX "Budget_startDate_endDate_idx" ON "Budget"("startDate", "endDate");
CREATE INDEX "TransactionSplit_transactionId_idx" ON "TransactionSplit"("transactionId");
CREATE INDEX "TransactionSplit_categoryId_idx" ON "TransactionSplit"("categoryId");
CREATE INDEX "Goal_userId_isCompleted_idx" ON "Goal"("userId", "isCompleted");
CREATE INDEX "Goal_targetDate_idx" ON "Goal"("targetDate");

-- ========================================
-- CREATE FOREIGN KEYS (Migration 1)
-- ========================================

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditCardMeta" ADD CONSTRAINT "CreditCardMeta_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionTag" ADD CONSTRAINT "TransactionTag_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionTag" ADD CONSTRAINT "TransactionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statementDocumentId_fkey" FOREIGN KEY ("statementDocumentId") REFERENCES "DocumentUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_cardAccountId_fkey" FOREIGN KEY ("cardAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetWorthSnapshot" ADD CONSTRAINT "NetWorthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentUpload" ADD CONSTRAINT "DocumentUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractedLineItem" ADD CONSTRAINT "ExtractedLineItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractedLineItem" ADD CONSTRAINT "ExtractedLineItem_suggestedCategoryId_fkey" FOREIGN KEY ("suggestedCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExtractedLineItem" ADD CONSTRAINT "ExtractedLineItem_linkedTransactionId_fkey" FOREIGN KEY ("linkedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TagRule" ADD CONSTRAINT "TagRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TagRule" ADD CONSTRAINT "TagRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ========================================
-- MIGRATION 2: Add Notifications
-- ========================================

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "actionText" TEXT,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ========================================
-- MIGRATION 3: Add Plaid Integration
-- ========================================

-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('ACTIVE', 'ERROR', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "bankConnectionId" TEXT;
ALTER TABLE "Account" ADD COLUMN "plaidAccountId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "isPending" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_itemId_key" ON "BankConnection"("itemId");
CREATE INDEX "BankConnection_userId_idx" ON "BankConnection"("userId");
CREATE INDEX "BankConnection_status_idx" ON "BankConnection"("status");

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ========================================
-- SETUP COMPLETE
-- ========================================
-- All tables, indexes, and constraints have been created
-- Your database is now ready to use
-- ========================================
