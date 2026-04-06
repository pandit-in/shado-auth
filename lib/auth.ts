import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema";
import { nextCookies } from "better-auth/next-js";
import {
  username,
  admin,
  organization,
  lastLoginMethod,
} from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "@/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: "Shadospace@shadospace.in",
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password for user ${user.email} has been reset.`);
    },
    onExistingUserSignUp: async ({ user }) => {
      await resend.emails.send({
        from: "Shadospace@shadospace.in",
        to: user.email,
        subject: "Sign-up attempt with your email",
        text: "Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.",
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: "Shadospace@shadospace.in",
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    sendOnSignUp: true,
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  plugins: [
    nextCookies(),
    username(),
    admin(),
    organization(),
    lastLoginMethod(),
  ],
});
