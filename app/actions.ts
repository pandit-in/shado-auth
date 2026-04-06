"use server";

import { db } from "@/db";
import { user } from "@/auth-schema";

export async function getUsers() {
  try {
    const users = await db.select().from(user);
    return users;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}
