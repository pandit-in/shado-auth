import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import UserButton from "../utils/user-button";
import { DropdownMenu, DropdownMenuLabel } from "../ui/dropdown-menu";
import Organizations from "../utils/organizations";

export default async function Header() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return (
    <div className="border-b top-0 backdrop-blur-sm bg-background/80 fixed w-full z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link href={"/"} className="flex items-center gap-2">
          <Image src={"/logo.png"} alt="logo" width={28} height={28} />
          <h1 className="text-xl font-medium">shado/auth</h1>
        </Link>
        <nav className="flex items-center gap-2">
          {session?.user ? (
            <div className="flex items-center gap-2">
              <Organizations/>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant={"outline"}>
                <Link href={"/sign-in"}>Sign In</Link>
              </Button>
              <Button>
                <Link href={"/sign-up"}>Get Started</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
