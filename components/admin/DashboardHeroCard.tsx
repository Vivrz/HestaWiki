"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import AnimatedNumber from "@/components/admin/AnimatedNumber";

function TypewriterText({ text }: { text: string }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(text);
      return;
    }

    setValue("");
    let index = 0;
    let timeout: number;
    const type = () =>{
      index += 1;
      setValue(text.slice(0 , index));
      if(index < text.length){
        timeout = window.setTimeout(type , 58);
      }
      else{
        timeout = window.setTimeout(()=>{
          index = 0;
          setValue("");
          type();
        } , 1200);
      }
    }
    timeout = window.setTimeout(type , 58);
    return () => window.clearTimeout(timeout);
  }, [text]);

  return (
    <span className="inline-flex max-w-full items-center">
      <span className="truncate">{value}</span>
      <span className="ml-0.5 h-5 w-[2px] animate-[typeCursor_900ms_steps(1)_infinite] bg-white/90" />
    </span>
  );
}

function CorporateMemphisScene() {
  return (
    <svg
      className="admin-hero-illustration"
      viewBox="0 0 390 190"
      role="img"
      aria-label="Admin working at a laptop"
    >
      <circle cx="206" cy="24" r="4" fill="#6f35ff" />
      <circle cx="292" cy="20" r="4" fill="#6f35ff" />
      <circle cx="142" cy="58" r="3" fill="#6f35ff" />
      <circle cx="372" cy="78" r="3" fill="#6f35ff" />
      <circle cx="118" cy="118" r="7" fill="#6f35ff" />
      <circle cx="337" cy="134" r="4" fill="#6f35ff" />
      <rect x="42" y="118" width="90" height="62" rx="8" fill="#eef9f8" stroke="#8d81ff" strokeWidth="4" />
      <rect x="50" y="126" width="74" height="46" rx="3" fill="#ffffff" />
      <path d="M50 187H350" stroke="#e7fffb" strokeWidth="7" strokeLinecap="round" />
      <g className="admin-hero-worker">
        <path d="M192 54c-4-27 15-42 40-36 19 4 30 20 26 41-4 23-23 27-42 23-15-3-22-13-24-28Z" fill="#053d3b" />
        <path d="M196 66c-10 3-15-3-13-11 3-8 11-6 16-1l-3 12Z" fill="#eef9f8" />
        <path d="M211 48c12 10 31 7 42 20-4 21-15 36-33 36-19 0-32-14-32-34 0-13 8-21 23-22Z" fill="#eef9f8" stroke="#072f34" strokeWidth="2" />
        <circle cx="214" cy="70" r="8" fill="none" stroke="#072f34" strokeWidth="2.5" />
        <circle cx="238" cy="72" r="8" fill="none" stroke="#072f34" strokeWidth="2.5" />
        <path d="M222 70h8" stroke="#072f34" strokeWidth="2" />
        <path d="M247 62l9-5" stroke="#072f34" strokeWidth="2" />
        <path d="M231 78c-2 8-5 14-12 18" stroke="#072f34" strokeWidth="2" strokeLinecap="round" />
        <path d="M206 105c-25 21-28 56-16 78h75c6-30-1-62-25-79-10 11-21 12-34 1Z" fill="#f9ffff" stroke="#072f34" strokeWidth="2" />
        <path d="M226 106l11 67 12-43-9-24c-4 5-8 7-14 0Z" fill="#682dff" />
        <path d="M253 153c22-1 35 4 49 20" stroke="#072f34" strokeWidth="7" strokeLinecap="round" />
        <path d="M254 163c24-3 42 3 54 19" stroke="#eef9f8" strokeWidth="6" strokeLinecap="round" />
      </g>
      <g className="admin-hero-laptop">
        <path d="M276 108h96c8 0 13 7 11 15l-12 57H252l12-61c2-7 5-11 12-11Z" fill="#9d8cff" stroke="#e7fffb" strokeWidth="4" />
        <path d="M239 184h144" stroke="#e7fffb" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g className="admin-hero-bubble">
        <circle cx="325" cy="76" r="30" fill="#8676ff" opacity="0.95" />
        <path d="M312 96l9-16 10 9-19 7Z" fill="#8676ff" />
        <path d="M331 53l-19 47" stroke="#eef9f8" strokeWidth="4" strokeLinecap="round" />
        <path d="M321 83l17 8" stroke="#eef9f8" strokeWidth="4" strokeLinecap="round" />
        <path d="M329 59l4-5" stroke="#072f34" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="admin-hero-plant">
        <rect x="344" y="151" width="25" height="32" rx="4" fill="#f8f6ff" />
        <path d="M356 151c-14-19-9-32 4-4M356 151c10-20 20-23 9 0M356 151c-22-7-22-18-2-8" stroke="#87dbc3" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function DashboardHeroCard({
  todayChats,
  readinessPercent,
}: {
  todayChats: number;
  readinessPercent: number;
}) {
  return (
    <section className="admin-hero-card admin-enter">
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center px-7 py-6 sm:px-8">
        <div className="mb-7 flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-white text-sm font-bold text-[#2d2a58] shadow-md">
            AD
          </span>
          <h1 className="min-w-0 text-lg font-bold text-white sm:text-xl">
            <TypewriterText text="Welcome back , Admin" />
          </h1>
        </div>

        <div className="flex flex-wrap items-end gap-8 sm:gap-10">
          <div>
            <div className="flex items-center gap-1.5 text-[32px] font-bold leading-none text-white sm:text-[34px]">
              <AnimatedNumber value={todayChats} />
              <Icon icon="tabler:arrow-up-right" width={17} className="text-[#22e6a6]" />
            </div>
            <p className="mt-2 text-sm font-medium text-[#98a4cf]">Today&apos;s Chat</p>
          </div>

          <div className="hidden h-[54px] w-px bg-white/10 sm:block" />

          <div>
            <div className="flex items-center gap-1.5 text-[32px] font-bold leading-none text-white sm:text-[34px]">
              <AnimatedNumber value={readinessPercent} />
              <span>%</span>
              <Icon icon="tabler:arrow-up-right" width={17} className="text-[#22e6a6]" />
            </div>
            <p className="mt-2 text-sm font-medium text-[#98a4cf]">Knowledge Readiness</p>
          </div>
        </div>
      </div>

      <div className="relative hidden h-full min-h-[220px] flex-[1.05] lg:block">
        <CorporateMemphisScene />
      </div>
    </section>
  );
}
