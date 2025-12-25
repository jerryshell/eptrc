import { db } from "./db";
import { paymentSessionTable, notifyTable } from "./db/schema";
import {
  notifyStatus,
  paymentSessionStatus,
  contractAddress,
  webhookKey,
} from "./constants";
import { fetchTronInTxList, sendEptrcRequest } from "./utils";
import { eq, lt, and, asc, gte } from "drizzle-orm";

const NOTIFY_MAX_RETRY_COUNT = 10;

type PaymentSessionForNotify = {
  id: string;
  notifyUrl: string;
  metadata: string | null;
};

const buildPaymentSessionNotify = ({
  session,
  event,
  payloadData,
}: {
  session: PaymentSessionForNotify;
  event: "payment.session.timeout" | "payment.session.paid";
  payloadData: Record<string, unknown>;
}) => {
  const requestBody = JSON.stringify({
    event,
    data: payloadData,
  });

  return {
    paymentSessionId: session.id,
    notifyUrl: session.notifyUrl,
    requestBody,
    status: notifyStatus.pending,
    retryCount: 0,
    maxRetryCount: NOTIFY_MAX_RETRY_COUNT,
    lastRetryAt: null,
  };
};

export const paymentSessionTask = async () => {
  const now = Date.now();

  const expiredPendingSessions = await db
    .select()
    .from(paymentSessionTable)
    .where(
      and(
        eq(paymentSessionTable.status, paymentSessionStatus.pending),
        lt(paymentSessionTable.expiresAt, now),
      ),
    );

  for (const expiredPendingSession of expiredPendingSessions) {
    await db
      .update(paymentSessionTable)
      .set({ status: paymentSessionStatus.timeout })
      .where(eq(paymentSessionTable.id, expiredPendingSession.id));

    const timeoutNotify = buildPaymentSessionNotify({
      session: expiredPendingSession,
      event: "payment.session.timeout",
      payloadData: {
        paymentSessionId: expiredPendingSession.id,
        metadata: expiredPendingSession.metadata,
      },
    });
    await db.insert(notifyTable).values(timeoutNotify);
  }

  const [pendingSessionToCheck] = await db
    .select()
    .from(paymentSessionTable)
    .where(
      and(
        eq(paymentSessionTable.status, paymentSessionStatus.pending),
        gte(paymentSessionTable.expiresAt, now),
      ),
    )
    .orderBy(asc(paymentSessionTable.lastCheckedAt))
    .limit(1);

  if (!pendingSessionToCheck) {
    return;
  }

  const incomingTransferList = await fetchTronInTxList({
    walletAddress: pendingSessionToCheck.address,
    contractAddress,
  });

  if (!incomingTransferList || incomingTransferList.length === 0) {
    await db
      .update(paymentSessionTable)
      .set({ lastCheckedAt: now })
      .where(eq(paymentSessionTable.id, pendingSessionToCheck.id));
    return;
  }

  const latestIncomingTransfer = incomingTransferList[0];
  console.dir({ latestIncomingTransfer });

  const [paidSession] = await db
    .update(paymentSessionTable)
    .set({
      amount: latestIncomingTransfer.value,
      status: paymentSessionStatus.paid,
      blockchainTxId: latestIncomingTransfer.transaction_id,
      paidAt: now,
    })
    .where(eq(paymentSessionTable.id, pendingSessionToCheck.id))
    .returning();

  const paidNotify = buildPaymentSessionNotify({
    session: paidSession,
    event: "payment.session.paid",
    payloadData: {
      paymentSessionId: paidSession.id,
      metadata: paidSession.metadata,
      amount: paidSession.amount,
    },
  });

  await db.insert(notifyTable).values(paidNotify);
};

const getRetryBackoffMs = (retryCount: number) => 5000 * retryCount;

const isNotifyDueForRetry = (
  pendingNotify: { retryCount: number; lastRetryAt: number | null },
  now: number,
) => {
  if (pendingNotify.retryCount === 0) {
    return true;
  }

  if (!pendingNotify.lastRetryAt) {
    return true;
  }

  return (
    pendingNotify.lastRetryAt + getRetryBackoffMs(pendingNotify.retryCount) <
    now
  );
};

const markNotifyRetried = async (pendingNotify: {
  id: string;
  retryCount: number;
  maxRetryCount: number;
}) => {
  const newRetryCount = pendingNotify.retryCount + 1;
  const newStatus =
    newRetryCount >= pendingNotify.maxRetryCount
      ? notifyStatus.error
      : notifyStatus.pending;
  const lastRetryAt = Date.now();

  await db
    .update(notifyTable)
    .set({
      retryCount: newRetryCount,
      status: newStatus,
      lastRetryAt,
    })
    .where(eq(notifyTable.id, pendingNotify.id));
};

export const notifyTask = async () => {
  const now = Date.now();

  const pendingNotifyList = await db
    .select()
    .from(notifyTable)
    .where(eq(notifyTable.status, notifyStatus.pending));

  for (const pendingNotify of pendingNotifyList.filter((item) =>
    isNotifyDueForRetry(item, now),
  )) {
    try {
      const response = await sendEptrcRequest({
        url: pendingNotify.notifyUrl,
        requestBody: pendingNotify.requestBody,
        requestApiKey: webhookKey,
      });

      if (response.status === 200) {
        await db
          .update(notifyTable)
          .set({ status: notifyStatus.success, lastRetryAt: Date.now() })
          .where(eq(notifyTable.id, pendingNotify.id));
      } else {
        await markNotifyRetried(pendingNotify);
      }
    } catch (error) {
      await markNotifyRetried(pendingNotify);
    }
  }
};
