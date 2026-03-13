import ResetPasswordForm from "@/components/auth/reset-password";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 items-center justify-center">
      <Link href={"/"} className="flex items-center gap-2">
        <Image src={"/logo.png"} alt="logo" height={25} width={25} />
        <p className="text-lg font-medium">Shado/auth</p>
      </Link>
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link href={"/sign-up"} className="hover:underline text-primary">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
