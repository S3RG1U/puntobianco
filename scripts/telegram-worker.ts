import { deliverTelegramBatch } from "../lib/notifications/telegram";
const once = process.argv.includes("--once");
async function main() {
  do {
    const result = await deliverTelegramBatch();
    if (!result.configured) {
      console.log(
        "Telegram is disabled or not configured. Set TELEGRAM_ENABLED, TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
      );
      return;
    }
    if (result.delivered)
      console.log(`Delivered ${result.delivered} Telegram alerts.`);
    if (!once) await new Promise((resolve) => setTimeout(resolve, 10000));
  } while (!once);
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      "Telegram worker stopped. Check the database connection and configuration.",
    );
    process.exit(1);
  });
