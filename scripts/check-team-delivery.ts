import assert from "node:assert/strict";
import { eq, isNull } from "drizzle-orm";
import { db } from "../lib/db";
import { teamNotifications, telegramDeliveries } from "../lib/db/schema";
import { deliverTelegramBatch } from "../lib/notifications/telegram";
async function main() {
  const existing = await db
    .select({ id: telegramDeliveries.id })
    .from(telegramDeliveries)
    .where(isNull(telegramDeliveries.deliveredAt));
  if (existing.length)
    throw new Error(
      "Delivery test requires an empty pending queue so real jobs are never touched.",
    );
  const originalFetch = globalThis.fetch;
  const env = {
    enabled: process.env.TELEGRAM_ENABLED,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
  };
  let id: string | undefined;
  try {
    process.env.TELEGRAM_ENABLED = "false";
    assert.equal((await deliverTelegramBatch()).configured, false);
    process.env.TELEGRAM_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "test-token-no-network";
    process.env.TELEGRAM_CHAT_ID = "test-chat";
    const [event] = await db
      .insert(teamNotifications)
      .values({
        audience: "transfer",
        title: "QA Telegram check",
        message: "Synthetic data only",
        href: "/transfers",
      })
      .returning();
    id = event.id;
    const [job] = await db
      .insert(telegramDeliveries)
      .values({ notificationId: id })
      .returning();
    globalThis.fetch = async () =>
      Response.json(
        { ok: false, parameters: { retry_after: 60 } },
        { status: 429 },
      );
    assert.equal((await deliverTelegramBatch()).delivered, 0);
    const [retried] = await db
      .select()
      .from(telegramDeliveries)
      .where(eq(telegramDeliveries.id, job.id));
    assert.equal(retried.attempts, 1);
    assert.equal(retried.deliveredAt, null);
    assert.equal(retried.lastError, "Telegram HTTP 429");
    assert.ok(retried.availableAt.getTime() > Date.now() + 50000);
    await db
      .update(telegramDeliveries)
      .set({ availableAt: new Date(0) })
      .where(eq(telegramDeliveries.id, job.id));
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.chat_id, "test-chat");
      assert.ok(body.text.includes("Synthetic data only"));
      return Response.json({ ok: true, result: { message_id: 1 } });
    };
    assert.equal((await deliverTelegramBatch()).delivered, 1);
    const [delivered] = await db
      .select()
      .from(telegramDeliveries)
      .where(eq(telegramDeliveries.id, job.id));
    assert.equal(delivered.attempts, 2);
    assert.ok(delivered.deliveredAt);
    assert.equal(delivered.lastError, null);
    console.log(
      "Telegram disabled mode, retry and delivery checks passed. API mocked; no external messages sent.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.TELEGRAM_ENABLED = env.enabled;
    process.env.TELEGRAM_BOT_TOKEN = env.token;
    process.env.TELEGRAM_CHAT_ID = env.chat;
    if (id)
      await db.delete(teamNotifications).where(eq(teamNotifications.id, id));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
