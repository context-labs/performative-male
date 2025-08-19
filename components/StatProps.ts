import type { LucideIcon } from "lucide-react"

export interface StatProps {
  icon: LucideIcon
  label: string
  value?: string | number
  unit?: string
  className?: string
}
