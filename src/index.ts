import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { zValidator } from "@hono/zod-validator";
import * as z from "zod";
import { and, eq, isNull, or } from "drizzle-orm";
import { TronWeb } from "tronweb";
import {
  contractAddress,
  notifyTaskIntervalMs,
  paymentSessionExpiresMs,
  paymentSessionStatus,
  paymentSessionTaskIntervalMs,
  tronGridBaseUrl,
  version,
} from "./constants";
import { db } from "./db";
import { paymentSessionTable, walletTable } from "./db/schema";
import { auth } from "./middleware";
import { notifyTask, paymentSessionTask } from "./task";
import { getTrc20Balance, sendTrc20Transaction } from "./utils";

type WalletCollectionResult = {
  address: string;
  status: "collected" | "no.balance" | "error";
  amount?: string;
  txId?: string;
  error?: "collection.failed";
};

const app = new Hono();

showRoutes(app, {
  verbose: true,
});

// Health check
app.get("/", (c) => {
  return c.json({
    version,
    tronGridBaseUrl,
    contractAddress,
  });
});

// Payment session create
app.use("/paymentSession/*", auth);
app.post(
  "/paymentSession/create",
  zValidator(
    "json",
    z.object({
      metadata: z.string().nullable().optional(),
      notifyUrl: z.url(),
    }),
  ),
  async (c) => {
    const { metadata, notifyUrl } = c.req.valid("json");

    const {
      publicKey,
      privateKey,
      address: { base58: address },
    } = await TronWeb.createAccount();

    const [newWallet] = await db
      .insert(walletTable)
      .values({
        publicKey,
        privateKey,
        address,
      })
      .returning();

    if (!newWallet) {
      return c.json(
        {
          code: "wallet.create.failed",
        },
        500,
      );
    }

    const [newPaymentSession] = await db
      .insert(paymentSessionTable)
      .values({
        metadata,
        notifyUrl,
        address,
        status: paymentSessionStatus.pending,
        expiresAt: Date.now() + paymentSessionExpiresMs,
      })
      .returning();

    if (!newPaymentSession) {
      return c.json(
        {
          code: "payment.session.create.failed",
        },
        500,
      );
    }

    return c.json({
      paymentSessionId: newPaymentSession.id,
      address: newPaymentSession.address,
      expiresAt: newPaymentSession.expiresAt,
    });
  },
);

// Payment session detail
app.post(
  "/paymentSession/detail",
  zValidator(
    "json",
    z.object({
      paymentSessionId: z.string().min(1),
    }),
  ),
  async (c) => {
    const { paymentSessionId } = c.req.valid("json");

    const [paymentSession] = await db
      .select()
      .from(paymentSessionTable)
      .where(eq(paymentSessionTable.id, paymentSessionId));

    if (!paymentSession) {
      return c.json(
        {
          code: "payment.session.not.found",
        },
        404,
      );
    }

    return c.json(paymentSession);
  },
);

// Wallet collection
app.use("/wallet/*", auth);
app.post(
  "/wallet/collection",
  zValidator(
    "json",
    z.object({
      toAddress: z.string(),
      feePayerPrivateKey: z.string(),
    }),
  ),
  async (c) => {
    const { toAddress, feePayerPrivateKey } = c.req.valid("json");

    const collectibleWalletSessions = await db
      .select({
        session: paymentSessionTable,
        wallet: walletTable,
      })
      .from(paymentSessionTable)
      .innerJoin(
        walletTable,
        eq(walletTable.address, paymentSessionTable.address),
      )
      .where(
        and(
          eq(paymentSessionTable.status, paymentSessionStatus.paid),
          or(
            eq(paymentSessionTable.collected, 0),
            isNull(paymentSessionTable.collected),
          ),
        ),
      );

    const collectionResults: WalletCollectionResult[] = [];

    for (const collectibleWalletSession of collectibleWalletSessions) {
      const { session, wallet } = collectibleWalletSession;

      const collectionResult: WalletCollectionResult = {
        address: wallet.address,
        status: "no.balance",
      };
      console.dir({ collectionResult });

      try {
        const walletTokenBalance = await getTrc20Balance({
          walletAddress: wallet.address,
          contractAddress,
        });
        console.dir({ walletTokenBalance });

        if (walletTokenBalance === "0") {
          collectionResults.push(collectionResult);
          continue;
        }

        const collectionTxId = await sendTrc20Transaction({
          privateKey: wallet.privateKey,
          feePayerPrivateKey,
          toAddress,
          contractAddress,
          amount: walletTokenBalance,
        });

        await db
          .update(paymentSessionTable)
          .set({ collected: 1, collectedAt: Date.now() })
          .where(eq(paymentSessionTable.id, session.id));

        collectionResult.status = "collected";
        collectionResult.amount = walletTokenBalance;
        collectionResult.txId = collectionTxId;
      } catch (error) {
        console.error(
          `Failed to collect TRC20 from wallet ${wallet.address}`,
          error,
        );
        collectionResult.status = "error";
        collectionResult.error = "collection.failed";
      }

      collectionResults.push(collectionResult);
    }

    return c.json({
      collectionResults,
    });
  },
);

// Payment session task
if (globalThis.paymentSessionInterval) {
  clearInterval(globalThis.paymentSessionInterval);
}
globalThis.paymentSessionInterval = setInterval(async () => {
  try {
    await paymentSessionTask();
  } catch (error) {
    console.error(error);
  }
}, paymentSessionTaskIntervalMs);

// Notify task
if (globalThis.notifyInterval) {
  clearInterval(globalThis.notifyInterval);
}
globalThis.notifyInterval = setInterval(async () => {
  try {
    await notifyTask();
  } catch (error) {
    console.error(error);
  }
}, notifyTaskIntervalMs);

export default {
  fetch: app.fetch,
  development: process.env.NODE_ENV !== "production",
  port: process.env.PORT || 3000,
};
