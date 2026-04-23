# shado-auth-cli

Add Better Auth to a Next.js app with a single command.

## Usage

Run in any existing Next.js project:

```bash
npx shado-auth init
```

Scaffold auth UI pages/components too:

```bash
npx shado-auth init --auth-ui
```

Add social providers:

```bash
npx shado-auth init --provider google
npx shado-auth init --provider github
npx shado-auth init --provider google github
```

Run guided setup:

```bash
npx shado-auth init --interactive
```

Validate your setup:

```bash
npx shado-auth doctor
```

## What it scaffolds

- `lib/auth.ts`
- `lib/auth-client.ts`
- `app/api/auth/[...all]/route.ts`
- `db/index.ts`
- `db/schema/index.ts`
- `auth-schema.ts`
- `drizzle.config.ts`
- `.env.example`

It also installs required dependencies and updates scripts in the target `package.json`.

## Local development

```bash
npm install
npm run build:cli
node dist/cli/index.js init --path /path/to/next-app
```

## Publish to npm

1. Ensure your npm account is logged in:
   ```bash
   npm login
   ```
2. Bump version:
   ```bash
   npm version patch
   ```
3. Publish:
   ```bash
   npm publish --access public
   ```
