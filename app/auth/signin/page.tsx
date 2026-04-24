"use client";

import { signIn } from "next-auth/react";
import { Button, Card } from "flowbite-react";
import { HiSparkles, HiShieldCheck, HiLightningBolt } from "react-icons/hi";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.14),transparent_32%)]" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden rounded-[2rem] bg-slate-950 p-10 text-white shadow-[0_30px_100px_-40px_rgba(15,23,42,0.9)] lg:block">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 text-slate-950">
            <HiSparkles className="h-7 w-7" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">
            Internal knowledge assistant
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-bold leading-tight">
            Ask better questions. Get grounded company answers.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
            Built for teams that need quick access to trusted internal context, with secure access and admin-managed content behind the scenes.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <HiShieldCheck className="h-5 w-5 text-sky-300" />
              <p className="mt-3 text-sm font-medium">Secure sign-in</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <HiLightningBolt className="h-5 w-5 text-amber-300" />
              <p className="mt-3 text-sm font-medium">Fast retrieval</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <HiSparkles className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm font-medium">Admin-curated docs</p>
            </div>
          </div>
        </section>

        <Card className="glass-panel w-full rounded-[2rem] border-white/60 px-2 py-4 shadow-[0_30px_100px_-40px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-8 p-4 sm:p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-sky-100 text-sky-700 ring-1 ring-sky-200">
              <HiSparkles className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                Sign in to Hestabit Chatbot
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use your company Microsoft account to continue to chat and admin tools.
              </p>
            </div>
            <Button
              color="blue"
              className="w-full rounded-xl"
              onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/chat?new=true" })}
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M1 1h10v10H1V1z" fill="#f25022" />
                <path d="M12 1h10v10H12V1z" fill="#7fba00" />
                <path d="M1 12h10v10H1V12z" fill="#00a4ef" />
                <path d="M12 12h10v10H12V12z" fill="#ffb900" />
              </svg>
              Continue with Microsoft
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
