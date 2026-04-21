import { Spinner as FlowbiteSpinner } from "flowbite-react";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export default function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <FlowbiteSpinner size={size} />
    </div>
  );
}
