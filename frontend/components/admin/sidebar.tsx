"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  LayoutDashboard,
  Users,
  UsersRound,
  FolderKanban,
  ListTodo,
  Trophy,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getDashboardRoute, getStoredAuth } from "@/lib/api"

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Members", href: "/admin/members", icon: Users },
  { name: "Teams", href: "/admin/teams", icon: UsersRound },
  { name: "Projects", href: "/admin/projects", icon: FolderKanban },
  { name: "Tasks", href: "/admin/tasks", icon: ListTodo },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Performance", href: "/admin/performance", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [role, setRole] = useState("")
  const [roleId, setRoleId] = useState("")

  useEffect(() => {
    const auth = getStoredAuth()
    setRole(auth.role || "")
    setRoleId(auth.roleId || "")
  }, [])

  const visibleMenuItems = useMemo(
    () => (role === "member" ? menuItems.filter((item) => item.name !== "Leaderboard") : menuItems),
    [role]
  )

  const dashboardHref = getDashboardRoute(roleId)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href={dashboardHref} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              SBK
            </div>
            <span className="font-semibold text-sidebar-foreground">Team Portal</span>
          </Link>
        )}
        {collapsed && (
          <Link href={dashboardHref} className="mx-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              S
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleMenuItems.map((item) => {
            const href = item.href === "/dashboard" ? dashboardHref : item.href
            const isActive = pathname === item.href || 
              (href !== "/admin" && pathname.startsWith(href))
            
            return (
              <li key={item.name}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
