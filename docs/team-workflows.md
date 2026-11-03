# Team workflow and notifications

## Back office

`/back-office` lists active cases by arrival time, earliest first. New registrations start as **Neprelucrat** (amber). **Început** claims the case, records the responsible staff member and start time, and shows blue. **Finalizat** records completion and moves the green case to the completed list. Claims are serialized in the database; another staff member cannot claim the same case or complete someone else's case. Administrators can complete an in-progress case. Back-office and admin roles may update; quality control may read.

## Accommodation

Requests start as amber **Neprelucrat**. Assign an apartment through Manage and save to mark it green **Rezervat**. Removing its assignment returns it to Neprelucrat. Existing apartment/type and overlap validation still applies. Unprocessed requests are listed before reserved requests, ordered by arrival.

## Drivers

`/transfers` opens on the month view and also has week and day views in Europe/Chisinau time. The dashboard shows the same transfers from the start of the current week, for six weeks. Arrival events are blue and departure events green. A round trip schedules both; a one-way request has an explicit arrival/departure choice. Previously registered one-way transfers default to arrival. Events show the patient and accompanying people. Drivers receive logistics only, not treatment notes. From a transfer's day onwards, roles that can update transfers can mark it picked up in the week or day view, and press again to undo a mistake. Treated companions sharing that transfer are marked too.

Each visit has a history, opened from **Istoric** in Back office or at the bottom of the patient page: registration, edits, back office steps, apartment changes and pickups, with who did them. Each viewer only sees the events their role can read. Events from before the history existed were reconstructed from saved dates, without edits, released apartments or (for registrations and completed cases) the person.

## Web notifications and synchronization

Registrations publish durable notifications in the same transaction as the visit and service requests. Case changes and accommodation assignments publish update events. Messages are filtered on the server by the recipient's read permissions. Read markers belong to individual users, not the whole team.

The bell provides a persistent inbox. While the app is open, the React provider checks for updates every 10 seconds and refreshes changed pages and the calendar. It shows connection status and retries after connection loss. Browser alerts are optional: press **Enable browser alerts** to request permission. They require HTTPS (or localhost) and an open app tab. This is not background Web Push after all tabs are closed. Unread in-app notifications remain available when staff return.

## Telegram setup (when the group is ready)

Telegram is disabled by default and no messages are sent without configuration.

1. Create a bot with Telegram's BotFather and add it to the group. Allow the bot to send messages. Obtain the group's chat ID (group IDs are generally negative; supergroup IDs generally start with `-100`). The Bot API's `getUpdates` can provide `message.chat.id` after a message is sent to the bot in the group.
2. Set server-only values in `.env`:

   ```dotenv
   TELEGRAM_ENABLED=true
   TELEGRAM_BOT_TOKEN=your-bot-token
   TELEGRAM_CHAT_ID=your-group-chat-id
   APP_URL=https://your-clinic-app.example
   ```

3. Restart the app so new registrations enqueue Telegram deliveries. Start the delivery worker as a separate supervised process:

   ```bash
   pnpm notifications:worker
   ```

   For a single delivery pass: `pnpm notifications:worker --once`.

The worker claims queued messages with leases, honors Telegram retry-after responses, and retries up to eight attempts with increasing delays. It never delays the patient's registration. Failed jobs remain in `telegram_deliveries` with a sanitized error for investigation. Run the worker under your deployment's process supervisor so it restarts after crashes. Delivery is at least once: a crash after Telegram accepts a message but before the database records success may cause a duplicate.

Registrations, changed stay dates, rescheduled transfers and accommodation changes made while `TELEGRAM_ENABLED=true` enqueue external messages; enabling Telegram later does not send older events. All configured team alerts go to the configured group. Messages include patient names and logistical dates but never treatment text. Links require the normal app sign-in and role checks. Bot credentials stay on the server; do not commit `.env`.

Official API: https://core.telegram.org/bots/api#sendmessage

## Verification

- `node --import tsx --test scripts/patient-registration.test.ts scripts/team-workflows.test.ts`
- `node --conditions=react-server --env-file=.env --import tsx scripts/check-team-delivery.ts` checks disabled mode, retry-after, and successful delivery with a mocked API. It sends no messages and requires an empty pending delivery queue so real jobs cannot be affected.

## Driver schedule and completion

Drivers open a day and select View transfer to see pickup/drop-off and assigned apartment information. Unknown endpoints are explicitly unconfirmed. Change schedule or route opens date/time and location controls; every change requires a reason. These plans are separate from patient stays and reservation dates, and effective planned times drive the calendar and dashboard. Shared treatment companions move together. The mobile detail panel keeps Save or Complete within reach while its content scrolls. Completion is blocked until the scheduled time, and completed transfers can be reopened. Schedule changes, completion and reopening notify drivers and back office, with a per-leg audit history and optimistic concurrency checks.

Verification also includes `node --conditions=react-server --import tsx --test scripts/transfer-plan.test.ts`.
