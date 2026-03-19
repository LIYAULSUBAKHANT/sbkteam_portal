"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, apiGet, apiPost, clearStoredAuth, getDashboardRoute, getStoredAuth, persistAuth, roleIdToStorageRole } from "@/lib/api"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let ignore = false

    async function checkStoredSession() {
      const { token, roleId, userId } = getStoredAuth()

      if (!token || !userId) {
        if (!ignore) {
          setIsCheckingSession(false)
        }
        return
      }

      try {
        await apiGet(`/api/users/${userId}`)
        if (!ignore) {
          router.replace(getDashboardRoute(roleId))
        }
      } catch {
        clearStoredAuth()
        if (!ignore) {
          setIsCheckingSession(false)
        }
      }
    }

    checkStoredSession()

    return () => {
      ignore = true
    }
  }, [router])

  const handleLogin = async (event) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = await apiPost("/api/auth/login", {
        email: normalizedEmail,
        password,
      })

      let storageRole = roleIdToStorageRole(result.role_id)

      persistAuth({
        token: result.token,
        userId: result.id,
        roleId: result.role_id,
        role: storageRole,
        email: normalizedEmail,
        rememberMe,
      })

      try {
        const user = await apiGet(`/api/users/${result.id}`)
        storageRole = user.role_key || storageRole

        persistAuth({
          token: result.token,
          userId: result.id,
          roleId: result.role_id,
          role: storageRole,
          email: normalizedEmail,
          rememberMe,
        })
      } catch {
        // Keep the fallback role if the profile lookup fails.
      }

      router.push(getDashboardRoute(result.role_id))
    } catch (loginError) {
      if (loginError instanceof ApiError) {
        setError(loginError.message || "Login failed.")
      } else {
        setError("Unable to connect to the server. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border/70 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
            <Image src="/portal-logo.png" alt="Portal logo" width={64} height={64} className="h-full w-full object-contain p-1" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl">Sign in to Team Portal</CardTitle>
            <CardDescription>
              Use your team email to continue to the dashboard.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isCheckingSession ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Checking session...
            </div>
          ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            {error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@sbk.team"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor="remember-me" className="flex items-center gap-2 text-muted-foreground">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                />
                <span>Remember me</span>
              </label>
              <span className="text-xs text-muted-foreground">Use a team email for its mapped role</span>
            </div>

            <Button type="submit" className="h-10 w-full">
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
