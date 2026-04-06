"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { authClient } from "@/lib/auth-client";
import { Skeleton } from "../ui/skeleton";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export default function UserButton() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {isPending ? (
          <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
        ) : (
          data?.user && (
            <Avatar className="cursor-pointer">
              <AvatarImage src={data?.user.image || ""} alt={data?.user.name} />
              <AvatarFallback>{data?.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          )
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => router.push("/account")}>
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Button
              onClick={async () => {
                await authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/sign-in");
                    },
                  },
                });
              }}
              variant="destructive"
            >
              Log Out
            </Button>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
