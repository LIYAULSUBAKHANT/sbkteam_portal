"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, apiGet, apiPost, getDashboardRoute, getStoredAuth, persistAuth, roleIdToStorageRole } from "@/lib/api"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const currentAuth = getStoredAuth()
    console.log("Current user:", currentAuth.user ? JSON.stringify(currentAuth.user) : null)

    if (currentAuth.user && window.location.pathname === "/login") {
      console.log("User already logged in")
    }

    setIsCheckingSession(false)
  }, [])

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
      const responseUser = result.user || null
      const resolvedUserId = result.id || responseUser?.id
      const resolvedRoleId = result.role_id || responseUser?.role_id || 5

      if (!resolvedUserId) {
        throw new Error("Login response did not include a user id.")
      }

      let storageRole = roleIdToStorageRole(resolvedRoleId)

      persistAuth({
        token: result.token,
        userId: resolvedUserId,
        roleId: resolvedRoleId,
        role: storageRole,
        email: normalizedEmail,
        rememberMe,
        user: responseUser || {
          id: resolvedUserId,
          email: normalizedEmail,
          full_name: result.full_name,
          roleId: resolvedRoleId,
          role: storageRole,
        },
      })

      try {
        const user = await apiGet(`/api/users/${resolvedUserId}`)
        storageRole = user.role_key || storageRole

        persistAuth({
          token: result.token,
          userId: resolvedUserId,
          roleId: resolvedRoleId,
          role: storageRole,
          email: normalizedEmail,
          rememberMe,
          user: {
            id: resolvedUserId,
            email: normalizedEmail,
            full_name: user.full_name || result.full_name,
            roleId: resolvedRoleId,
            role: user.role_key || storageRole,
          },
        })
      } catch {
        // Keep the fallback role if the profile lookup fails.
      }

      router.push(getDashboardRoute(resolvedRoleId))
    } catch (loginError) {
      console.error("Login request failed:", {
        message: loginError?.message,
        status: loginError?.status,
        requestUrl: loginError?.requestUrl,
        payload: loginError?.payload,
      })

      if (loginError instanceof ApiError) {
        if (loginError.status === 404) {
          setError(`Login route not found. Check NEXT_PUBLIC_API_URL and confirm the backend exposes POST /api/auth/login. (${loginError.requestUrl || "unknown URL"})`)
        } else {
          setError(loginError.message || "Login failed.")
        }
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
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
