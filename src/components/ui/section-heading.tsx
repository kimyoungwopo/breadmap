import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeading({ title, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="font-bold">{title}</h2>
      {action}
    </div>
  )
}
