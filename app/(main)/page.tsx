"use client";

import { user } from "@/auth-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { getUsers } from "@/app/actions";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";

export default function Home() {
  const [users, setUsers] = useState<(typeof user.$inferSelect)[]>([]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getUsers();
        setUsers(users);
      } catch (error) {
        console.log(error);
      }
    };
    fetchUsers();
  }, []);
  const { data: session } = authClient.useSession();
  return (
    <div className="items-center justify-center">
      <div className="container">
        <h1 className="mt-40 text-7xl font-bold tracking-tight">
          Next.js Authentication, <br />
          <span>Done Right.</span>
        </h1>
        <p className="text-muted-foreground mt-6">
          A production-ready authentication starter using Better Auth, Drizzle,
          Shadcn
        </p>
        <div className="mt-6 flex items-center gap-4">
          <Button size={"lg"}>
            {session?.user ? (
              <Link href={"/dashboard"}>Dashboard</Link>
            ) : (
              <Link href={"/sign-in"}>Get Started</Link>
            )}
          </Button>
          <Button
            className="flex items-center gap-2"
            size={"lg"}
            variant={"outline"}
          >
            <Link
              target="_blank"
              href={"https://github.com/pandit-in/shado-auth"}
            >
              <FaGithub className="size-4" />
            </Link>
            GitHub
          </Button>
        </div>
        {users.map((user) => (
          <div key={user.id} className="mt-14 grid grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <CardTitle>{user.name}</CardTitle>
                <CardTitle>{user.email}</CardTitle>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
