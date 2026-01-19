import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "default" },
  complete: { label: "Complete", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  partial: { label: "Partial", variant: "outline" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === "processing" && "animate-pulse",
        status === "complete" && "bg-green-500 hover:bg-green-600",
        status === "partial" && "bg-orange-500 hover:bg-orange-600 text-white",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
