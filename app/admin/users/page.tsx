import { prisma } from "@/lib/prisma";
import UserManagementClient from "@/components/admin/UserManagementClient";
import { AdminUser, ChatSession, UsagePoint } from "@/components/admin/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Fetch real users and their chat sessions
  const usersData = await prisma.user.findMany({
    include: {
      chatSessions: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let weeklyActiveUsersSet = new Set<string>();
  let monthlyActiveUsersSet = new Set<string>();
  let totalChatsThisMonth = 0;
  let totalSessionMinutes = 0;
  let sessionsWithDuration = 0;

  // Aggregate stats and map to AdminUser
  const users: AdminUser[] = usersData.map((u) => {
    let lastActive = u.createdAt.toISOString();
    if (u.chatSessions.length > 0) {
      lastActive = u.chatSessions[0].createdAt.toISOString();
    }

    let totalMessages = 0;

    const mappedSessions: ChatSession[] = u.chatSessions.map((session) => {
      totalMessages += session.messages.length;
      
      const isThisMonth = session.createdAt >= oneMonthAgo;
      const isThisWeek = session.createdAt >= oneWeekAgo;

      if (isThisMonth) {
        totalChatsThisMonth++;
        monthlyActiveUsersSet.add(u.id);
      }
      if (isThisWeek) {
        weeklyActiveUsersSet.add(u.id);
      }

      // Estimate session duration (last message time - session start)
      if (session.messages.length > 1) {
        const start = session.createdAt.getTime();
        const end = session.messages[session.messages.length - 1].createdAt.getTime();
        const diffMinutes = (end - start) / 60000;
        if (diffMinutes > 0 && diffMinutes < 60) { // keep realistic bounds
          totalSessionMinutes += diffMinutes;
          sessionsWithDuration++;
        }
      }

      return {
        id: session.id,
        title: session.title,
        startedAt: session.createdAt.toISOString(),
        messageCount: session.messages.length,
        messages: session.messages.map((m) => {
          let sourcesArray: { title: string; url?: string }[] = [];
          if (Array.isArray(m.sources)) {
            sourcesArray = m.sources.map((s: any) => ({
              title: s.title || s.name || "Unknown Source",
              url: s.url,
            }));
          }

          return {
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            at: m.createdAt.toISOString(),
            sources: sourcesArray.length > 0 ? sourcesArray : undefined,
          };
        }),
      };
    });

    let role = u.role === "admin" ? "Admin" : "User";

    return {
      id: u.id,
      name: u.name || "Unknown User",
      email: u.email,
      role: role as any,
      department: "General", 
      avatarUrl: u.image || undefined,
      lastActive,
      totalSessions: u.chatSessions.length,
      totalMessages,
      sessions: mappedSessions,
    };
  });

  const totalSessionsCount = usersData.reduce((acc, u) => acc + u.chatSessions.length, 0);
  const avgSessionsPerUser = usersData.length > 0 
    ? parseFloat((totalSessionsCount / usersData.length).toFixed(1))
    : 0;

  const avgSessionMinutes = sessionsWithDuration > 0 
    ? parseFloat((totalSessionMinutes / sessionsWithDuration).toFixed(1)) 
    : 0;

  // Building dynamic weekly chart (last 7 days):
  const weeklyUsage: UsagePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const startOfDay = new Date(d.setHours(0, 0, 0, 0));
    const endOfDay = new Date(d.setHours(23, 59, 59, 999));
    let dailyChats = 0;
    let dailyUsers = new Set<string>();
    usersData.forEach(u => {
      let activeToday = false;
      u.chatSessions.forEach(s => {
        if (s.createdAt >= startOfDay && s.createdAt <= endOfDay) {
          dailyChats++;
          activeToday = true;
        }
      });
      if (activeToday) dailyUsers.add(u.id);
    });
    weeklyUsage.push({ label, chats: dailyChats, users: dailyUsers.size });
  }

  // Monthly Usage (last 6 months)
  const monthlyUsage: UsagePoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const nextMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1);
    let monthChats = 0;
    let monthUsers = new Set<string>();
    usersData.forEach(u => {
      let active = false;
      u.chatSessions.forEach(s => {
        if (s.createdAt >= startOfMonth && s.createdAt < nextMonth) {
          monthChats++;
          active = true;
        }
      });
      if (active) monthUsers.add(u.id);
    });
    monthlyUsage.push({ label, chats: monthChats, users: monthUsers.size });
  }

  return (
    <UserManagementClient 
      users={users} 
      weeklyUsage={weeklyUsage} 
      monthlyUsage={monthlyUsage}
      usageStats={{
        weeklyActiveUsers: weeklyActiveUsersSet.size,
        monthlyActiveUsers: monthlyActiveUsersSet.size,
        avgSessionMinutes,
        avgSessionsPerUser,
        totalChatsThisMonth,
      }}
    />
  );
}
