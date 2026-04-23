#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import pc from "picocolors";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
type CheckStatus = "pass" | "warn" | "fail";
type Provider = "google" | "github";

const AUTH_FILES: Record<string, string> = {
  "lib/auth-client.ts": `import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
`,
  "app/api/auth/[...all]/route.ts": `import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
`,
  "db/index.ts": `import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
`,
  "db/schema/index.ts": `export * from "../../auth-schema";
`,
  "auth-schema.ts": `import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
`,
  "drizzle.config.ts": `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./auth-schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`,
};

const AUTH_UI_FILES: Record<string, string> = {
  "app/(auth)/sign-in/page.tsx": `import SignInForm from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <SignInForm />
    </main>
  );
}
`,
  "app/(auth)/sign-up/page.tsx": `import SignUpForm from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <SignUpForm />
    </main>
  );
}
`,
  "components/auth/signin-form.tsx": `"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message ?? "Unable to sign in.");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <input
        required
        name="email"
        type="email"
        placeholder="Email"
        className="w-full rounded-md border px-3 py-2"
      />
      <input
        required
        name="password"
        type="password"
        placeholder="Password"
        className="w-full rounded-md border px-3 py-2"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={loading}
        className="w-full rounded-md bg-black px-3 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-sm text-gray-600">
        Need an account?{" "}
        <Link href="/sign-up" className="underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
`,
  "components/auth/signup-form.tsx": `"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message ?? "Unable to sign up.");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border p-6">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <input
        required
        name="name"
        placeholder="Name"
        className="w-full rounded-md border px-3 py-2"
      />
      <input
        required
        name="email"
        type="email"
        placeholder="Email"
        className="w-full rounded-md border px-3 py-2"
      />
      <input
        required
        name="password"
        type="password"
        placeholder="Password"
        className="w-full rounded-md border px-3 py-2"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={loading}
        className="w-full rounded-md bg-black px-3 py-2 text-white disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create account"}
      </button>
      <p className="text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
`,
};

const program = new Command();

program
  .name("shado-auth")
  .description("Add Better Auth to a Next.js project in one command")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold auth into an existing Next.js app")
  .option("-p, --path <path>", "Path to target Next.js project", ".")
  .option("--pm <manager>", "Package manager (npm|pnpm|yarn|bun)")
  .option(
    "--provider <provider...>",
    "Optional social providers: google github",
    [],
  )
  .option("--auth-ui", "Scaffold basic sign-in and sign-up pages", false)
  .option("-i, --interactive", "Prompt for setup options", false)
  .option("-f, --force", "Overwrite existing files", false)
  .action(async (options) => {
    const targetDir = resolve(process.cwd(), options.path as string);
    const detectedPm = detectPackageManager(targetDir);
    let pm = (options.pm as PackageManager | undefined) ?? detectedPm;
    let providers = parseProviders(options.provider as string[] | undefined);
    let shouldScaffoldUi = Boolean(options.authUi);
    const interactive = Boolean(options.interactive);

    if (interactive) {
      const prompted = await promptInitOptions(detectedPm, providers, shouldScaffoldUi);
      pm = prompted.pm;
      providers = prompted.providers;
      shouldScaffoldUi = prompted.authUi;
    }

    if (!isNextProject(targetDir)) {
      console.error(pc.red("This does not look like a Next.js project."));
      process.exit(1);
    }

    scaffoldFiles(targetDir, buildAuthFiles(providers), Boolean(options.force));
    if (shouldScaffoldUi) {
      scaffoldFiles(targetDir, AUTH_UI_FILES, Boolean(options.force));
    }
    installDependencies(targetDir, pm);
    updateTargetPackageJson(targetDir);

    console.log(pc.green("Authentication scaffolded successfully."));
    console.log(
      pc.cyan(
        "Next steps: copy .env.example to .env.local, run a migration, then start your app.",
      ),
    );
  });

program
  .command("doctor")
  .description("Validate auth setup in a Next.js project")
  .option("-p, --path <path>", "Path to target Next.js project", ".")
  .action((options) => {
    const targetDir = resolve(process.cwd(), options.path as string);
    const checks = runDoctorChecks(targetDir);

    for (const check of checks) {
      const icon = check.status === "pass" ? "✔" : check.status === "warn" ? "!" : "✖";
      const color =
        check.status === "pass" ? pc.green : check.status === "warn" ? pc.yellow : pc.red;
      console.log(color(`${icon} ${check.name}: ${check.message}`));
    }

    const hasFailure = checks.some((check) => check.status === "fail");
    if (hasFailure) {
      process.exit(1);
    }
  });

