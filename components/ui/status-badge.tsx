import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { getOpsStatusVariant } from "@/lib/ops-presentation"

type StatusVariant =
  | "default"
  | "secondary"
  | "outline"
  | "muted"
  | "success"
  | "warning"
  | "danger"
  | "info"

interface StatusBadgeProps {
  status: string
  variant?: StatusVariant
  className?: string
}

function StatusBadge({
  status,
  variant,
  className,
}: StatusBadgeProps) {
  const resolvedVariant =
    variant ??
    getOpsStatusVariant(status)

  return (
    <Badge
      variant={resolvedVariant}
      className={className}
    >
      {status}
    </Badge>
  )
}

export { StatusBadge }
