import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * The complete D1 schema. Better Auth receives the raw D1 binding, but its
 * tables are declared here so Drizzle can generate the initial schema.
 */
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  stock: integer("stock").notNull().default(0),
  cvsMergeLimit: integer("cvs_merge_limit").notNull().default(0),
  logisticsMergeLimit: integer("logistics_merge_limit").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const platforms = sqliteTable("platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/**
 * 平台商品（goodsCode 層級）與本地商品的對應。
 * (platform_code, goods_code) 唯一，代表一個平台商品最多只能綁一個本地商品；
 * 反過來一個本地商品可被多個平台商品指向，形成多對一。
 */
export const productPlatformBindings = sqliteTable("product_platform_bindings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  platformCode: text("platform_code").notNull(),
  goodsCode: text("goods_code").notNull(),
  /** 綁定當下的平台商品名稱快照，平台商品下架後仍能辨識這筆綁定。 */
  goodsName: text("goods_name"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("product_platform_bindings_platform_goods_idx").on(table.platformCode, table.goodsCode),
  index("product_platform_bindings_product_idx").on(table.productId),
]);

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: text("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  index("session_userId_idx").on(table.userId),
]);

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: text("accessTokenExpiresAt"),
  refreshTokenExpiresAt: text("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
}, (table) => [
  index("account_userId_idx").on(table.userId),
  index("account_provider_idx").on(table.providerId, table.accountId),
]);

export const verifications = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
}, (table) => [
  index("verification_identifier_idx").on(table.identifier),
]);