program.parse();

function isNextProject(targetDir: string): boolean {
  const pkgPath = join(targetDir, "package.json");
  if (!existsSync(pkgPath)) return false;

  try {
    const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    return Boolean(parsed.dependencies?.next || parsed.devDependencies?.next);
  } catch {
    return false;
  }
}

function scaffoldFiles(
  targetDir: string,
  fileMap: Record<string, string>,
  force: boolean,
): void {
  for (const [relativePath, content] of Object.entries(fileMap)) {
    const outputPath = join(targetDir, relativePath);

    if (!force && existsSync(outputPath)) {
      console.log(pc.yellow(`Skipped existing file: ${relativePath}`));
      continue;
    }

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf8");
    console.log(pc.gray(`Created ${relativePath}`));
  }
}

function installDependencies(targetDir: string, pm: PackageManager): void {
  const runtimeDeps = ["better-auth", "@neondatabase/serverless", "drizzle-orm", "dotenv"];
  const devDeps = ["drizzle-kit"];

  runInstall(targetDir, pm, runtimeDeps, false);
  runInstall(targetDir, pm, devDeps, true);
}

function runInstall(
  cwd: string,
  pm: PackageManager,
  dependencies: string[],
  dev: boolean,
): void {
  const args =
    pm === "npm"
      ? ["install", ...(dev ? ["-D"] : []), ...dependencies]
      : pm === "yarn"
        ? ["add", ...(dev ? ["-D"] : []), ...dependencies]
        : pm === "pnpm"
          ? ["add", ...(dev ? ["-D"] : []), ...dependencies]
          : ["add", ...(dev ? ["-d"] : []), ...dependencies];

  const result = spawnSync(pm, args, { cwd, stdio: "inherit", shell: true });

  if (result.status !== 0) {
    console.error(pc.red(`Dependency installation failed with ${pm}.`));
    process.exit(result.status ?? 1);
  }
}

function updateTargetPackageJson(targetDir: string): void {
  const pkgPath = join(targetDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    scripts?: Record<string, string>;
  };

  pkg.scripts = pkg.scripts ?? {};
  pkg.scripts["auth:generate"] = "npx @better-auth/cli generate";
  pkg.scripts["db:push"] = "npx drizzle-kit push";

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function parseProviders(input: string[] | undefined): Provider[] {
  if (!input?.length) return [];

  const raw = input
    .flatMap((item) => item.split(","))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(raw)];
  const invalid = unique.filter((provider) => provider !== "google" && provider !== "github");
  if (invalid.length) {
    console.error(
      pc.red(`Unsupported provider(s): ${invalid.join(", ")}. Use google and/or github.`),
    );
    process.exit(1);
  }

  return unique as Provider[];
}

async function promptInitOptions(
  defaultPm: PackageManager,
  defaultProviders: Provider[],
  defaultAuthUi: boolean,
): Promise<{ pm: PackageManager; providers: Provider[]; authUi: boolean }> {
  const rl = createInterface({ input, output });

  try {
    const pmAnswer = (
      await rl.question(
        `Package manager [npm|pnpm|yarn|bun] (default: ${defaultPm}): `,
      )
    )
      .trim()
      .toLowerCase();
    const pm = isPackageManager(pmAnswer) ? pmAnswer : defaultPm;

    const providersDefault = defaultProviders.join(",");
    const providerAnswer = (
      await rl.question(
        `Providers [google,github] comma-separated (default: ${providersDefault || "none"}): `,
      )
    ).trim();
    const providers =
      providerAnswer.length > 0
        ? parseProviders([providerAnswer])
        : defaultProviders;

    const uiAnswer = (
      await rl.question(
        `Scaffold auth UI pages? [y/N] (default: ${defaultAuthUi ? "y" : "n"}): `,
      )
    )
      .trim()
      .toLowerCase();
    const authUi =
      uiAnswer.length > 0
        ? uiAnswer === "y" || uiAnswer === "yes"
        : defaultAuthUi;

    return { pm, providers, authUi };
  } finally {
    rl.close();
  }
}

