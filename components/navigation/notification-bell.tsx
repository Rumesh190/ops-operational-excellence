"use client"

import { useEffect } from "react"
import { Bell } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useCurrentUser } from "@/lib/current-user"
import { useAdminUsers } from "@/features/five-s/administration/store"
import { evaluateActionAttention } from "@/lib/actions/action-attention-store"
import { useActionStore } from "@/lib/actions/action-store"
import { markNotificationRead, useNotifications } from "@/lib/notifications/notification-store"

/**
 * Notification entry point. Real events (audit assigned, corrective action
 * due, etc.) land here once the Notifications feature ships — for now this
 * renders the shell with an empty state.
 */
function NotificationBell() {
  const currentUser = useCurrentUser()
  const actions = useActionStore()
  const adminUsers = useAdminUsers()
  const notifications = useNotifications(currentUser.id)
  const unreadCount = notifications.filter((item) => !item.read).length

  useEffect(() => {
    evaluateActionAttention(actions, adminUsers)
  }, [actions, adminUsers])

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge
            variant="danger"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[calc(100dvh-4.5rem)] w-[calc(100vw-1.5rem)] max-w-80 overflow-y-auto">
        <PopoverHeader>
          <PopoverTitle>Notifications</PopoverTitle>
        </PopoverHeader>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <div className="-mx-2 mt-1 max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => markNotificationRead(item.id)}
                className="block rounded-md px-2 py-2.5 transition-colors hover:bg-muted"
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.message}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { NotificationBell }
