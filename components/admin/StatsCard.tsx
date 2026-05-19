import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: "blue" | "green" | "purple" | "yellow" | "pink";
}

const colorStyles: Record<NonNullable<StatsCardProps["color"]>, string> = {
  blue: "bg-sky-100 text-sky-700",
  green: "bg-emerald-100 text-emerald-700",
  purple: "bg-violet-100 text-violet-700",
  yellow: "bg-amber-100 text-amber-700",
  pink: "bg-rose-100 text-rose-700",
};

export default function StatsCard({ title, value, icon, color = "blue" }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorStyles[color]}`}>
            {icon}
          </span>
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
