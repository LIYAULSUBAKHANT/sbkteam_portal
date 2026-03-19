"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { getDashboardRoute, getStoredAuth } from "@/lib/api"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const { token, roleId } = getStoredAuth()

    if (!token) {
      router.replace("/login")
      return
    }

    router.replace(getDashboardRoute(roleId))
  }, [router])

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
