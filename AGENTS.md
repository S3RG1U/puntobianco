<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI components

Build every interface with shadcn/ui, and load the `shadcn` skill before writing or changing UI.

- Check `components/ui` and the `@shadcn` registry first, and add what is missing with the CLI (`pnpm dlx shadcn@latest add <component>`).
- Don't use browser-native pickers or hand-rolled controls where a shadcn component fits. Dates use `Popover` + `Calendar`, times use `TimeSelect`, searchable lists use `Combobox`.
- Follow the skill's rules for composition, forms, icons and semantic colors.
