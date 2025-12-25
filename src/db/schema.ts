import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

const commonColumns = {
  id: text()
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  createdAt: integer().$defaultFn(() => Date.now()),
  updatedAt: integer().$onUpdateFn(() => Date.now()),
};

export const paymentSessionTable = sqliteTable("payment_session", {
  ...commonColumns,
  metadata: text(),
  amount: text(),
  notifyUrl: text(),
  address: text(),
  status: text(),
  collected: integer().$defaultFn(() => 0),
  blockchainTxId: text(),
  paidAt: integer(),
  expiresAt: integer(),
  lastCheckedAt: integer(),
  collectedAt: integer(),
});

export const walletTable = sqliteTable("wallet", {
  ...commonColumns,
  publicKey: text(),
  privateKey: text(),
  address: text(),
});

export const notifyTable = sqliteTable("notify", {
  ...commonColumns,
  paymentSessionId: text(),
  notifyUrl: text(),
  requestPath: text(),
  requestBody: text(),
  status: text(),
  retryCount: integer().$defaultFn(() => 0),
  maxRetryCount: integer().$defaultFn(() => 10),
  lastRetryAt: integer(),
});
