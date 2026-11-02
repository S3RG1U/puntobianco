This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

You need Node.js 20.9 or newer, pnpm (`corepack enable pnpm`) and a running PostgreSQL server with an empty database.

Install the dependencies:

```bash
pnpm install
```

Copy the example environment file, then in `.env` set `DATABASE_URL` to point at your database and `BETTER_AUTH_SECRET` to the output of `openssl rand -base64 32`:

```bash
cp .env.example .env
```

Apply the database migrations:

```bash
pnpm db:migrate
```

Create the first admin (`admin@puntobianco.test`), who signs in with the password from `SEED_PASSWORD` in `.env` and adds everyone else from Staff accounts:

```bash
pnpm db:seed
```

Run the development server:

```bash
pnpm dev
```

To check the database connection, open [http://localhost:3000/api/health](http://localhost:3000/api/health). It returns `{"status":"ok"}` when the connection works.

## Roles and permissions

Authentication and access control use [Better Auth](https://www.better-auth.com) with its admin plugin. Roles and what they can do are defined in `lib/auth/permissions.ts`. Public sign-up is turned off, so accounts are created by an administrator.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project self-hosts Muller with `next/font/local` across body text, headings, charts, and notifications. Font files are in `public/fonts/muller`, using the complete Regular (400) font. Bold text is synthesized by the browser; the demo Thin/ExtraBold fonts are not loaded because their digit glyphs contain DEMO marks. The original Thin/ExtraBold license is included alongside the fonts.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Patient registration schema: [model and field mapping](docs/patient-registration.md).

## Patient and accommodation forms

The interface is in Romanian by default; the RO/EN switch in the header stores the choice in a `locale` cookie, so URLs have no language prefix. Add text to both `lib/i18n/ro.ts` and `lib/i18n/en.ts`. Patient data, the seeded treatment catalogue (`pnpm db:seed`) and stored team notifications stay in the language they were written in.

Use Patients → Register patient to enter a stay, treatment, optional companion, accommodation and transfer requests. A companion receiving treatment has their own complete visit details. Open a patient name in the list to review the saved registration and linked companions; treatment, accommodation and transfer details follow the viewer’s read permissions. At least one active staff member must have the Treatment coordinator role. Use Edit on the patient list or a registration to change its details. An assigned apartment is rechecked against the new dates, and changing the apartment type releases it. Each section only changes for roles allowed to update it: treatment for administrators and coordinators, transfers for administrators and back office, accommodation for administrators. The names of companions who only accompany are edited on the same form.

Use Accommodation to add apartments and assign matching apartments to patient requests. Overlapping assignments and complimentary days outside the visit length are rejected.

Run form validation checks with `node --import tsx --test scripts/patient-registration.test.ts`.

Team workflow, live web notifications, driver calendar and Telegram setup: [guide](docs/team-workflows.md).
