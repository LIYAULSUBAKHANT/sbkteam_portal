"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { apiGet, clearStoredAuth, getDashboardRoute, getStoredAuth } from "@/lib/api"

export default function ProtectedRoute({ children, requireAdmin = false, blockMembers = false }) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let ignore = false

    async function verifyAccess() {
      const { token, roleId, userId, user } = getStoredAuth()
      console.log("Current user:", user ? JSON.stringify(user) : null)

      if (!token || !userId || !user) {
        router.replace("/login")
        return
      }

      const isLeader = Number(roleId) >= 1 && Number(roleId) <= 4

      if (requireAdmin && !isLeader) {
        router.replace(getDashboardRoute(roleId))
        return
      }

      if (blockMembers) {
        try {
          const user = await apiGet(`/api/users/${userId}`)

          if (!ignore && user.role_key === "member") {
            router.replace(getDashboardRoute(roleId))
            return
          }
        } catch {
          if (!ignore) {
            clearStoredAuth()
            router.replace("/login")
          }
          return
        }
      }

      if (!ignore) {
        setIsReady(true)
      }
    }

    verifyAccess()

    return () => {
      ignore = true
    }
  }, [blockMembers, requireAdmin, router])

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm border-border/70 shadow-lg">
          <CardContent className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            Loading dashboard...
          </CardContent>
        </Card>
      </div>
    )
  }

  return children
}
