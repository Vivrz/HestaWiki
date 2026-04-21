import { SessionProvider } from "next-auth/react";

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
