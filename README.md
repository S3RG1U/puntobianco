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

This project self-hosts Muller with `next/font/local` across body text, headings, charts, and notifications. Font files are in `public/fonts/muller`, with Thin (100), Regular (400), and ExtraBold (800) weights. Intermediate weights use browser font matching. The original Thin/ExtraBold license is included alongside the fonts.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
