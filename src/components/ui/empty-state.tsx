import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  emoji: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ emoji, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-3 py-10 animate-in fade-in zoom-in-95 duration-300",
      className
    )}>
      <div className="text-5xl">{emoji}</div>
      <p className="font-bold">{title}</p>
      {description && (
        <p className="text-center text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          className="mt-1 rounded-xl"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