function isPackageManager(value: string): value is PackageManager {
  return value === "npm" || value === "pnpm" || value === "yarn" || value === "bun";
}

function buildAuthFiles(providers: Provider[]): Record<string, string> {
  return {
    ...AUTH_FILES,
    "lib/auth.ts": buildAuthServerContent(providers),
    ".env.example": buildEnvExampleContent(providers),
  };
}

function buildAuthServerContent(providers: Provider[]): string {
  const socialProviders = providers.length
    ? `  socialProviders: {
${providers
  .map((provider) =>
    provider === "google"
      ? `    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },`
      : `    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },`,
  )
  .join("\n")}
  },
`
    : "";

  return `import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
${socialProviders}  plugins: [nextCookies()],
});
`;
}

function buildEnvExampleContent(providers: Provider[]): string {
  const lines = [
    "BETTER_AUTH_SECRET=replace-with-a-long-random-string",
    "BETTER_AUTH_URL=http://localhost:3000",
    "DATABASE_URL=postgres://username:password@localhost:5432/your_db",
  ];

  if (providers.includes("google")) {
    lines.push("GOOGLE_CLIENT_ID=your-google-client-id");
    lines.push("GOOGLE_CLIENT_SECRET=your-google-client-secret");
  }

  if (providers.includes("github")) {
    lines.push("GITHUB_CLIENT_ID=your-github-client-id");
    lines.push("GITHUB_CLIENT_SECRET=your-github-client-secret");
  }

  return `${lines.join("\n")}\n`;
}

function runDoctorChecks(targetDir: string): Array<{
  name: string;
  status: CheckStatus;
  message: string;
}> {
  const checks: Array<{ name: string; status: CheckStatus; message: string }> = [];

  if (!isNextProject(targetDir)) {
    checks.push({
      name: "Next.js project",
      status: "fail",
      message: "Next.js dependency not found in package.json.",
    });
    return checks;
  }

  checks.push({ name: "Next.js project", status: "pass", message: "Detected." });

  const requiredFiles = [
    "lib/auth.ts",
    "lib/auth-client.ts",
    "app/api/auth/[...all]/route.ts",
    "db/index.ts",
    "auth-schema.ts",
    "drizzle.config.ts",
  ];

  for (const relativePath of requiredFiles) {
    const exists = existsSync(join(targetDir, relativePath));
    checks.push({
      name: `File ${relativePath}`,
      status: exists ? "pass" : "fail",
      message: exists ? "Present." : "Missing. Run `shado-auth init`.",
    });
  }

  const envPath = join(targetDir, ".env.local");
  if (!existsSync(envPath)) {
    checks.push({
      name: ".env.local",
      status: "warn",
      message: "Missing. Create it from .env.example.",
    });
  } else {
    const env = readFileSync(envPath, "utf8");
    const requiredKeys = ["BETTER_AUTH_SECRET=", "BETTER_AUTH_URL=", "DATABASE_URL="];
    const authServerPath = join(targetDir, "lib/auth.ts");
    const authServerContent = existsSync(authServerPath) ? readFileSync(authServerPath, "utf8") : "";
    if (authServerContent.includes("GOOGLE_CLIENT_ID")) {
      requiredKeys.push("GOOGLE_CLIENT_ID=", "GOOGLE_CLIENT_SECRET=");
    }
    if (authServerContent.includes("GITHUB_CLIENT_ID")) {
      requiredKeys.push("GITHUB_CLIENT_ID=", "GITHUB_CLIENT_SECRET=");
    }
    const missing = requiredKeys.filter((key) => !env.includes(key));
    checks.push({
      name: "Environment variables",
      status: missing.length ? "warn" : "pass",
      message: missing.length
        ? `Missing keys: ${missing.join(", ")}`
        : "Required auth keys found.",
    });
  }

  checks.push({
    name: "Recommended next step",
    status: "warn",
    message: "Run `npm run auth:generate` and `npm run db:push` if not done yet.",
  });

  return checks;
}

function detectPackageManager(targetDir: string): PackageManager {
  if (existsSync(join(targetDir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(targetDir, "yarn.lock"))) return "yarn";
  if (existsSync(join(targetDir, "bun.lockb")) || existsSync(join(targetDir, "bun.lock"))) {
    return "bun";
  }
  return "npm";
}
