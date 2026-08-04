-- Better Auth 核心資料表 (user / session / account / verification)
CREATE TABLE IF NOT EXISTS "user" (
  "id"            text NOT NULL PRIMARY KEY,
  "name"          text NOT NULL,
  "email"         text NOT NULL UNIQUE,
  "emailVerified" integer NOT NULL,
  "image"         text,
  "createdAt"     date NOT NULL,
  "updatedAt"     date NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"        text NOT NULL PRIMARY KEY,
  "expiresAt" date NOT NULL,
  "token"     text NOT NULL UNIQUE,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId"    text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                    text NOT NULL PRIMARY KEY,
  "accountId"             text NOT NULL,
  "providerId"            text NOT NULL,
  "userId"                text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  date,
  "refreshTokenExpiresAt" date,
  "scope"                 text,
  "password"              text,
  "createdAt"             date NOT NULL,
  "updatedAt"             date NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL,
  "value"      text NOT NULL,
  "expiresAt"  date NOT NULL,
  "createdAt"  date NOT NULL,
  "updatedAt"  date NOT NULL
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- 以下不是 CLI 產生的，是本專案加的：每次 Google 登入都要用
-- (providerId, accountId) 找既有帳號，補一個複合索引。
CREATE INDEX IF NOT EXISTS "account_provider_idx" ON "account" ("providerId", "accountId");
