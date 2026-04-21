// "use client";

// import { signOut } from "next-auth/react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { Sidebar } from "flowbite-react";
// import {
//   HiChartPie,
//   HiUpload,
//   HiDocumentText,
//   HiOfficeBuilding,
//   HiChat,
//   HiLogout,
// } from "react-icons/hi";

// const navItems = [
//   { href: "/admin", label: "Dashboard", icon: HiChartPie },
//   { href: "/admin/upload", label: "Upload Documents", icon: HiUpload },
//   { href: "/admin/documents", label: "Manage Documents", icon: HiDocumentText },
//   { href: "/admin/departments", label: "Departments", icon: HiOfficeBuilding },
// ];

// export default function AdminSidebar() {
//   const pathname = usePathname();

//   return (
//     <Sidebar className="h-full" aria-label="Admin navigation">
//       <Sidebar.Logo href="/admin" img="/logo.svg" imgAlt="Enterprise Chatbot">
//         Admin Panel
//       </Sidebar.Logo>
//       <Sidebar.Items>
//         <Sidebar.ItemGroup>
//           {navItems.map(({ href, label, icon: Icon }) => (
//             <Sidebar.Item
//               key={href}
//               as={Link}
//               href={href}
//               icon={Icon}
//               active={pathname === href}
//             >
//               {label}
//             </Sidebar.Item>
//           ))}
//         </Sidebar.ItemGroup>
//         <Sidebar.ItemGroup>
//           <Sidebar.Item as={Link} href="/chat" icon={HiChat}>
//             Go to Chat
//           </Sidebar.Item>
//           <Sidebar.Item
//             icon={HiLogout}
//             className="cursor-pointer"
//             onClick={() => signOut({ callbackUrl: "/auth/signin" })}
//           >
//             Sign Out
//           </Sidebar.Item>
//         </Sidebar.ItemGroup>
//       </Sidebar.Items>
//     </Sidebar>
//   );
// }


"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiChartPie,
  HiUpload,
  HiDocumentText,
  HiOfficeBuilding,
  HiChat,
  HiLogout,
  HiSparkles,
} from "react-icons/hi";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: HiChartPie },
  { href: "/admin/upload", label: "Upload Documents", icon: HiUpload },
  { href: "/admin/documents", label: "Manage Documents", icon: HiDocumentText },
  { href: "/admin/departments", label: "Departments", icon: HiOfficeBuilding },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-80 flex-col border-r border-white/50 bg-slate-950 px-5 py-6 text-white shadow-[18px_0_60px_-32px_rgba(15,23,42,0.75)]">
      <Link
        href="/admin"
        className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 text-slate-950 shadow-lg">
          <HiSparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-white">
            Hestabit Chatbot
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Knowledge operations console
          </p>
        </div>
      </Link>

      <div className="mt-8 flex flex-1 flex-col justify-between">
        <nav className="space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-slate-950 shadow-[0_20px_50px_-25px_rgba(56,189,248,0.7)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    isActive
                      ? "bg-slate-950 text-sky-300"
                      : "bg-white/5 text-slate-300 group-hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            );
          })}

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Workspace tip</p>
            <p className="mt-2 leading-6 text-slate-300/90">
              Upload and organize the latest internal docs so answers stay grounded in current knowledge.
            </p>
          </div>
        </nav>

        <div className="space-y-2">
          <Link
            href="/chat"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              <HiChat className="h-5 w-5" />
            </span>
            Open chat workspace
          </Link>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <HiLogout className="h-5 w-5" />
            </span>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
