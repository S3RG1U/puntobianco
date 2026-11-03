import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.login.title };
}

async function RedirectIfSignedIn() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return null;
}

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <BrandMark />
            Punto Bianco
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </main>
      </div>
      <div className="hidden items-center justify-center bg-brand-dark p-16 lg:flex">
        <Image
          src="/brand/logo.png"
          alt="Punto Bianco"
          width={1351}
          height={772}
          priority
          className="h-auto w-full max-w-sm"
        />
      </div>
    </div>
  );
}
