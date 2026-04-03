"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Crown,
  Eye,
  FolderKanban,
  GraduationCap,
  Heart,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings,
  SquarePen,
  Shield,
  Target,
  Trash2,
  Trophy,
  Users,
  UsersRound,
  X,
  Zap,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, PolarAngleAxis, RadialBar, RadialBarChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut, clearStoredAuth, getStoredAuth } from "@/lib/api"
import { useAppStore } from "@/lib/app-store"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { name: "Members", icon: Users, key: "members" },
  { name: "Teams", icon: UsersRound, key: "teams" },
  { name: "Projects", icon: FolderKanban, key: "projects" },
  { name: "Tasks", icon: ListTodo, key: "tasks" },
  { name: "Skills", icon: GraduationCap, key: "skills" },
  { name: "Leaderboard", icon: Trophy, key: "leaderboard" },
  { name: "Performance", icon: BarChart3, key: "performance" },
  { name: "Settings", icon: Settings, key: "settings" },
]

const roleColors = {
  Captain: "bg-amber-100 text-amber-800 border-amber-200",
  "Vice Captain": "bg-blue-100 text-blue-800 border-blue-200",
  Manager: "bg-green-100 text-green-800 border-green-200",
  Strategist: "bg-purple-100 text-purple-800 border-purple-200",
  Member: "bg-gray-100 text-gray-700 border-gray-200",
}

const roleIcons = {
  Captain: Crown,
  "Vice Captain": Shield,
  Manager: Target,
  Strategist: Eye,
  Member: Circle,
}

const levelColors = {
  Beginner: "bg-green-100 text-green-800 border-green-200",
  Intermediate: "bg-blue-100 text-blue-800 border-blue-200",
  Advanced: "bg-purple-100 text-purple-800 border-purple-200",
  Expert: "bg-amber-100 text-amber-800 border-amber-200",
}

const taskStatusOptions = ["All", "Pending", "In Progress", "Done"]
const roleOptions = [
  { label: "Captain", value: 1 },
  { label: "Vice Captain", value: 2 },
  { label: "Manager", value: 3 },
  { label: "Strategist", value: 4 },
  { label: "Member", value: 5 },
]

const emptyMemberForm = {
  full_name: "",
  email: "",
  role_id: "5",
  team_id: "",
  password: "1234",
  roll_number: "",
  department: "",
  position: "",
  special_lab: "",
  primary_skill_1: "",
  primary_skill_2: "",
  secondary_skill_1: "",
  secondary_skill_2: "",
  special_skill_1: "",
  special_skill_2: "",
  linkedin: "",
  github: "",
  leetcode: "",
  activity_points: "0",
  reward_points: "0",
}

function splitSkillPair(value) {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  return [parts[0] || "", parts[1] || ""]
}

function joinSkillPair(first, second) {
  return [first, second]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ")
}

function formatSkillPair(first, second) {
  return [first, second].filter(Boolean).join(", ") || "Not set"
}

function getSkillItems(first, second) {
  return [first, second].filter(Boolean)
}

function formatExternalLink(value) {
  const raw = String(value || "").trim()

  if (!raw) {
    return null
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  return `https://${raw}`
}

function formatDate(value) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatDateTime(value) {
  if (!value) return "Not scheduled"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function parseDateValue(value) {
  if (!value) return null
  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function getStartOfDay(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function getDayDifferenceFromToday(value) {
  const parsedDate = parseDateValue(value)

  if (!parsedDate) {
    return null
  }

  const today = getStartOfDay(new Date())
  const dueDay = getStartOfDay(parsedDate)
  const millisecondsPerDay = 1000 * 60 * 60 * 24

  return Math.round((dueDay.getTime() - today.getTime()) / millisecondsPerDay)
}

function getTaskStatusClasses(status) {
  if (status === "Done") {
    return {
      column: "border border-emerald-400/25 bg-slate-900 text-emerald-100 shadow-[0_16px_34px_rgba(15,23,42,0.32)]",
      card: "border border-slate-700/80 bg-slate-900 shadow-[0_18px_42px_rgba(2,6,23,0.36)]",
      badge: "border-emerald-400/25 bg-emerald-400/12 text-emerald-200",
      icon: "text-emerald-300",
      rail: "from-emerald-400 via-emerald-300 to-teal-300",
    }
  }

  if (status === "In Progress") {
    return {
      column: "border border-sky-400/25 bg-slate-900 text-sky-100 shadow-[0_16px_34px_rgba(15,23,42,0.32)]",
      card: "border border-slate-700/80 bg-slate-900 shadow-[0_18px_42px_rgba(2,6,23,0.36)]",
      badge: "border-sky-400/25 bg-sky-400/12 text-sky-200",
      icon: "text-sky-300",
      rail: "from-sky-400 via-cyan-300 to-blue-300",
    }
  }

  return {
    column: "border border-amber-400/25 bg-slate-900 text-amber-100 shadow-[0_16px_34px_rgba(15,23,42,0.32)]",
    card: "border border-slate-700/80 bg-slate-900 shadow-[0_18px_42px_rgba(2,6,23,0.36)]",
    badge: "border-amber-400/25 bg-amber-400/12 text-amber-200",
    icon: "text-amber-300",
    rail: "from-amber-300 via-yellow-300 to-orange-300",
  }
}

function getTaskUrgency(task) {
  const dayDifference = getDayDifferenceFromToday(task?.dueDate)

  if (dayDifference === null) {
    return {
      tone: "neutral",
      label: "No due date",
      detail: "Add a deadline to track this task better.",
    }
  }

  if (task?.status === "Done") {
    return {
      tone: "done",
      label: "Completed",
      detail: `Finished with due date ${formatDate(task.dueDate)}.`,
    }
  }

  if (dayDifference < 0) {
    const overdueDays = Math.abs(dayDifference)

    return {
      tone: "overdue",
      label: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
      detail: `Deadline was ${formatDate(task.dueDate)}.`,
    }
  }

  if (dayDifference === 0) {
    return {
      tone: "today",
      label: "Due today",
      detail: "This task needs attention before the day ends.",
    }
  }

  if (dayDifference <= 2) {
    return {
      tone: "soon",
      label: `Due in ${dayDifference} day${dayDifference === 1 ? "" : "s"}`,
      detail: `Deadline is ${formatDate(task.dueDate)}.`,
    }
  }

  return {
    tone: "upcoming",
    label: `Due in ${dayDifference} days`,
    detail: `Deadline is ${formatDate(task.dueDate)}.`,
  }
}

function getUrgencyBadgeClasses(tone) {
  if (tone === "overdue") return "border-rose-400/30 bg-rose-400/15 text-rose-100"
  if (tone === "today") return "border-orange-400/30 bg-orange-400/15 text-orange-100"
  if (tone === "soon") return "border-amber-400/30 bg-amber-400/15 text-amber-100"
  if (tone === "done") return "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
  if (tone === "upcoming") return "border-slate-400/30 bg-slate-400/15 text-slate-100"
  return "border-border/60 bg-white/5 text-slate-300"
}

function getTaskPriorityClasses(priority) {
  if (priority === "High") {
    return "border-rose-400/30 bg-rose-400/12 text-rose-100"
  }

  if (priority === "Medium") {
    return "border-amber-400/30 bg-amber-400/12 text-amber-100"
  }

  return "border-sky-400/30 bg-sky-400/12 text-sky-100"
}

function formatRelativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "just now"
  }

  const now = new Date()
  const diff = (now - date) / 1000
  const seconds = Math.max(0, Math.floor(diff))

  if (!value || seconds < 60) return "just now"

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "min" : "mins"} ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`
  }

  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? "day" : "days"} ago`
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime()
    const rightTime = new Date(right.created_at).getTime()

    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return 0
    }

    if (rightTime !== leftTime) {
      return rightTime - leftTime
    }

    return Number(right.id || 0) - Number(left.id || 0)
  })
}

function getPermissions(role) {
  const normalized = String(role || "").trim().toLowerCase()
  const isCaptain = normalized === "captain"
  const isLeader = ["vice captain", "vice_captain", "manager", "strategist"].includes(normalized)
  const isMember = normalized === "member"
  const isStrategist = normalized === "strategist"

  return {
    canAddMember: isCaptain,
    canEditMember: isCaptain,
    canViewDetails: isCaptain || isLeader || isMember,
    canViewPerformance: true,
    canUpdatePerformance: true,
    canUpdateAnyPerformance: isCaptain,
    canDeleteRecords: isCaptain,
    canManageProjects: isCaptain || isLeader,
    canAssignTasks: isCaptain || isLeader,
    canAssignSkills: isCaptain || isLeader,
    canEditAssignedSkills: isCaptain || isStrategist,
    canDeleteAssignedSkills: isCaptain || isStrategist,
    canCreateAnnouncement: isCaptain || isLeader,
    canViewLeaderboard: isCaptain || isLeader,
    canViewAnalytics: isCaptain || isLeader,
    canSyncPoints: isCaptain || isLeader,
  }
}

function getInitials(name) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "--"
  )
}

function extractBatchYearFromIdentity(email, rollNumber) {
  const candidates = [email, rollNumber]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

  for (const candidate of candidates) {
    const localPart = candidate.includes("@") ? candidate.split("@")[0] : candidate
    const match = localPart.match(/([a-z]+)(\d{2})(?!.*\d)/)

    if (match) {
      return Number(match[2])
    }
  }

  return null
}

function getCohortFromIdentity(email, rollNumber) {
  const batchYear = extractBatchYearFromIdentity(email, rollNumber)

  if (batchYear === 24) return "senior"
  if (batchYear === 25) return "junior"
  return "all"
}

function sortLeaderboardByActivity(items) {
  return [...items].sort((left, right) => {
    if (right.activity_points !== left.activity_points) {
      return right.activity_points - left.activity_points
    }

    return left.name.localeCompare(right.name)
  })
}

function buildTargetLabel(item) {
  if (item.target_type === "team") return item.target_team_name || "Team"
  if (item.target_type === "user") return item.target_user_name || "User"
  return "All"
}

function normalizeUser(user, taskCount = 0) {
  const [fallbackPrimary1, fallbackPrimary2] = splitSkillPair(user.primary_skill)
  const [fallbackSecondary1, fallbackSecondary2] = splitSkillPair(user.secondary_skill)
  const [fallbackSpecial1, fallbackSpecial2] = splitSkillPair(user.special_skill)
  const primarySkill1 = user.primary_skill_1 || fallbackPrimary1
  const primarySkill2 = user.primary_skill_2 || fallbackPrimary2
  const secondarySkill1 = user.secondary_skill_1 || fallbackSecondary1
  const secondarySkill2 = user.secondary_skill_2 || fallbackSecondary2
  const specialSkill1 = user.special_skill_1 || fallbackSpecial1
  const specialSkill2 = user.special_skill_2 || fallbackSpecial2

  return {
    id: String(user.id),
    name: user.full_name || "Unknown user",
    email: user.email || "",
    role: user.role_name || "Member",
    roleKey: user.role_key,
    team: user.team_name || "Unassigned",
    points: Number(user.points || 0),
    activity_points: Number(user.activity_points || 0),
    reward_points: Number(user.reward_points || 0),
    cgpa: Number(user.cgpa || 0),
    tasks: taskCount,
    avatar:
      user.avatar_initials || getInitials(user.full_name),
    joinedAt: user.joined_at,
    teamId: user.team_id ? String(user.team_id) : "",
    roleId: user.role_id ? String(user.role_id) : "",
    roll_number: user.roll_number || "",
    department: user.department || "",
    position: user.position || "",
    special_lab: user.special_lab || "",
    primary_skill: user.primary_skill || joinSkillPair(primarySkill1, primarySkill2),
    primary_skill_1: primarySkill1,
    primary_skill_2: primarySkill2,
    secondary_skill: user.secondary_skill || joinSkillPair(secondarySkill1, secondarySkill2),
    secondary_skill_1: secondarySkill1,
    secondary_skill_2: secondarySkill2,
    special_skill: user.special_skill || joinSkillPair(specialSkill1, specialSkill2),
    special_skill_1: specialSkill1,
    special_skill_2: specialSkill2,
    linkedin: user.linkedin || "",
    github: user.github || "",
    leetcode: user.leetcode || "",
  }
}

function normalizeLeaderboardUser(user) {
  return {
    id: String(user.id),
    name: user.full_name,
    email: user.email || "",
    activity_points: Number(user.activity_points || 0),
    teamId: user.team_id ? String(user.team_id) : "",
    team: user.team_name || "Unassigned",
    avatar: getInitials(user.full_name),
  }
}

function normalizeTeam(team) {
  return {
    id: String(team.id),
    name: team.name,
    lead: team.lead_name || "Not assigned",
    leadUserId: team.lead_user_id ? String(team.lead_user_id) : "",
    description: team.description || "No description provided.",
    memberCount: Number(team.member_count || 0),
  }
}

function normalizeProject(project) {
  return {
    id: String(project.id),
    name: project.name,
    description: project.description || "",
    status: project.status,
    progress: Number(project.progress || 0),
    totalTasks: Number(project.total_tasks || 0),
    completedTasks: Number(project.completed_tasks || 0),
    deadline: project.deadline,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    teamId: String(project.team_id),
    team: project.team_name || "Unassigned",
  }
}

function normalizeTask(task) {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description || "No description provided.",
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    projectId: String(task.project_id),
    project: task.project_name || "Unknown project",
    assignee: task.assigned_to_name || "Unassigned",
    assignedTo: String(task.assigned_to_user_id),
  }
}

function normalizeSkill(skill) {
  return {
    id: String(skill.id),
    userId: String(skill.user_id),
    skillName: skill.skill_name,
    level: skill.level,
    description: skill.description || "No description provided.",
    status: skill.status,
    assignedBy: skill.assigned_by_name || "System",
    assignedByUserId: skill.assigned_by_user_id ? String(skill.assigned_by_user_id) : "",
    assignedAt: skill.assigned_at,
  }
}

function normalizeAnnouncement(announcement) {
  return {
    id: String(announcement.id),
    title: announcement.title,
    message: announcement.message,
    targetType: announcement.target_type || "all",
    targetTeamId: announcement.target_team_id ? String(announcement.target_team_id) : "",
    targetUserId: announcement.target_user_id ? String(announcement.target_user_id) : "",
    target: buildTargetLabel(announcement),
    author: announcement.author_name || "System",
    createdAt: announcement.created_at,
    likeCount: Number(announcement.like_count || 0),
    acknowledgeCount: Number(announcement.acknowledge_count || 0),
    seenCount: Number(announcement.seen_count || 0),
    viewerHasLiked: Boolean(announcement.viewer_has_liked),
    viewerHasAcknowledged: Boolean(announcement.viewer_has_acknowledged),
    viewerHasSeen: Boolean(announcement.viewer_has_seen),
    seenBy: Array.isArray(announcement.seen_by) ? announcement.seen_by : [],
    likedBy: Array.isArray(announcement.liked_by) ? announcement.liked_by : [],
    acknowledgedBy: Array.isArray(announcement.acknowledged_by) ? announcement.acknowledged_by : [],
  }
}

function normalizeReminder(reminder) {
  return {
    id: String(reminder.id),
    title: reminder.title,
    description: reminder.description || "No description provided.",
    dateTime: reminder.remind_at,
    targetType: reminder.target_type || "all",
    targetTeamId: reminder.target_team_id ? String(reminder.target_team_id) : "",
    targetUserId: reminder.target_user_id ? String(reminder.target_user_id) : "",
    assignedTo: buildTargetLabel(reminder),
  }
}

function normalizeNotification(notification) {
  return {
    id: String(notification.id),
    message: notification.message,
    time: formatRelativeTime(notification.created_at),
    read: Boolean(notification.is_read),
  }
}

function normalizeDiscussionComment(comment) {
  return {
    id: String(comment.id),
    threadId: String(comment.thread_id),
    parentCommentId: comment.parent_comment_id ? String(comment.parent_comment_id) : null,
    authorId: String(comment.author_user_id),
    authorName: comment.author_name || "Unknown user",
    authorEmail: comment.author_email || "",
    body: comment.body || "",
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    canEdit: Boolean(comment.can_edit),
    canDelete: Boolean(comment.can_delete),
  }
}

function normalizeDiscussionThread(payload) {
  return {
    id: String(payload?.thread?.id || ""),
    sourceType: payload?.thread?.source_type || "general",
    sourceId: payload?.thread?.source_id ? String(payload.thread.source_id) : "",
    title: payload?.thread?.title || "Discussion",
    contextPreview: payload?.thread?.context_preview || "",
    isLocked: Boolean(payload?.thread?.is_locked),
    comments: Array.isArray(payload?.comments) ? payload.comments.map(normalizeDiscussionComment) : [],
  }
}

function nestDiscussionComments(comments) {
  const commentMap = new Map()
  const roots = []

  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  commentMap.forEach((comment) => {
    if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
      commentMap.get(comment.parentCommentId).replies.push(comment)
      return
    }

    roots.push(comment)
  })

  return roots
}

function renderBanner(message, tone = "error") {
  if (!message) return null

  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        tone === "error" && "border border-destructive/20 bg-destructive/5 text-destructive",
        tone === "success" && "border border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {message}
    </div>
  )
}

function isAuthSessionError(error) {
  return error instanceof ApiError && (error.status === 401 || error.status === 404)
}

export default function AdminDashboard({ initialPage = "dashboard" }) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [actionError, setActionError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [activePage, setActivePage] = useState(initialPage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [taskStatusFilter, setTaskStatusFilter] = useState("All")
  const currentUser = useAppStore((state) => state.currentUser)
  const members = useAppStore((state) => state.users)
  const teams = useAppStore((state) => state.teams)
  const projects = useAppStore((state) => state.projects)
  const tasks = useAppStore((state) => state.tasks)
  const skills = useAppStore((state) => state.skills)
  const announcements = useAppStore((state) => state.announcements)
  const reminders = useAppStore((state) => state.reminders)
  const notifications = useAppStore((state) => state.notifications)
  const leaderboard = useAppStore((state) => state.leaderboard)
  const setTasks = useAppStore((state) => state.setTasks)
  const setSkills = useAppStore((state) => state.setSkills)
  const setNotifications = useAppStore((state) => state.setNotifications)
  const setDashboardData = useAppStore((state) => state.setDashboardData)
  const refreshToken = useAppStore((state) => state.refreshToken)
  const resetStore = useAppStore((state) => state.resetStore)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [memberDetailsOpen, setMemberDetailsOpen] = useState(false)
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)
  const [announcementInsightsOpen, setAnnouncementInsightsOpen] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [taskReminderDialogOpen, setTaskReminderDialogOpen] = useState(false)
  const [taskReminderDialogSeen, setTaskReminderDialogSeen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingSkillId, setEditingSkillId] = useState(null)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [editingReminderId, setEditingReminderId] = useState(null)
  const [memberForm, setMemberForm] = useState(emptyMemberForm)
  const [performanceForm, setPerformanceForm] = useState({
    id: "",
    name: "",
    activity_points: "",
    reward_points: "",
    cgpa: "",
  })
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    team_id: "",
    status: "Planning",
    progress: "0",
    deadline: "",
  })
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
    lead_user_id: "",
    member_ids: [],
  })
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    project_id: "",
    assigned_to_user_ids: [],
    priority: "Medium",
    due_date: "",
  })
  const [skillForm, setSkillForm] = useState({
    user_ids: [],
    skill_name: "",
    level: "Beginner",
    description: "",
    assigned_at: new Date().toISOString().split("T")[0],
  })
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    target_type: "all",
    target_team_id: "",
    target_user_id: "",
  })
  const [announcementReactionState, setAnnouncementReactionState] = useState({})
  const [reminderForm, setReminderForm] = useState({
    title: "",
    description: "",
    remind_at: "",
    target_type: "all",
    target_team_id: "",
    target_user_id: "",
  })
  const [discussionThreads, setDiscussionThreads] = useState({})
  const [discussionOpenState, setDiscussionOpenState] = useState({})
  const [discussionLoadingState, setDiscussionLoadingState] = useState({})
  const [discussionSubmittingState, setDiscussionSubmittingState] = useState({})
  const [discussionDrafts, setDiscussionDrafts] = useState({})
  const [discussionReplyDrafts, setDiscussionReplyDrafts] = useState({})
  const [discussionReplyEditors, setDiscussionReplyEditors] = useState({})
  const [discussionEditDrafts, setDiscussionEditDrafts] = useState({})
  const [discussionEditState, setDiscussionEditState] = useState({})

  useEffect(() => {
    if (!actionMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setActionMessage("")
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [actionMessage])

  async function loadWithFallback(request, fallbackValue, label, required = false) {
    try {
      return await request()
    } catch (error) {
      if (required) {
        throw error
      }

      console.error(`Failed to load ${label}:`, error)
      return fallbackValue
    }
  }

  async function refreshData() {
    const { token, userId } = getStoredAuth()

    if (!token || !userId) {
      router.replace("/login")
      return
    }

    const currentUserRow = await loadWithFallback(
      () => apiGet(`/api/users/${userId}`),
      null,
      "current user",
      true
    )

    const userRows = await loadWithFallback(() => apiGet("/api/users"), [currentUserRow], "users list")

    const [teamsRows, projectsRows, tasksRows, announcementsRows, remindersRows, notificationsRows, leaderboardRows] = await Promise.all([
      loadWithFallback(() => apiGet("/api/teams"), [], "teams"),
      loadWithFallback(() => apiGet("/api/projects"), [], "projects"),
      loadWithFallback(() => apiGet("/api/tasks"), [], "tasks"),
      loadWithFallback(() => apiGet("/api/announcements"), [], "announcements"),
      loadWithFallback(() => apiGet("/api/reminders"), [], "reminders"),
      loadWithFallback(() => apiGet("/api/notifications"), [], "notifications"),
      loadWithFallback(() => apiGet("/api/users/leaderboard"), [], "leaderboard"),
    ])

    const currentUserTaskCount = tasksRows.reduce((count, task) => {
      return String(task.assigned_to_user_id) === String(currentUserRow.id) ? count + 1 : count
    }, 0)

    const taskCounts = tasksRows.reduce((accumulator, task) => {
      const key = String(task.assigned_to_user_id)
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})

    let skillRows = []
    if (currentUserRow.role_key === "member") {
      skillRows = await loadWithFallback(
        () => apiGet(`/api/weekly-skills/user/${currentUserRow.id}`),
        [],
        "member skills"
      )
    } else {
      const skillGroups = await Promise.all(
        userRows.map((user) => apiGet(`/api/weekly-skills/user/${user.id}`).catch(() => []))
      )
      skillRows = skillGroups.flat()
    }

    setDashboardData({
      currentUser: normalizeUser(currentUserRow, currentUserTaskCount),
      users: userRows.map((user) => normalizeUser(user, taskCounts[String(user.id)] || 0)),
      teams: teamsRows.map(normalizeTeam),
      projects: projectsRows.map(normalizeProject),
      tasks: tasksRows.map(normalizeTask),
      skills: skillRows.map(normalizeSkill),
      announcements: sortByCreatedAtDesc(announcementsRows).map(normalizeAnnouncement),
      reminders: remindersRows.map(normalizeReminder),
      notifications: sortByCreatedAtDesc(notificationsRows).map(normalizeNotification),
      leaderboard: leaderboardRows.map(normalizeLeaderboardUser),
    })
  }

  useEffect(() => {
    let ignore = false

    async function loadData() {
      const { token, userId } = getStoredAuth()
      if (!token || !userId) {
        router.replace("/login")
        return
      }

      setIsLoading(true)
      setPageError("")

      try {
        if (ignore) return
        await refreshData()
      } catch (error) {
        if (ignore) return
        console.error("Failed to load dashboard data:", error)
        if (isAuthSessionError(error)) {
          clearStoredAuth()
          router.replace("/login")
          return
        }
        setPageError(error.message || "Failed to load dashboard data.")
      } finally {
        if (!ignore) {
          setIsLoading(false)
          setIsReady(true)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [router])

  useEffect(() => {
    let ignore = false

    async function syncRealtimeData() {
      if (!refreshToken) {
        return
      }

      try {
        await refreshData()
      } catch (error) {
        if (ignore) return
        console.error("Failed to sync realtime dashboard data:", error)
        if (isAuthSessionError(error)) {
          clearStoredAuth()
          router.replace("/login")
          return
        }
        setActionError(error.message || "Failed to sync latest changes.")
      }
    }

    syncRealtimeData()

    return () => {
      ignore = true
    }
  }, [refreshToken, router])

  async function retryLoad() {
    setIsLoading(true)
    setPageError("")

    try {
      await refreshData()
    } catch (error) {
      console.error("Failed to retry dashboard data:", error)
      if (isAuthSessionError(error)) {
        clearStoredAuth()
        router.replace("/login")
        return
      }
      setPageError(error.message || "Failed to load dashboard data.")
    } finally {
      setIsLoading(false)
      setIsReady(true)
    }
  }

  async function handleAnnouncementReaction(announcementId, reactionType) {
    const requestKey = `${announcementId}:${reactionType}`

    setActionError("")
    setAnnouncementReactionState((previous) => ({ ...previous, [requestKey]: true }))

    try {
      await apiPost(`/api/announcements/${announcementId}/reactions`, {
        reaction_type: reactionType,
      })
      await refreshData()
    } catch (error) {
      console.error("Failed to update announcement reaction:", error)
      setActionError(error.message || "Failed to update announcement reaction.")
    } finally {
      setAnnouncementReactionState((previous) => {
        const nextState = { ...previous }
        delete nextState[requestKey]
        return nextState
      })
    }
  }

  function openAnnouncementInsights(announcement) {
    setSelectedAnnouncement(announcement)
    setAnnouncementInsightsOpen(true)
  }

  function getDiscussionKey(sourceType, sourceId) {
    return `${sourceType}:${sourceId}`
  }

  async function loadDiscussionThread(sourceType, sourceId) {
    const key = getDiscussionKey(sourceType, sourceId)

    setDiscussionLoadingState((previous) => ({ ...previous, [key]: true }))

    try {
      const params = new URLSearchParams({
        source_type: sourceType,
        source_id: String(sourceId),
      })
      const payload = await apiGet(`/api/discussions/thread?${params.toString()}`)
      setDiscussionThreads((previous) => ({
        ...previous,
        [key]: normalizeDiscussionThread(payload),
      }))
    } catch (error) {
      setActionError(error.message || "Failed to load discussion.")
    } finally {
      setDiscussionLoadingState((previous) => ({ ...previous, [key]: false }))
    }
  }

  async function toggleDiscussionPanel(sourceType, sourceId) {
    const key = getDiscussionKey(sourceType, sourceId)
    const nextOpen = !discussionOpenState[key]

    setDiscussionOpenState((previous) => ({ ...previous, [key]: nextOpen }))

    if (nextOpen && !discussionThreads[key]) {
      await loadDiscussionThread(sourceType, sourceId)
    }
  }

  async function handleDiscussionSubmit(sourceType, sourceId, parentCommentId = null) {
    const key = getDiscussionKey(sourceType, sourceId)
    const thread = discussionThreads[key]
    const draftKey = parentCommentId ? `${key}:${parentCommentId}` : key
    const body = parentCommentId ? discussionReplyDrafts[draftKey] : discussionDrafts[key]

    if (!thread?.id || !String(body || "").trim()) {
      return
    }

    setDiscussionSubmittingState((previous) => ({ ...previous, [draftKey]: true }))
    setActionError("")

    try {
      await apiPost(`/api/discussions/threads/${thread.id}/comments`, {
        body: String(body).trim(),
        parent_comment_id: parentCommentId ? Number(parentCommentId) : null,
      })

      if (parentCommentId) {
        setDiscussionReplyDrafts((previous) => ({ ...previous, [draftKey]: "" }))
        setDiscussionReplyEditors((previous) => ({ ...previous, [draftKey]: false }))
      } else {
        setDiscussionDrafts((previous) => ({ ...previous, [key]: "" }))
      }

      await loadDiscussionThread(sourceType, sourceId)
      setActionMessage("Discussion updated successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to post discussion comment.")
    } finally {
      setDiscussionSubmittingState((previous) => ({ ...previous, [draftKey]: false }))
    }
  }

  function openDiscussionEdit(sourceType, sourceId, comment) {
    const key = `${getDiscussionKey(sourceType, sourceId)}:${comment.id}`
    setDiscussionEditState((previous) => ({ ...previous, [key]: true }))
    setDiscussionEditDrafts((previous) => ({ ...previous, [key]: comment.body }))
  }

  async function handleDiscussionEditSave(sourceType, sourceId, commentId) {
    const threadKey = getDiscussionKey(sourceType, sourceId)
    const editKey = `${threadKey}:${commentId}`
    const body = String(discussionEditDrafts[editKey] || "").trim()

    if (!body) {
      return
    }

    setDiscussionSubmittingState((previous) => ({ ...previous, [editKey]: true }))
    setActionError("")

    try {
      await apiPatch(`/api/discussions/comments/${commentId}`, { body })
      setDiscussionEditState((previous) => ({ ...previous, [editKey]: false }))
      await loadDiscussionThread(sourceType, sourceId)
      setActionMessage("Comment updated successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to update comment.")
    } finally {
      setDiscussionSubmittingState((previous) => ({ ...previous, [editKey]: false }))
    }
  }

  async function handleDiscussionDelete(sourceType, sourceId, comment) {
    const confirmed = window.confirm(`Delete this comment from ${comment.authorName}?`)

    if (!confirmed) {
      return
    }

    const threadKey = getDiscussionKey(sourceType, sourceId)
    const deleteKey = `${threadKey}:delete:${comment.id}`
    setDiscussionSubmittingState((previous) => ({ ...previous, [deleteKey]: true }))
    setActionError("")

    try {
      await apiDelete(`/api/discussions/comments/${comment.id}`)
      await loadDiscussionThread(sourceType, sourceId)
      setActionMessage("Comment deleted successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to delete comment.")
    } finally {
      setDiscussionSubmittingState((previous) => ({ ...previous, [deleteKey]: false }))
    }
  }

  function renderReactionPeopleList(title, people, emptyMessage) {
    return (
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {people.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {people.map((person) => (
              <div key={`${title}:${person.user_id}`} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{person.full_name}</p>
                    <p className="text-xs text-muted-foreground">{person.email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(person.reacted_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderDiscussionCommentNodes(sourceType, sourceId, comments, depth = 0) {
    const threadKey = getDiscussionKey(sourceType, sourceId)

    return comments.map((comment) => {
      const replyKey = `${threadKey}:${comment.id}`
      const isReplyOpen = Boolean(discussionReplyEditors[replyKey])
      const editKey = `${threadKey}:${comment.id}`
      const deleteKey = `${threadKey}:delete:${comment.id}`
      const isEditing = Boolean(discussionEditState[editKey])

      return (
        <div key={comment.id} className={cn("space-y-3 rounded-lg border border-border/60 bg-background/80 p-3", depth > 0 && "ml-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{comment.authorName}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiscussionReplyEditors((previous) => ({ ...previous, [replyKey]: !previous[replyKey] }))}
              >
                <Reply className="mr-1 h-4 w-4" />
                Reply
              </Button>
              {comment.canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => openDiscussionEdit(sourceType, sourceId, comment)}>
                  <SquarePen className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              ) : null}
              {comment.canDelete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={Boolean(discussionSubmittingState[deleteKey])}
                  onClick={() => handleDiscussionDelete(sourceType, sourceId, comment)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <Textarea
                value={discussionEditDrafts[editKey] || ""}
                onChange={(event) => setDiscussionEditDrafts((previous) => ({ ...previous, [editKey]: event.target.value }))}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDiscussionEditState((previous) => ({ ...previous, [editKey]: false }))}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={Boolean(discussionSubmittingState[editKey])}
                  onClick={() => handleDiscussionEditSave(sourceType, sourceId, comment.id)}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.body}</p>
          )}

          {isReplyOpen ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <Textarea
                value={discussionReplyDrafts[replyKey] || ""}
                onChange={(event) => setDiscussionReplyDrafts((previous) => ({ ...previous, [replyKey]: event.target.value }))}
                placeholder="Reply here. Use @name to mention someone."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDiscussionReplyEditors((previous) => ({ ...previous, [replyKey]: false }))}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={Boolean(discussionSubmittingState[replyKey])}
                  onClick={() => handleDiscussionSubmit(sourceType, sourceId, comment.id)}
                >
                  <Send className="mr-1 h-4 w-4" />
                  Reply
                </Button>
              </div>
            </div>
          ) : null}

          {comment.replies?.length ? (
            <div className="space-y-3 border-l border-border/70 pl-3">
              {renderDiscussionCommentNodes(sourceType, sourceId, comment.replies, depth + 1)}
            </div>
          ) : null}
        </div>
      )
    })
  }

  function renderDiscussionPanel(sourceType, sourceId) {
    const key = getDiscussionKey(sourceType, sourceId)
    const thread = discussionThreads[key]
    const nestedComments = nestDiscussionComments(thread?.comments || [])

    return (
      <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{thread?.title || "Discussion"}</p>
            <p className="text-xs text-muted-foreground">
              Keep replies here so updates do not spill into WhatsApp.
            </p>
          </div>
          {discussionLoadingState[key] ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
        </div>

        <div className="mt-4 space-y-3">
          {nestedComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No discussion yet. Start the conversation here.</p>
          ) : (
            renderDiscussionCommentNodes(sourceType, sourceId, nestedComments)
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Textarea
            value={discussionDrafts[key] || ""}
            onChange={(event) => setDiscussionDrafts((previous) => ({ ...previous, [key]: event.target.value }))}
            placeholder="Add a comment. Use @name to mention someone."
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={Boolean(discussionSubmittingState[key]) || thread?.isLocked}
              onClick={() => handleDiscussionSubmit(sourceType, sourceId)}
            >
              <Send className="mr-1 h-4 w-4" />
              Post Comment
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const permissions = useMemo(() => getPermissions(currentUser?.role || "Member"), [currentUser])
  const isMember = currentUser?.roleKey === "member"
  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => item.key !== "leaderboard" || permissions.canViewLeaderboard),
    [permissions.canViewLeaderboard]
  )
  const memberMap = useMemo(
    () => new Map(members.map((member) => [String(member.id), member])),
    [members]
  )
  const visibleTasks = useMemo(
    () => (isMember ? tasks.filter((task) => task.assignedTo === currentUser?.id) : tasks),
    [currentUser?.id, isMember, tasks]
  )
  const filteredTasks = useMemo(
    () => (taskStatusFilter === "All" ? visibleTasks : visibleTasks.filter((task) => task.status === taskStatusFilter)),
    [taskStatusFilter, visibleTasks]
  )
  const urgentTasks = useMemo(
    () => visibleTasks.filter((task) => {
      const urgency = getTaskUrgency(task)
      return task.status !== "Done" && ["overdue", "today", "soon"].includes(urgency.tone)
    }),
    [visibleTasks]
  )
  const overdueTasks = useMemo(
    () => urgentTasks.filter((task) => getTaskUrgency(task).tone === "overdue"),
    [urgentTasks]
  )
  const dueTodayTasks = useMemo(
    () => urgentTasks.filter((task) => getTaskUrgency(task).tone === "today"),
    [urgentTasks]
  )
  const dueSoonTasks = useMemo(
    () => urgentTasks.filter((task) => getTaskUrgency(task).tone === "soon"),
    [urgentTasks]
  )
  const upcomingReminders = useMemo(() => {
    const now = new Date()
    const nextTwoDays = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2)

    return reminders.filter((reminder) => {
      const reminderDate = parseDateValue(reminder.dateTime)

      if (!reminderDate) {
        return false
      }

      return reminderDate >= now && reminderDate <= nextTwoDays
    })
  }, [reminders])
  const visibleSkills = useMemo(
    () => (isMember ? skills.filter((skill) => skill.userId === currentUser?.id) : skills),
    [currentUser?.id, isMember, skills]
  )
  const mySkills = useMemo(
    () => skills.filter((skill) => skill.userId === currentUser?.id),
    [currentUser?.id, skills]
  )
  const currentUserCohort = useMemo(
    () => getCohortFromIdentity(currentUser?.email, currentUser?.roll_number),
    [currentUser?.email, currentUser?.roll_number]
  )
  const visibleLeaderboard = useMemo(() => {
    if (!isMember || currentUserCohort === "all") {
      return leaderboard
    }

    return leaderboard.filter((member) => getCohortFromIdentity(member.email, member.roll_number) === currentUserCohort)
  }, [currentUserCohort, isMember, leaderboard])
  const stats = useMemo(() => {
    const completedSkills = visibleSkills.filter((skill) => skill.status === "Completed").length
    const totalSkills = visibleSkills.length
    const topPerformer = sortLeaderboardByActivity(visibleLeaderboard)[0] || null

    return {
      totalMembers: members.length,
      totalActivityPoints: members.reduce((sum, member) => sum + member.activity_points, 0),
      activeProjects: projects.filter((project) => project.status !== "Completed").length,
      pendingTasks: visibleTasks.filter((task) => task.status === "Pending").length,
      completedSkills,
      totalSkills,
      completionRate: totalSkills ? Math.round((completedSkills / totalSkills) * 100) : 0,
      topPerformer,
    }
  }, [members, projects, visibleLeaderboard, visibleSkills, visibleTasks])
  const unreadNotifications = notifications.filter((notification) => !notification.read).length
  const performanceChartData = useMemo(() => {
    const comparisonPool = visibleLeaderboard
      .filter((member) => Number(member.activity_points || 0) > 0 || String(member.id) === String(currentUser?.id || ""))
      .sort((left, right) => {
        if (right.activity_points !== left.activity_points) {
          return right.activity_points - left.activity_points
        }

        return left.name.localeCompare(right.name)
      })

    return comparisonPool.map((member) => ({
      id: member.id,
      name: member.name,
      shortName: member.name.length > 14 ? `${member.name.slice(0, 14)}...` : member.name,
      points: Number(member.activity_points || 0),
      fill: String(member.id) === String(currentUser?.id || "") ? "var(--color-you)" : "var(--color-team)",
      }))
  }, [currentUser?.id, visibleLeaderboard])
  const performanceShowcaseData = useMemo(() => {
    const ranked = [...performanceChartData].sort((left, right) => right.points - left.points)
    const topEntries = ranked.slice(0, 8)

    if (!topEntries.some((entry) => String(entry.id) === String(currentUser?.id || ""))) {
      const currentEntry = ranked.find((entry) => String(entry.id) === String(currentUser?.id || ""))
      if (currentEntry) {
        topEntries.push(currentEntry)
      }
    }

    return topEntries.map((entry, index) => ({
      ...entry,
      chartLabel: entry.name.length > 12 ? `${entry.name.slice(0, 12)}...` : entry.name,
      rank: ranked.findIndex((rankedEntry) => String(rankedEntry.id) === String(entry.id)) + 1 || index + 1,
      fill:
        String(entry.id) === String(currentUser?.id || "")
          ? "var(--color-you)"
          : index === 0
            ? "var(--color-first)"
            : index === 1
              ? "var(--color-second)"
              : index === 2
                ? "var(--color-third)"
                : "var(--color-team)",
    }))
  }, [currentUser?.id, performanceChartData])
  const performancePodium = useMemo(
    () => [...performanceShowcaseData].slice(0, 3),
    [performanceShowcaseData]
  )

  useEffect(() => {
    if (taskReminderDialogSeen) {
      return
    }

    if (urgentTasks.length > 0 || upcomingReminders.length > 0) {
      setTaskReminderDialogOpen(true)
      setTaskReminderDialogSeen(true)
    }
  }, [taskReminderDialogSeen, upcomingReminders.length, urgentTasks.length])

  function getMemberById(userId) {
    if (!userId) {
      return null
    }

    if (String(currentUser?.id || "") === String(userId)) {
      return currentUser
    }

    return memberMap.get(String(userId)) || null
  }

  function getMemberByName(name) {
    const normalizedName = String(name || "").trim().toLowerCase()

    if (!normalizedName) {
      return null
    }

    if (String(currentUser?.name || "").trim().toLowerCase() === normalizedName) {
      return currentUser
    }

    return members.find((member) => String(member.name || "").trim().toLowerCase() === normalizedName) || null
  }

  function renderMemberIdentity(member, fallbackLabel, options = {}) {
    const resolvedMember = member || null
    const RoleIcon = roleIcons[resolvedMember?.role || "Member"] || Circle
    const avatarLabel = resolvedMember?.avatar || getInitials(fallbackLabel)
    const nameLabel = fallbackLabel || resolvedMember?.name || "Unassigned"
    const sizeClass = options.compact ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs"
    const iconClass = options.compact ? "h-3 w-3" : "h-3.5 w-3.5"

    return (
      <div className="flex min-w-0 items-center gap-2">
        <Avatar className={sizeClass}>
          <AvatarFallback className="bg-primary/10 text-primary">{avatarLabel}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-foreground">{nameLabel}</span>
            {resolvedMember?.role ? (
              <RoleIcon className={cn(iconClass, "shrink-0 text-primary")} />
            ) : null}
          </div>
          {resolvedMember?.role ? (
            <p className="truncate text-[11px] text-muted-foreground">{resolvedMember.role}</p>
          ) : null}
        </div>
      </div>
    )
  }

  async function handleTaskStatusChange(taskId, status) {
    setActionError("")
    try {
      await apiPatch(`/api/tasks/${taskId}/status`, { status })
      setTasks((previous) => previous.map((task) => (task.id === taskId ? { ...task, status } : task)))
    } catch (error) {
      setActionError(error.message || "Failed to update task status.")
    }
  }

  async function handleMarkSkillComplete(skillId) {
    setActionError("")
    try {
      await apiPatch(`/api/skills/${skillId}/status`, { status: "Completed" })
      setSkills((previous) => previous.map((skill) => (skill.id === skillId ? { ...skill, status: "Completed" } : skill)))
    } catch (error) {
      setActionError(error.message || "Failed to update skill status.")
    }
  }

  function handleLogout() {
    clearStoredAuth()
    resetStore()
    window.location.href = "/login"
  }

  function resetMemberForm() {
    setMemberForm(emptyMemberForm)
    setEditingMemberId(null)
  }

  function resetPerformanceForm() {
    setPerformanceForm({
      id: "",
      name: "",
      activity_points: "",
      reward_points: "",
      cgpa: "",
    })
  }

  function resetProjectForm() {
    setProjectForm({ name: "", description: "", team_id: "", status: "Planning", progress: "0", deadline: "" })
    setEditingProjectId(null)
  }

  function resetTeamForm() {
    setTeamForm({ name: "", description: "", lead_user_id: "", member_ids: [] })
    setEditingTeamId(null)
  }

  function resetTaskForm() {
    setTaskForm({ title: "", description: "", project_id: "", assigned_to_user_ids: [], priority: "Medium", due_date: "" })
    setEditingTaskId(null)
  }

  function resetSkillForm() {
    setSkillForm({
      user_ids: [],
      skill_name: "",
      level: "Beginner",
      description: "",
      assigned_at: new Date().toISOString().split("T")[0],
    })
    setEditingSkillId(null)
  }

  function resetAnnouncementForm() {
    setAnnouncementForm({ title: "", message: "", target_type: "all", target_team_id: "", target_user_id: "" })
    setEditingAnnouncementId(null)
  }

  function resetReminderForm() {
    setReminderForm({ title: "", description: "", remind_at: "", target_type: "all", target_team_id: "", target_user_id: "" })
    setEditingReminderId(null)
  }

  async function handleCreateMember() {
    setActionError("")
    setActionMessage("")

    try {
      await apiPost("/api/users", {
        full_name: memberForm.full_name,
        email: memberForm.email,
        role_id: Number(memberForm.role_id),
        team_id: memberForm.team_id ? Number(memberForm.team_id) : null,
        password: memberForm.password,
        roll_number: memberForm.roll_number,
        department: memberForm.department,
        position: memberForm.position,
        special_lab: memberForm.special_lab,
        primary_skill: joinSkillPair(memberForm.primary_skill_1, memberForm.primary_skill_2),
        secondary_skill: joinSkillPair(memberForm.secondary_skill_1, memberForm.secondary_skill_2),
        special_skill: joinSkillPair(memberForm.special_skill_1, memberForm.special_skill_2),
        linkedin: memberForm.linkedin,
        github: memberForm.github,
        leetcode: memberForm.leetcode,
        activity_points: Number(memberForm.activity_points || 0),
        reward_points: Number(memberForm.reward_points || 0),
      })
      await refreshData()
      setMemberModalOpen(false)
      resetMemberForm()
      setActionMessage("Member created successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to create member.")
    }
  }

  function openMemberEditModal(member) {
    setEditingMemberId(member.id)
    setMemberForm({
      full_name: member.name,
      email: member.email,
      role_id: member.roleId || String(roleOptions.find((role) => role.label === member.role)?.value || 5),
      team_id: member.teamId || teams.find((team) => team.name === member.team)?.id || "",
      password: "",
      roll_number: member.roll_number || "",
      department: member.department || "",
      position: member.position || "",
      special_lab: member.special_lab || "",
      primary_skill_1: member.primary_skill_1 || "",
      primary_skill_2: member.primary_skill_2 || "",
      secondary_skill_1: member.secondary_skill_1 || "",
      secondary_skill_2: member.secondary_skill_2 || "",
      special_skill_1: member.special_skill_1 || "",
      special_skill_2: member.special_skill_2 || "",
      linkedin: member.linkedin || "",
      github: member.github || "",
      leetcode: member.leetcode || "",
      activity_points: String(member.activity_points ?? 0),
      reward_points: String(member.reward_points ?? 0),
    })
    setMemberModalOpen(true)
  }

  function openMemberDetailsModal(member) {
    setSelectedMember(member)
    setMemberDetailsOpen(true)
  }

  async function handleSaveMember() {
    setActionError("")
    setActionMessage("")

    try {
      if (editingMemberId) {
        await apiPut(`/api/users/${editingMemberId}`, {
          full_name: memberForm.full_name,
          email: memberForm.email,
          role_id: Number(memberForm.role_id),
          team_id: memberForm.team_id ? Number(memberForm.team_id) : null,
          roll_number: memberForm.roll_number,
          department: memberForm.department,
          position: memberForm.position,
          special_lab: memberForm.special_lab,
          primary_skill: joinSkillPair(memberForm.primary_skill_1, memberForm.primary_skill_2),
          secondary_skill: joinSkillPair(memberForm.secondary_skill_1, memberForm.secondary_skill_2),
          special_skill: joinSkillPair(memberForm.special_skill_1, memberForm.special_skill_2),
          linkedin: memberForm.linkedin,
          github: memberForm.github,
          leetcode: memberForm.leetcode,
          activity_points: Number(memberForm.activity_points || 0),
          reward_points: Number(memberForm.reward_points || 0),
          ...(String(memberForm.password || "").trim() ? { password: memberForm.password } : {}),
        })
        await refreshData()
        setMemberModalOpen(false)
        resetMemberForm()
        toast({ title: "Member updated", description: "Member details updated successfully." })
        setActionMessage("Member updated successfully.")
        return
      }

      await handleCreateMember()
    } catch (error) {
      setActionError(error.message || "Failed to save member.")
    }
  }

  async function handleCreateProject() {
    setActionError("")
    setActionMessage("")

    try {
      await apiPost("/api/projects", {
        team_id: Number(projectForm.team_id),
        name: projectForm.name,
        description: projectForm.description,
        status: projectForm.status,
        progress: Number(projectForm.progress || 0),
        deadline: projectForm.deadline || null,
      })
      await refreshData()
      setProjectModalOpen(false)
      resetProjectForm()
      setActionMessage("Project created successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to create project.")
    }
  }

  function openProjectEditModal(project) {
    setEditingProjectId(project.id)
    setProjectForm({
      name: project.name,
      description: project.description,
      team_id: project.teamId,
      status: project.status,
      progress: String(project.progress),
      deadline: project.deadline ? String(project.deadline).split("T")[0] : "",
    })
    setProjectModalOpen(true)
  }

  async function handleSaveProject() {
    setActionError("")
    setActionMessage("")

    try {
      if (editingProjectId) {
        await apiPatch(`/api/projects/${editingProjectId}`, {
          team_id: Number(projectForm.team_id),
          name: projectForm.name,
          description: projectForm.description,
          status: projectForm.status,
          progress: Number(projectForm.progress || 0),
          deadline: projectForm.deadline || null,
        })
        await refreshData()
        setProjectModalOpen(false)
        resetProjectForm()
        toast({ title: "Project updated", description: "Project updated successfully." })
        setActionMessage("Project updated successfully.")
        return
      }

      await handleCreateProject()
    } catch (error) {
      setActionError(error.message || "Failed to save project.")
    }
  }

  function openPerformanceModal(member) {
    setActionError("")
    setActionMessage("")
    setPerformanceForm({
      id: member.id,
      name: member.name,
      activity_points: String(member.activity_points ?? 0),
      reward_points: String(member.reward_points ?? 0),
      cgpa: String(member.cgpa ?? 0),
    })
    setPerformanceModalOpen(true)
  }

  async function handleUpdatePerformance() {
    setActionError("")
    setActionMessage("")

    try {
      await apiPut(`/api/users/${performanceForm.id}/performance`, {
        activity_points: Number(performanceForm.activity_points || 0),
        reward_points: Number(performanceForm.reward_points || 0),
        cgpa: Number(performanceForm.cgpa || 0),
      })
      await refreshData()
      setPerformanceModalOpen(false)
      toast({
        title: "Performance updated",
        description: `${performanceForm.name}'s performance data was saved.`,
      })
      setActionMessage("Performance updated successfully.")
      resetPerformanceForm()
    } catch (error) {
      setActionError(error.message || "Failed to update performance.")
    }
  }

  async function handleCreateTeam() {
    setActionError("")
    setActionMessage("")

    try {
      const result = await apiPost("/api/teams", {
        name: teamForm.name,
        description: teamForm.description,
        lead_user_id: teamForm.lead_user_id ? Number(teamForm.lead_user_id) : null,
      })

      return result.teamId
    } catch (error) {
      setActionError(error.message || "Failed to create team.")
      throw error
    }
  }

  function openTeamEditModal(team) {
    setEditingTeamId(team.id)
    const assignedMemberIds = members
      .filter((member) => member.teamId === team.id)
      .map((member) => member.id)

    setTeamForm({
      name: team.name,
      description: team.description === "No description provided." ? "" : team.description,
      lead_user_id: team.leadUserId || "",
      member_ids: assignedMemberIds,
    })
    setTeamModalOpen(true)
  }

  async function handleSaveTeam() {
    setActionError("")
    setActionMessage("")

    try {
      if (editingTeamId) {
        await apiPatch(`/api/teams/${editingTeamId}`, {
          name: teamForm.name,
          description: teamForm.description,
          lead_user_id: teamForm.lead_user_id ? Number(teamForm.lead_user_id) : null,
        })

        if (teamForm.member_ids && teamForm.member_ids.length > 0) {
          await apiPut(`/api/teams/${editingTeamId}/add-members`, {
            memberIds: teamForm.member_ids
          })
        }

        await refreshData()
        setTeamModalOpen(false)
        resetTeamForm()
        toast({ title: "Team updated", description: "Team updated successfully." })
        setActionMessage("Team updated successfully.")
        return
      }

      const createdTeamId = await handleCreateTeam()

      if (createdTeamId && teamForm.member_ids && teamForm.member_ids.length > 0) {
        await apiPut(`/api/teams/${createdTeamId}/add-members`, {
          memberIds: teamForm.member_ids
        })
      }

      await refreshData()
      setTeamModalOpen(false)
      resetTeamForm()
      toast({ title: "Team created", description: "Team created successfully." })
      setActionMessage("Team created successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to save team.")
    }
  }

  async function handleCreateTask() {
    setActionError("")
    setActionMessage("")

    try {
      await apiPost("/api/tasks", {
        project_id: Number(taskForm.project_id),
        member_ids: taskForm.assigned_to_user_ids.map((value) => Number(value)),
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
      })
      await refreshData()
      setTaskModalOpen(false)
      resetTaskForm()
      setActionMessage("Task created successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to create task.")
    }
  }

  function openTaskEditModal(task) {
    setEditingTaskId(task.id)
    setTaskForm({
      title: task.title,
      description: task.description === "No description provided." ? "" : task.description,
      project_id: task.projectId,
      assigned_to_user_ids: [task.assignedTo],
      priority: task.priority,
      due_date: task.dueDate ? String(task.dueDate).split("T")[0] : "",
    })
    setTaskModalOpen(true)
  }

  async function handleSaveTask() {
    setActionError("")
    setActionMessage("")

    try {
      if (editingTaskId) {
        await apiPatch(`/api/tasks/${editingTaskId}`, {
          project_id: Number(taskForm.project_id),
          assigned_to_user_id: Number(taskForm.assigned_to_user_ids[0]),
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
        })
        await refreshData()
        setTaskModalOpen(false)
        resetTaskForm()
        toast({ title: "Task updated", description: "Task updated successfully." })
        setActionMessage("Task updated successfully.")
        return
      }

      await handleCreateTask()
    } catch (error) {
      setActionError(error.message || "Failed to save task.")
    }
  }

  async function handleAssignSkill() {
    setActionError("")
    setActionMessage("")

    try {
      const basePayload = {
        skill_name: skillForm.skill_name,
        level: skillForm.level,
        description: skillForm.description,
        assigned_at: skillForm.assigned_at,
      }

      if (editingSkillId) {
        const payload = {
          user_id: Number(skillForm.user_ids[0]),
          ...basePayload,
        }
        await apiPatch(`/api/weekly-skills/${editingSkillId}`, payload)
      } else {
        const payload = {
          user_ids: skillForm.user_ids.map((value) => Number(value)),
          ...basePayload,
        }
        await apiPost("/api/weekly-skills", payload)
      }

      await refreshData()
      setSkillModalOpen(false)
      resetSkillForm()
      setActionMessage(editingSkillId ? "Weekly skill updated successfully." : "Weekly skill assigned successfully.")
    } catch (error) {
      setActionError(error.message || (editingSkillId ? "Failed to update skill." : "Failed to assign skill."))
    }
  }

  function openSkillEditModal(skill) {
    setEditingSkillId(skill.id)
    setSkillForm({
      user_ids: [skill.userId],
      skill_name: skill.skillName,
      level: skill.level || "Beginner",
      description: skill.description === "No description provided." ? "" : skill.description,
      assigned_at: skill.assignedAt ? String(skill.assignedAt).split("T")[0] : new Date().toISOString().split("T")[0],
    })
    setSkillModalOpen(true)
  }

  async function handleCreateAnnouncement() {
    setActionError("")
    setActionMessage("")

    try {
      await apiPost("/api/announcements", {
        title: announcementForm.title,
        message: announcementForm.message,
        target_type: announcementForm.target_type,
        target_team_id: announcementForm.target_type === "team" ? Number(announcementForm.target_team_id) : null,
        target_user_id: announcementForm.target_type === "user" ? Number(announcementForm.target_user_id) : null,
      })
      await refreshData()
      setAnnouncementModalOpen(false)
      resetAnnouncementForm()
      setActionMessage("Announcement created successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to create announcement.")
    }
  }

  function openAnnouncementEditModal(announcement) {
    setEditingAnnouncementId(announcement.id)
    setAnnouncementForm({
      title: announcement.title,
      message: announcement.message,
      target_type: announcement.targetType,
      target_team_id: announcement.targetTeamId,
      target_user_id: announcement.targetUserId,
    })
    setAnnouncementModalOpen(true)
  }

  async function handleSaveAnnouncement() {
    setActionError("")
    setActionMessage("")

    try {
      if (editingAnnouncementId) {
        await apiPatch(`/api/announcements/${editingAnnouncementId}`, {
          title: announcementForm.title,
          message: announcementForm.message,
          target_type: announcementForm.target_type,
          target_team_id: announcementForm.target_type === "team" ? Number(announcementForm.target_team_id) : null,
          target_user_id: announcementForm.target_type === "user" ? Number(announcementForm.target_user_id) : null,
        })
        await refreshData()
        setAnnouncementModalOpen(false)
        resetAnnouncementForm()
        toast({ title: "Announcement updated", description: "Announcement updated successfully." })
        setActionMessage("Announcement updated successfully.")
        return
      }

      await handleCreateAnnouncement()
    } catch (error) {
      setActionError(error.message || "Failed to save announcement.")
    }
  }

  async function handleCreateReminder() {
    setActionError("")
    setActionMessage("")

    try {
      await apiPost("/api/reminders", {
        title: reminderForm.title,
        description: reminderForm.description,
        remind_at: reminderForm.remind_at,
        target_type: reminderForm.target_type,
        target_team_id: reminderForm.target_type === "team" ? Number(reminderForm.target_team_id) : null,
        target_user_id: reminderForm.target_type === "user" ? Number(reminderForm.target_user_id) : null,
      })
      await refreshData()
      setReminderModalOpen(false)
      resetReminderForm()
      setActionMessage("Reminder created successfully.")
    } catch (error) {
      setActionError(error.message || "Failed to create reminder.")
    }
  }

  function openReminderEditModal(reminder) {
    setEditingReminderId(reminder.id)
    setReminderForm({
      title: reminder.title,
      description: reminder.description === "No description provided." ? "" : reminder.description,
      remind_at: reminder.dateTime ? String(reminder.dateTime).slice(0, 16) : "",
      target_type: reminder.targetType,
      target_team_id: reminder.targetTeamId,
      target_user_id: reminder.targetUserId,
    })
    setReminderModalOpen(true)
  }

  async function handleSaveReminder() {
    setActionError("")
    setActionMessage("")

    try {
      if (editingReminderId) {
        await apiPatch(`/api/reminders/${editingReminderId}`, {
          title: reminderForm.title,
          description: reminderForm.description,
          remind_at: reminderForm.remind_at,
          target_type: reminderForm.target_type,
          target_team_id: reminderForm.target_type === "team" ? Number(reminderForm.target_team_id) : null,
          target_user_id: reminderForm.target_type === "user" ? Number(reminderForm.target_user_id) : null,
        })
        await refreshData()
        setReminderModalOpen(false)
        resetReminderForm()
        toast({ title: "Reminder updated", description: "Reminder updated successfully." })
        setActionMessage("Reminder updated successfully.")
        return
      }

      await handleCreateReminder()
    } catch (error) {
      setActionError(error.message || "Failed to save reminder.")
    }
  }

  async function handleNotificationsOpenChange(open) {
    if (!open) {
      return
    }

    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id)

    if (unreadIds.length === 0) {
      return
    }

    setNotifications((previous) => previous.map((notification) => (
      unreadIds.includes(notification.id) ? { ...notification, read: true } : notification
    )))

    try {
      await Promise.all(unreadIds.map((id) => apiPatch(`/api/notifications/${id}/read`, {})))
    } catch (error) {
      setNotifications((previous) => previous.map((notification) => (
        unreadIds.includes(notification.id) ? { ...notification, read: false } : notification
      )))
      setActionError(error.message || "Failed to mark notifications as read.")
    }
  }

  async function handleDeleteItem(path, successMessage, confirmationMessage) {
    setActionError("")
    setActionMessage("")

    if (typeof window !== "undefined" && !window.confirm(confirmationMessage)) {
      return
    }

    try {
      await apiDelete(path)
      await refreshData()
      toast({
        title: "Deleted successfully",
        description: successMessage,
      })
      setActionMessage(successMessage)
    } catch (error) {
      setActionError(error.message || "Failed to delete item.")
    }
  }

  function renderDashboard() {
    return (
        <div className="space-y-6">
        {renderBanner(actionMessage, "success")}
        {renderBanner(actionError)}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My Activity Points</p>
                  <p className="text-3xl font-bold text-foreground">{currentUser?.activity_points || 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My Reward Points</p>
                  <p className="text-3xl font-bold text-foreground">{currentUser?.reward_points || 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My CGPA</p>
                  <p className="text-3xl font-bold text-foreground">{currentUser?.cgpa || 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                  <p className="truncate text-xl font-bold text-foreground">{stats.topPerformer?.name || "No data"}</p>
                  <p className="text-sm text-muted-foreground">{stats.topPerformer?.activity_points || 0} activity pts</p>
                </div>
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {stats.topPerformer?.avatar || "--"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {permissions.canAddMember ? (
                <Button onClick={() => setMemberModalOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Add Member
                </Button>
              ) : null}
              {permissions.canManageProjects ? (
                <Button onClick={() => setProjectModalOpen(true)} variant="outline">
                  <FolderKanban className="mr-2 h-4 w-4" /> Create Project
                </Button>
              ) : null}
              {permissions.canAssignTasks ? (
                <Button onClick={() => setTaskModalOpen(true)} variant="outline">
                  <ListTodo className="mr-2 h-4 w-4" /> Assign Task
                </Button>
              ) : null}
              {permissions.canAssignSkills ? (
                <Button onClick={() => setSkillModalOpen(true)} variant="outline">
                  <GraduationCap className="mr-2 h-4 w-4" /> Assign Skill
                </Button>
              ) : null}
              {permissions.canCreateAnnouncement ? (
                <Button onClick={() => setAnnouncementModalOpen(true)} variant="outline">
                  <Megaphone className="mr-2 h-4 w-4" /> Create Announcement
                </Button>
              ) : null}
              {permissions.canAssignTasks ? (
                <Button onClick={() => setReminderModalOpen(true)} variant="outline">
                  <Clock className="mr-2 h-4 w-4" /> Set Reminder
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <BookOpen className="h-5 w-5 text-primary" /> My Weekly Skills
              </CardTitle>
              <CardDescription>Your backend skill assignments</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[320px] space-y-3 overflow-y-auto">
              {mySkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills assigned yet.</p>
              ) : (
                mySkills.map((skill) => (
                  <div key={skill.id} className="rounded-lg border border-border bg-muted/50 p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{skill.skillName}</h4>
                        <Badge className={cn("mt-1 border text-xs", levelColors[skill.level])}>{skill.level}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {permissions.canEditAssignedSkills ? (
                          <Button size="sm" variant="outline" onClick={() => openSkillEditModal(skill)}>
                            Edit
                          </Button>
                        ) : null}
                        {permissions.canDeleteAssignedSkills ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteItem(`/api/weekly-skills/${skill.id}`, "Weekly skill deleted successfully.", `Delete skill ${skill.skillName}?`)}
                          >
                            Delete
                          </Button>
                        ) : null}
                        {skill.status === "Completed" ? (
                          <Badge className="border-green-200 bg-green-100 text-green-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleMarkSkillComplete(skill.id)}>
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{skill.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Assigned by {skill.assignedBy}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Zap className="h-5 w-5 text-warning" /> Activity Summary
              </CardTitle>
              <CardDescription>Live backend stats for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="py-2 text-center">
                <p className="text-5xl font-bold text-foreground">{currentUser?.activity_points || 0}</p>
                <p className="mt-2 text-sm text-muted-foreground">Your current activity points</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reward Points</span>
                  <span className="font-medium text-foreground">{currentUser?.reward_points || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGPA</span>
                  <span className="font-medium text-foreground">{currentUser?.cgpa || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Assigned Tasks</span>
                  <span className="font-medium text-foreground">{visibleTasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending Tasks</span>
                  <span className="font-medium text-foreground">{stats.pendingTasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Projects</span>
                  <span className="font-medium text-foreground">{stats.activeProjects}</span>
                </div>
              </div>
              {(permissions.canEditMember || currentUser?.roleKey === "member") ? (
                <Button variant="outline" className="w-full" onClick={() => openPerformanceModal(currentUser)}>
                  Update Performance
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">Profile Snapshot</CardTitle>
            <CardDescription>Live profile details from the users table</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="mt-1 font-medium text-foreground">{currentUser?.name || "Not set"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Roll No</p>
                <p className="mt-1 font-medium text-foreground">{currentUser?.roll_number || "Not set"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p>
                <p className="mt-1 font-medium text-foreground">{currentUser?.department || "Not set"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Position</p>
                <p className="mt-1 font-medium text-foreground">{currentUser?.position || "Not set"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary Skills</p>
                <p className="mt-1 font-medium text-foreground">{formatSkillPair(currentUser?.primary_skill_1, currentUser?.primary_skill_2)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Secondary Skills</p>
                <p className="mt-1 font-medium text-foreground">{formatSkillPair(currentUser?.secondary_skill_1, currentUser?.secondary_skill_2)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Special Skills</p>
                <p className="mt-1 font-medium text-foreground">{formatSkillPair(currentUser?.special_skill_1, currentUser?.special_skill_2)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward Points</p>
                <p className="mt-1 font-medium text-foreground">{currentUser?.reward_points || 0}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">GitHub</p>
                <p className="mt-1 font-medium text-foreground break-all">{currentUser?.github || "Not set"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</p>
                <p className="mt-1 font-medium text-foreground break-all">{currentUser?.linkedin || "Not set"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">LeetCode</p>
                <p className="mt-1 font-medium text-foreground break-all">{currentUser?.leetcode || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Megaphone className="h-5 w-5 text-primary" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[320px] space-y-3 overflow-y-auto">
              {announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No announcements available.</p>
              ) : (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-foreground">{announcement.title}</h4>
                        <Badge variant="outline" className="mt-1 text-xs">{announcement.target}</Badge>
                      </div>
                      <div className="flex gap-2">
                        {permissions.canDeleteRecords ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openAnnouncementEditModal(announcement)}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {permissions.canDeleteRecords ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteItem(`/api/announcements/${announcement.id}`, "Announcement deleted successfully.", `Delete announcement ${announcement.title}?`)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant={announcement.viewerHasLiked ? "default" : "outline"}
                        size="sm"
                        disabled={Boolean(announcementReactionState[`${announcement.id}:like`])}
                        onClick={() => handleAnnouncementReaction(announcement.id, "like")}
                      >
                        <Heart className="mr-1 h-4 w-4" />
                        Like {announcement.likeCount}
                      </Button>
                      <Button
                        variant={announcement.viewerHasAcknowledged ? "default" : "outline"}
                        size="sm"
                        disabled={Boolean(announcementReactionState[`${announcement.id}:acknowledge`])}
                        onClick={() => handleAnnouncementReaction(announcement.id, "acknowledge")}
                      >
                        <CheckCheck className="mr-1 h-4 w-4" />
                        Acknowledge {announcement.acknowledgeCount}
                      </Button>
                      {isMember ? (
                        <Badge variant="secondary" className="gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Seen {announcement.seenCount}
                        </Badge>
                      ) : currentUser?.roleKey === "captain" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAnnouncementInsights(announcement)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Seen by {announcement.seenCount}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Eye className="mr-1 h-4 w-4" />
                          Seen {announcement.seenCount}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDiscussionPanel("announcement", announcement.id)}
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        {discussionOpenState[getDiscussionKey("announcement", announcement.id)] ? "Hide Discussion" : "Open Discussion"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      By {announcement.author} • {formatDate(announcement.createdAt)}
                    </p>
                    {discussionOpenState[getDiscussionKey("announcement", announcement.id)] ? renderDiscussionPanel("announcement", announcement.id) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-accent" /> Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[320px] space-y-3 overflow-y-auto">
              {reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reminders available.</p>
              ) : (
                reminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{reminder.title}</h4>
                      <p className="text-sm text-muted-foreground">{reminder.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">{formatDateTime(reminder.dateTime)}</Badge>
                        <Badge variant="secondary" className="text-xs">{reminder.assignedTo}</Badge>
                      </div>
                    </div>
                    {permissions.canDeleteRecords ? (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openReminderEditModal(reminder)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(`/api/reminders/${reminder.id}`, "Reminder deleted successfully.", `Delete reminder ${reminder.title}?`)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  function renderMembers() {
    const filteredMembers = members.filter((member) =>
      [
        member.name,
        member.email,
        member.role,
        member.team,
        member.roll_number,
        member.department,
        member.position,
        member.primary_skill,
        member.github,
      ].some((value) =>
        value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )

    const isMemberView = currentUser?.roleKey === "member"
    const visibleMembers = filteredMembers

    return (
      <div className="space-y-6">
        {renderBanner(actionMessage, "success")}
        {renderBanner(actionError)}

        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          {permissions.canAddMember ? (
            <Button onClick={() => setMemberModalOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          ) : null}
        </div>

        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left font-medium text-muted-foreground">Member</th>
                  <th className="p-4 text-left font-medium text-muted-foreground">Role</th>
                  {isMemberView ? null : (
                    <>
                      <th className="p-4 text-left font-medium text-muted-foreground">Team</th>
                      <th className="p-4 text-left font-medium text-muted-foreground">Activity Points</th>
                      <th className="p-4 text-left font-medium text-muted-foreground">Reward Points</th>
                      <th className="p-4 text-left font-medium text-muted-foreground">Tasks</th>
                    </>
                  )}
                  <th className="p-4 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleMembers.map((member) => {
                  const RoleIcon = roleIcons[member.role] || Circle
                  const isSelf = member.id === currentUser?.id
                  const canUpdateThisPerformance = permissions.canUpdateAnyPerformance || isSelf

                  return (
                    <tr key={member.id} className="transition-colors hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">{member.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            {!isMemberView || isSelf ? (
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={cn("border", roleColors[member.role])}>
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {member.role}
                        </Badge>
                      </td>
                      {isMemberView ? null : (
                        <>
                          <td className="p-4 text-foreground">{member.team}</td>
                          <td className="p-4 text-foreground">{member.activity_points}</td>
                          <td className="p-4 text-foreground">{member.reward_points}</td>
                          <td className="p-4 text-foreground">{member.tasks}</td>
                        </>
                      )}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {(permissions.canViewDetails && (isSelf || ["captain", "vice captain", "manager", "strategist"].includes(currentUser?.role?.toLowerCase()))) ? (
                            <Button size="sm" variant="outline" onClick={() => openMemberDetailsModal(member)}>
                              View Details
                            </Button>
                          ) : null}
                          {!isMemberView && permissions.canEditMember ? (
                            <Button size="sm" variant="secondary" onClick={() => openMemberEditModal(member)}>
                              Edit
                            </Button>
                          ) : null}
                          {!isMemberView && permissions.canUpdatePerformance && canUpdateThisPerformance ? (
                            <Button size="sm" variant="outline" onClick={() => openPerformanceModal(member)}>
                              Update Performance
                            </Button>
                          ) : null}
                          {!isMemberView && permissions.canDeleteRecords ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteItem(`/api/users/${member.id}`, "Member deleted successfully.", `Delete ${member.name}?`)}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  function renderTeams() {
    return (
      <div className="space-y-6">
        {renderBanner(actionMessage, "success")}
        {renderBanner(actionError)}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Teams</h2>
          {permissions.canManageProjects ? (
            <Button onClick={() => setTeamModalOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add Team
            </Button>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground">{team.name}</CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead</span>
                  <span className="font-medium text-foreground">{team.lead}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium text-foreground">{team.memberCount}</span>
                </div>
                {permissions.canDeleteRecords ? (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => openTeamEditModal(team)}>
                    Edit Team
                  </Button>
                ) : null}
                {permissions.canDeleteRecords ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeleteItem(`/api/teams/${team.id}`, "Team deleted successfully.", `Delete team ${team.name}? This also deletes related projects and tasks.`)}
                  >
                    Delete Team
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  function renderProjects() {
    return (
      <div className="space-y-6">
        {renderBanner(actionMessage, "success")}
        {renderBanner(actionError)}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Projects</h2>
          {permissions.canManageProjects ? (
            <Button onClick={() => setProjectModalOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Create Project
            </Button>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">{project.name}</CardTitle>
                    <CardDescription>{project.team}</CardDescription>
                  </div>
                  <Badge variant={project.status === "Completed" ? "default" : project.status === "Development" ? "secondary" : "outline"}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{project.description || "No description provided."}</p>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Deadline: {formatDate(project.deadline)}</span>
                </div>
                {permissions.canDeleteRecords ? (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => openProjectEditModal(project)}>
                    Edit Project
                  </Button>
                ) : null}
                {permissions.canDeleteRecords ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeleteItem(`/api/projects/${project.id}`, "Project deleted successfully.", `Delete project ${project.name}? This also deletes related tasks.`)}
                  >
                    Delete Project
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  function renderTasks() {
    const groupedTasks = {
      Pending: filteredTasks.filter((task) => task.status === "Pending"),
      "In Progress": filteredTasks.filter((task) => task.status === "In Progress"),
      Done: filteredTasks.filter((task) => task.status === "Done"),
    }
    const statusesToShow = taskStatusFilter === "All" ? ["Pending", "In Progress", "Done"] : [taskStatusFilter]

    return (
      <div className="space-y-6">
        {renderBanner(actionMessage, "success")}
        {renderBanner(actionError)}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-2xl font-bold text-foreground">Tasks</h2>
          <div className="flex flex-wrap gap-2">
            {taskStatusOptions.map((status) => (
              <Button
                key={status}
                variant={taskStatusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setTaskStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
            {permissions.canAssignTasks ? (
              <Button onClick={() => setTaskModalOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Assign Task
              </Button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-[linear-gradient(135deg,#111827,#0f172a_55%,#020617)] shadow-[0_32px_80px_rgba(2,6,23,0.55)]">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-300/80">Task Command Desk</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Professional task tracking with clearer priority and better readability</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                High-contrast task monitoring built for real daily use. Urgent work stands out first, while every card stays readable without washed-out colors.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-rose-400/20 bg-slate-950/80 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.26em] text-rose-200/75">Overdue</p>
                <p className="mt-2 text-3xl font-semibold text-white">{overdueTasks.length}</p>
                <p className="mt-1 text-xs text-rose-100/75">Need immediate attention</p>
              </div>
              <div className="rounded-2xl border border-orange-400/20 bg-slate-950/80 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.26em] text-orange-200/75">Due Today</p>
                <p className="mt-2 text-3xl font-semibold text-white">{dueTodayTasks.length}</p>
                <p className="mt-1 text-xs text-orange-100/75">Should close before day end</p>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-slate-950/80 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.26em] text-amber-100/75">Due Soon</p>
                <p className="mt-2 text-3xl font-semibold text-white">{dueSoonTasks.length}</p>
                <p className="mt-1 text-xs text-amber-100/75">Next two days pipeline</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/80 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/75">Done Archive</p>
                <p className="mt-2 text-3xl font-semibold text-white">{groupedTasks.Done.length}</p>
                <p className="mt-1 text-xs text-emerald-100/75">Completed work stays reviewable</p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("grid gap-6", statusesToShow.length === 1 ? "md:grid-cols-1" : "md:grid-cols-3")}>
          {statusesToShow.map((status) => {
            const statusClasses = getTaskStatusClasses(status)

            return (
            <div key={status} className="space-y-4">
              <div className={cn("flex items-center gap-2 rounded-2xl px-4 py-3", statusClasses.column)}>
                {status === "Pending" ? <Circle className={cn("h-4 w-4", statusClasses.icon)} /> : null}
                {status === "In Progress" ? <AlertCircle className={cn("h-4 w-4", statusClasses.icon)} /> : null}
                {status === "Done" ? <CheckCircle2 className={cn("h-4 w-4", statusClasses.icon)} /> : null}
                <span className="font-medium text-white">{status}</span>
                <Badge className={cn("ml-auto border", statusClasses.badge)}>
                  {groupedTasks[status].length}
                </Badge>
              </div>

              <div className="space-y-4">
                {groupedTasks[status].map((task) => {
                  const taskStatusClasses = getTaskStatusClasses(task.status)
                  const urgency = getTaskUrgency(task)

                  return (
                  <Card key={task.id} className={cn("overflow-hidden rounded-[24px] border shadow-sm transition-transform duration-200 hover:-translate-y-1", taskStatusClasses.card)}>
                    <div className={cn("h-1.5 w-full bg-gradient-to-r", taskStatusClasses.rail)} />
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold leading-6 text-white">{task.title}</h4>
                            <Badge className={cn("border text-[11px]", taskStatusClasses.badge)}>{task.status}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-slate-300">{urgency.detail}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge className={cn("border text-xs", getTaskPriorityClasses(task.priority))}>
                            {task.priority}
                          </Badge>
                          <Badge className={cn("border text-[11px]", getUrgencyBadgeClasses(urgency.tone))}>
                            {urgency.label}
                          </Badge>
                        </div>
                      </div>
                      <p className="mb-4 text-sm leading-7 text-slate-300">{task.description}</p>
                      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <span>{task.assignee}</span>
                        <span>•</span>
                        <span>{task.project}</span>
                        <span>•</span>
                        <span>Due {formatDate(task.dueDate)}</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        {permissions.canDeleteRecords ? (
                          <Button variant="secondary" size="sm" onClick={() => openTaskEditModal(task)}>
                            Edit
                          </Button>
                        ) : null}
                        {permissions.canDeleteRecords ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteItem(`/api/tasks/${task.id}`, "Task deleted successfully.", `Delete task ${task.title}?`)}
                          >
                            Delete
                          </Button>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">Move</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {["Pending", "In Progress", "Done"].map((nextStatus) => (
                              <DropdownMenuItem key={nextStatus} onClick={() => handleTaskStatusChange(task.id, nextStatus)}>
                                {nextStatus}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleDiscussionPanel("task", task.id)}
                        >
                          <MessageSquare className="mr-1 h-4 w-4" />
                          {discussionOpenState[getDiscussionKey("task", task.id)] ? "Hide Discussion" : "Discuss"}
                        </Button>
                      </div>
                      {discussionOpenState[getDiscussionKey("task", task.id)] ? renderDiscussionPanel("task", task.id) : null}
                    </CardContent>
                  </Card>
                  )
                })}

                {groupedTasks[status].length === 0 ? (
                  <Card className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/70 shadow-sm">
                    <CardContent className="py-12 text-center text-sm text-slate-400">
                      No tasks in this status.
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderSkills() {
    const groupedByMember = visibleSkills.reduce((accumulator, skill) => {
      const key = skill.userId
      accumulator[key] = accumulator[key] || []
      accumulator[key].push(skill)
      return accumulator
    }, {})
    const membersWithSkills = members.filter((member) => groupedByMember[member.id]?.length)

    return (
      <div className="space-y-6">
        {renderBanner(actionMessage, "success")}
        {renderBanner(actionError)}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Weekly Skills</h2>
            <p className="text-muted-foreground">Backend skill assignments by user</p>
          </div>
          {permissions.canAssignSkills ? (
            <Button onClick={() => setSkillModalOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Assign Skill
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">{visibleSkills.filter((skill) => skill.status === "Completed").length}</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-foreground">{visibleSkills.filter((skill) => skill.status === "In Progress").length}</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{visibleSkills.filter((skill) => skill.status === "Pending").length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {membersWithSkills.map((member) => (
            <Card key={member.id} className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">{member.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">{member.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-primary">
                      {(() => {
                        const MemberRoleIcon = roleIcons[member.role] || Circle
                        return <MemberRoleIcon className="h-3.5 w-3.5" />
                      })()}
                      <span>{member.role}</span>
                    </div>
                    <CardDescription>{member.team} • {member.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {groupedByMember[member.id].map((skill) => (
                    <div key={skill.id} className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{skill.skillName}</h4>
                          <Badge className={cn("mt-1 border text-xs", levelColors[skill.level])}>{skill.level}</Badge>
                        </div>
                        {(permissions.canEditAssignedSkills || permissions.canDeleteAssignedSkills) ? (
                          <div className="flex items-center gap-2">
                            {permissions.canEditAssignedSkills ? (
                              <Button size="sm" variant="outline" onClick={() => openSkillEditModal(skill)}>
                                Edit
                              </Button>
                            ) : null}
                            {permissions.canDeleteAssignedSkills ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteItem(`/api/weekly-skills/${skill.id}`, "Weekly skill deleted successfully.", `Delete skill ${skill.skillName}?`)}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <p className="mb-2 text-xs text-muted-foreground">{skill.description}</p>
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant={skill.status === "Completed" ? "default" : skill.status === "In Progress" ? "secondary" : "outline"}>
                          {skill.status}
                        </Badge>
                        {skill.status !== "Completed" && member.id === currentUser?.id ? (
                          <Button size="sm" variant="ghost" onClick={() => handleMarkSkillComplete(skill.id)}>
                            Complete
                          </Button>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="mr-1">Assigned by</span>
                        <div className="mt-2">
                          {renderMemberIdentity(
                            getMemberById(skill.assignedByUserId) || getMemberByName(skill.assignedBy),
                            skill.assignedBy,
                            { compact: true }
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {membersWithSkills.length === 0 ? (
            <Card className="border border-border shadow-sm">
              <CardContent className="py-12 text-center">
                <GraduationCap className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">No Skills Assigned Yet</h3>
                <p className="text-muted-foreground">Skills will appear here when the backend returns assignments.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    )
  }

  function renderLeaderboard() {
    if (!permissions.canViewLeaderboard) {
      return (
        <Card className="border border-border shadow-sm">
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">Access Restricted</h3>
            <p className="text-muted-foreground">Leaderboard is visible only to captain and leaders.</p>
          </CardContent>
        </Card>
      )
    }

    const rankedMembers = [...leaderboard].sort((a, b) => b.activity_points - a.activity_points)

    return (
      <div className="space-y-6">
        {renderBanner(actionMessage, "success")}
        {renderBanner(actionError)}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Leaderboard</h2>
            <p className="text-muted-foreground">Ranked by activity points from the backend</p>
          </div>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">Full Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-4 text-left font-medium text-muted-foreground">Rank</th>
                    <th className="p-4 text-left font-medium text-muted-foreground">Name</th>
                    <th className="p-4 text-left font-medium text-muted-foreground">Activity Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rankedMembers.map((member, index) => (
                    <tr
                      key={member.id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        member.id === currentUser?.id && "bg-primary/5"
                      )}
                    >
                      <td className="p-4 font-bold text-muted-foreground">{index + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">{member.avatar}</AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-foreground">{member.name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-foreground">{member.activity_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderPerformance() {
    if (!permissions.canViewPerformance) {
      return (
        <Card className="border border-border shadow-sm">
          <CardContent className="py-12 text-center">
            <Eye className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">Access Restricted</h3>
            <p className="text-muted-foreground">You do not have permission to view performance.</p>
          </CardContent>
        </Card>
      )
    }

    const userTasks = tasks.filter((task) => task.assignedTo === currentUser?.id)
    const completedTasks = userTasks.filter((task) => task.status === "Done").length
    const taskProgress = userTasks.length ? Math.round((completedTasks / userTasks.length) * 100) : 0
    const userSkills = skills.filter((skill) => skill.userId === currentUser?.id)
    const completedUserSkills = userSkills.filter((skill) => skill.status === "Completed").length
    const skillProgress = userSkills.length ? Math.round((completedUserSkills / userSkills.length) * 100) : 0
    const currentUserCohort = getCohortFromIdentity(currentUser?.email, currentUser?.roll_number)
    const comparisonPool = currentUserCohort === "all"
      ? leaderboard
      : leaderboard.filter((member) => getCohortFromIdentity(member.email, member.roll_number) === currentUserCohort)
    const rankedPool = sortLeaderboardByActivity(comparisonPool)
    const cohortAverageActivity = rankedPool.length
      ? Math.round(comparisonPool.reduce((sum, member) => sum + member.activity_points, 0) / comparisonPool.length)
      : 0
    const currentRank = rankedPool.findIndex((member) => member.id === currentUser?.id) + 1
    const nextRankMember = currentRank > 1 ? rankedPool[currentRank - 2] : null
    const pointsToNextRank = nextRankMember
      ? Math.max((nextRankMember.activity_points || 0) - (currentUser?.activity_points || 0), 0)
      : 0
    const cohortLabel = currentUserCohort === "senior" ? "senior" : currentUserCohort === "junior" ? "junior" : "overall"
    const insightMessages = [
      currentRank > 0
        ? `Rank ${currentRank} inside the ${cohortLabel} performance group.`
        : "Ranking will appear once leaderboard data is available.",
      pointsToNextRank > 0
        ? `Improve activity by ${pointsToNextRank} point${pointsToNextRank === 1 ? "" : "s"} to reach the next rank.`
        : "You are already at the top of the activity ranking.",
      (currentUser?.activity_points || 0) >= cohortAverageActivity
        ? `You are performing above the ${cohortLabel} activity average.`
        : `You are ${cohortAverageActivity - (currentUser?.activity_points || 0)} point${cohortAverageActivity - (currentUser?.activity_points || 0) === 1 ? "" : "s"} below the ${cohortLabel} activity average.`,
    ]
    const leaderPoints = rankedPool[0]?.activity_points || 0
    const activityVsLeader = leaderPoints ? Math.min(Math.round(((currentUser?.activity_points || 0) / leaderPoints) * 100), 100) : 0
    const activityVsAverage = cohortAverageActivity ? Math.min(Math.round(((currentUser?.activity_points || 0) / cohortAverageActivity) * 100), 100) : 0
    const executionScore = Math.round((taskProgress * 0.6) + (skillProgress * 0.4))
    const spotlightRingData = [
      { key: "leader", label: "Vs Leader", value: activityVsLeader, fill: "var(--color-leader)" },
      { key: "average", label: "Vs Average", value: activityVsAverage, fill: "var(--color-average)" },
      { key: "execution", label: "Execution", value: executionScore, fill: "var(--color-execution)" },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Performance</h2>
          <p className="text-muted-foreground">
            Insight-driven view of your scores, progress, and contribution standing within the {cohortLabel} group.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Activity Points</p>
              <p className="text-3xl font-bold text-foreground">{currentUser?.activity_points || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Used for leaderboard ranking</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Reward Points</p>
              <p className="text-3xl font-bold text-foreground">{currentUser?.reward_points || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Recognition and bonus score</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">CGPA</p>
              <p className="text-3xl font-bold text-foreground">{currentUser?.cgpa || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Academic performance snapshot</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <Card className="overflow-hidden border-white/10 bg-[linear-gradient(145deg,#111827,#0f172a_52%,#020617)] shadow-[0_26px_60px_rgba(2,6,23,0.46)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-white">Performance Spotlight</CardTitle>
              <CardDescription className="text-slate-300">Three quick gauges for competitive standing, consistency, and execution quality.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {spotlightRingData.map((item) => (
                  <div key={item.key} className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-center">
                    <ChartContainer
                      className="mx-auto max-w-[180px]"
                      config={{
                        leader: { label: "Vs Leader", color: "#22c55e" },
                        average: { label: "Vs Average", color: "#38bdf8" },
                        execution: { label: "Execution", color: "#f59e0b" },
                      }}
                      style={{ height: 170 }}
                    >
                      <RadialBarChart
                        data={[item]}
                        innerRadius="68%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar dataKey="value" background clockWise cornerRadius={16} />
                      </RadialBarChart>
                    </ChartContainer>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{item.value}%</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-white">Tasks Completed</span>
                    <span className="text-slate-400">{completedTasks}/{userTasks.length || 0}</span>
                  </div>
                  <Progress value={taskProgress} className="mt-3 h-2" />
                  <p className="mt-3 text-xs text-slate-400">{taskProgress}% completion rate for assigned tasks</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-white">Skills Completed</span>
                    <span className="text-slate-400">{completedUserSkills}/{userSkills.length || 0}</span>
                  </div>
                  <Progress value={skillProgress} className="mt-3 h-2" />
                  <p className="mt-3 text-xs text-slate-400">{skillProgress}% completion rate for assigned skills</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/10 bg-[linear-gradient(160deg,#101826,#0f172a_55%,#020617)] shadow-[0_26px_60px_rgba(2,6,23,0.46)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-white">Performance Narrative</CardTitle>
              <CardDescription className="text-slate-300">Readable decision cues with your current benchmark position.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insightMessages.map((message) => (
                <div key={message} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-100">
                  {message}
                </div>
              ))}
              <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/10 p-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-emerald-100/75">Your Activity</span>
                  <span className="font-medium text-white">{currentUser?.activity_points || 0}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-emerald-100/75">{cohortLabel === "overall" ? "Average" : `${cohortLabel[0].toUpperCase()}${cohortLabel.slice(1)} Average`}</span>
                  <span className="font-medium text-white">{cohortAverageActivity}</span>
                </div>
                <Progress
                  value={cohortAverageActivity ? Math.min(((currentUser?.activity_points || 0) / cohortAverageActivity) * 100, 100) : 0}
                  className="h-2"
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-950/40 p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/65">Rank</p>
                    <p className="mt-2 text-2xl font-semibold text-white">#{currentRank > 0 ? currentRank : "-"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/65">Next Gap</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{pointsToNextRank}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/65">Leader</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{leaderPoints}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr,1.15fr]">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-foreground">Skills Status</CardTitle>
              <CardDescription>Track weekly skill assignments and completion state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills assigned yet.</p>
              ) : (
                userSkills.map((skill) => (
                  <div key={skill.id} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{skill.skillName}</p>
                      <p className="text-sm text-muted-foreground">{skill.description}</p>
                    </div>
                    <Badge variant={skill.status === "Completed" ? "default" : skill.status === "In Progress" ? "secondary" : "outline"}>
                      {skill.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,#0b1220,#111827_58%,#0f172a)] shadow-[0_30px_70px_rgba(2,6,23,0.55)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-white">Performance Arena</CardTitle>
              <CardDescription className="text-slate-300">Premium ranking canvas for the {cohortLabel} group with podium leaders, benchmark line, and live point labels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {performanceShowcaseData.length === 0 ? (
                <p className="text-sm text-slate-300">Performance data will appear once members start earning activity points.</p>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    {performancePodium.map((member, index) => (
                      <div
                        key={member.id}
                        className={cn(
                          "rounded-2xl border px-4 py-4",
                          index === 0 && "border-yellow-400/25 bg-yellow-400/10",
                          index === 1 && "border-slate-300/20 bg-slate-300/10",
                          index === 2 && "border-orange-300/20 bg-orange-300/10"
                        )}
                      >
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Rank {member.rank}</p>
                        <p className="mt-3 truncate text-lg font-semibold text-white">{member.name}</p>
                        <p className="mt-1 text-sm text-slate-300">{member.points} activity points</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <ChartContainer
                      className="w-full"
                      config={{
                        you: { label: "You", color: "#22c55e" },
                        first: { label: "1st", color: "#facc15" },
                        second: { label: "2nd", color: "#cbd5e1" },
                        third: { label: "3rd", color: "#fdba74" },
                        team: { label: "Team", color: "#38bdf8" },
                      }}
                      style={{ height: Math.max(400, performanceShowcaseData.length * 54) }}
                    >
                      <BarChart data={performanceShowcaseData} layout="vertical" margin={{ left: 12, right: 30, top: 12, bottom: 12 }} barCategoryGap={14}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="chartLabel"
                          width={132}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#e2e8f0", fontSize: 12, fontWeight: 500 }}
                        />
                        <ReferenceLine x={cohortAverageActivity} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 5" />
                        <ChartTooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          content={(
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, _name, item) => (
                                <div className="flex min-w-[12rem] items-center justify-between gap-4">
                                  <div>
                                    <p className="font-medium text-white">{item?.payload?.name || "Member"}</p>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Rank {item?.payload?.rank || "-"}</p>
                                  </div>
                                  <span className="font-mono text-white">{value} pts</span>
                                </div>
                              )}
                            />
                          )}
                        />
                        <Bar dataKey="points" radius={12} barSize={28}>
                          <LabelList dataKey="points" position="right" fill="#f8fafc" fontSize={12} />
                          {performanceShowcaseData.map((entry) => (
                            <Cell key={entry.id} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Average Marker</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{cohortAverageActivity}</p>
                      <p className="mt-1 text-xs text-slate-400">Shown as dashed line inside the chart.</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/80">Your Position</p>
                      <p className="mt-2 text-2xl font-semibold text-white">#{currentRank > 0 ? currentRank : "-"}</p>
                      <p className="mt-1 text-xs text-emerald-100/75">Highlighted in green across the arena.</p>
                    </div>
                    <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-sky-100/80">Next Target</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{pointsToNextRank}</p>
                      <p className="mt-1 text-xs text-sky-100/75">Points needed to climb one more rank.</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  function renderSettings() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border border-border shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-foreground">Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{currentUser?.avatar || "--"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{currentUser?.name}</p>
                  <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.role}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Team</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.team}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Joined</p>
                  <p className="mt-1 font-medium text-foreground">{formatDate(currentUser?.joinedAt)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Activity Points</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.activity_points || 0}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward Points</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.reward_points || 0}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">CGPA</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.cgpa || 0}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Roll Number</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.roll_number || "Not set"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.department || "Not set"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Position</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.position || "Not set"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Special Lab</p>
                  <p className="mt-1 font-medium text-foreground">{currentUser?.special_lab || "Not set"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary Skills</p>
                  <p className="mt-1 font-medium text-foreground">{formatSkillPair(currentUser?.primary_skill_1, currentUser?.primary_skill_2)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Secondary Skills</p>
                  <p className="mt-1 font-medium text-foreground">{formatSkillPair(currentUser?.secondary_skill_1, currentUser?.secondary_skill_2)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Special Skills</p>
                  <p className="mt-1 font-medium text-foreground">{formatSkillPair(currentUser?.special_skill_1, currentUser?.special_skill_2)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</p>
                  <p className="mt-1 font-medium text-foreground break-all">{currentUser?.linkedin || "Not set"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">GitHub</p>
                  <p className="mt-1 font-medium text-foreground break-all">{currentUser?.github || "Not set"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">LeetCode</p>
                  <p className="mt-1 font-medium text-foreground break-all">{currentUser?.leetcode || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-foreground">Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">JWT session is active.</p>
              </div>
              <Button onClick={handleLogout} className="w-full bg-primary hover:bg-primary/90">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return renderDashboard()
      case "members":
        return renderMembers()
      case "teams":
        return renderTeams()
      case "projects":
        return renderProjects()
      case "tasks":
        return renderTasks()
      case "skills":
        return renderSkills()
      case "leaderboard":
        return renderLeaderboard()
      case "performance":
        return renderPerformance()
      case "settings":
        return renderSettings()
      default:
        return renderDashboard()
    }
  }

  if (pageError && !isLoading && !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border/70 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Failed to load dashboard</CardTitle>
            <CardDescription>{pageError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={retryLoad} className="w-full">Retry</Button>
            <Button variant="outline" onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isReady || isLoading || !currentUser) {
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

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex",
          sidebarCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
                <Image src="/portal-logo.png" alt="Portal logo" width={36} height={36} className="h-full w-full object-cover" />
              </div>
              <span className="font-semibold text-sidebar-foreground">Team Portal</span>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
              <Image src="/portal-logo.png" alt="Portal logo" width={36} height={36} className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = activePage === item.key

              return (
                <li key={item.key}>
                  <button
                    onClick={() => setActivePage(item.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
                    {!sidebarCollapsed ? <span>{item.name}</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setSidebarCollapsed((previous) => !previous)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <><ChevronLeft className="h-5 w-5" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 border-r border-sidebar-border bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
                  <Image src="/portal-logo.png" alt="Portal logo" width={36} height={36} className="h-full w-full object-cover" />
                </div>
                <span className="font-semibold text-sidebar-foreground">Team Portal</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="px-3 py-4">
              <ul className="space-y-1">
                {visibleMenuItems.map((item) => {
                  const isActive = activePage === item.key

                  return (
                    <li key={item.key}>
                      <button
                        onClick={() => {
                          setActivePage(item.key)
                          setMobileMenuOpen(false)
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", isActive && "text-sidebar-primary")} />
                        <span>{item.name}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>
        </div>
      ) : null}

      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold capitalize text-foreground">{activePage}</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu onOpenChange={handleNotificationsOpenChange}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {unreadNotifications}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                      <span className={cn("text-sm", !notification.read && "font-medium")}>{notification.message}</span>
                      <span className="text-xs text-muted-foreground">{notification.time}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-sm text-primary-foreground">{currentUser.avatar}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">{currentUser.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{currentUser.role}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActivePage("settings")}>Profile Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="space-y-6 p-4 lg:p-6">
          {renderBanner(pageError)}
          {renderPage()}
        </main>

        <Dialog open={taskReminderDialogOpen} onOpenChange={setTaskReminderDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Task Reminder Center</DialogTitle>
              <DialogDescription>
                Quick view of urgent tasks and upcoming reminders as soon as you enter the portal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-rose-700">Overdue</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-900">{overdueTasks.length}</p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-orange-700">Due Today</p>
                  <p className="mt-2 text-2xl font-semibold text-orange-900">{dueTodayTasks.length}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-700">Upcoming Reminders</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-900">{upcomingReminders.length}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Urgent Tasks</p>
                {urgentTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No urgent tasks right now.</p>
                ) : (
                  urgentTasks.slice(0, 6).map((task) => {
                    const urgency = getTaskUrgency(task)

                    return (
                      <div key={task.id} className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.project} • {task.assignee}</p>
                          </div>
                          <Badge className={cn("border", getUrgencyBadgeClasses(urgency.tone))}>{urgency.label}</Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Upcoming Reminders</p>
                {upcomingReminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reminders scheduled in the next 48 hours.</p>
                ) : (
                  upcomingReminders.slice(0, 5).map((reminder) => (
                    <div key={reminder.id} className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">{reminder.description}</p>
                        </div>
                        <Badge variant="outline">{formatDateTime(reminder.dateTime)}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskReminderDialogOpen(false)}>Close</Button>
              <Button onClick={() => {
                setActivePage("tasks")
                setTaskReminderDialogOpen(false)
              }}>
                Open Tasks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={memberModalOpen} onOpenChange={(open) => {
          setMemberModalOpen(open)
          if (!open) resetMemberForm()
        }}>
          <DialogContent className="w-full max-w-2xl overflow-hidden border-0 bg-transparent p-0 shadow-none">
            <div className="rounded-lg border border-border bg-background shadow-xl">
              <div className="max-h-[90vh] overflow-y-auto p-5">
            <DialogHeader>
              <DialogTitle>{editingMemberId ? "Edit Member" : "Add Member"}</DialogTitle>
              <DialogDescription>{editingMemberId ? "Update member details." : "Create a new member account."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input className="mb-3 w-full rounded border p-2" value={memberForm.full_name} onChange={(event) => setMemberForm((prev) => ({ ...prev, full_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input className="mb-3 w-full rounded border p-2" type="email" value={memberForm.email} onChange={(event) => setMemberForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input className="mb-3 w-full rounded border p-2" value={memberForm.roll_number} onChange={(event) => setMemberForm((prev) => ({ ...prev, roll_number: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input className="mb-3 w-full rounded border p-2" value={memberForm.department} onChange={(event) => setMemberForm((prev) => ({ ...prev, department: event.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={memberForm.role_id} onValueChange={(value) => setMemberForm((prev) => ({ ...prev, role_id: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => <SelectItem key={role.value} value={String(role.value)}>{role.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input className="mb-3 w-full rounded border p-2" value={memberForm.position} onChange={(event) => setMemberForm((prev) => ({ ...prev, position: event.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={memberForm.team_id || "none"} onValueChange={(value) => setMemberForm((prev) => ({ ...prev, team_id: value === "none" ? "" : value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Team</SelectItem>
                      {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Special Lab</Label>
                  <Input className="mb-3 w-full rounded border p-2" value={memberForm.special_lab} onChange={(event) => setMemberForm((prev) => ({ ...prev, special_lab: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="mt-4 font-semibold text-foreground">Primary Skills</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Primary Skill 1</Label>
                    <Input className="mb-3 w-full rounded border p-2" placeholder="Primary Skill 1" value={memberForm.primary_skill_1} onChange={(event) => setMemberForm((prev) => ({ ...prev, primary_skill_1: event.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Primary Skill 2</Label>
                    <Input className="mb-3 w-full rounded border p-2" placeholder="Primary Skill 2" value={memberForm.primary_skill_2} onChange={(event) => setMemberForm((prev) => ({ ...prev, primary_skill_2: event.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="mt-4 font-semibold text-foreground">Secondary Skills</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Secondary Skill 1</Label>
                    <Input className="mb-3 w-full rounded border p-2" placeholder="Secondary Skill 1" value={memberForm.secondary_skill_1} onChange={(event) => setMemberForm((prev) => ({ ...prev, secondary_skill_1: event.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Secondary Skill 2</Label>
                    <Input className="mb-3 w-full rounded border p-2" placeholder="Secondary Skill 2" value={memberForm.secondary_skill_2} onChange={(event) => setMemberForm((prev) => ({ ...prev, secondary_skill_2: event.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="mt-4 font-semibold text-foreground">Special Skills</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Special Skill 1</Label>
                    <Input className="mb-3 w-full rounded border p-2" placeholder="Special Skill 1" value={memberForm.special_skill_1} onChange={(event) => setMemberForm((prev) => ({ ...prev, special_skill_1: event.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Special Skill 2</Label>
                    <Input className="mb-3 w-full rounded border p-2" placeholder="Special Skill 2" value={memberForm.special_skill_2} onChange={(event) => setMemberForm((prev) => ({ ...prev, special_skill_2: event.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input className="mb-3 w-full rounded border p-2" value={memberForm.linkedin} onChange={(event) => setMemberForm((prev) => ({ ...prev, linkedin: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>GitHub</Label>
                  <Input className="mb-3 w-full rounded border p-2" value={memberForm.github} onChange={(event) => setMemberForm((prev) => ({ ...prev, github: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>LeetCode</Label>
                  <Input className="mb-3 w-full rounded border p-2" value={memberForm.leetcode} onChange={(event) => setMemberForm((prev) => ({ ...prev, leetcode: event.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Activity Points</Label>
                  <Input className="mb-3 w-full rounded border p-2" type="number" value={memberForm.activity_points} onChange={(event) => setMemberForm((prev) => ({ ...prev, activity_points: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Reward Points</Label>
                  <Input className="mb-3 w-full rounded border p-2" type="number" value={memberForm.reward_points} onChange={(event) => setMemberForm((prev) => ({ ...prev, reward_points: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{editingMemberId ? "New Password" : "Temporary Password"}</Label>
                <Input
                  className="mb-3 w-full rounded border p-2"
                  type="password"
                  placeholder={editingMemberId ? "Leave blank to keep current password" : ""}
                  value={memberForm.password}
                  onChange={(event) => setMemberForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveMember}>{editingMemberId ? "Save Changes" : "Create Member"}</Button>
            </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={memberDetailsOpen} onOpenChange={(open) => {
          setMemberDetailsOpen(open)
          if (!open) {
            setSelectedMember(null)
          }
        }}>
          <DialogContent className="max-w-2xl w-full mx-auto border border-border bg-background p-0">
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <DialogHeader className="mb-6">
                <DialogTitle>Member Details</DialogTitle>
                <DialogDescription>Extended profile data for {selectedMember?.name || "this member"}.</DialogDescription>
              </DialogHeader>
              
              <div className="rounded-2xl border border-border bg-muted/30 p-5 w-full mb-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-xl text-primary">
                        {selectedMember?.avatar || "--"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{selectedMember?.name || "Not set"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedMember?.email || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("border gap-1.5", roleColors[selectedMember?.role || "Member"])}>
                      {(() => {
                        const SelectedRoleIcon = roleIcons[selectedMember?.role || "Member"] || Circle
                        return <SelectedRoleIcon className="h-3 w-3" />
                      })()}
                      {selectedMember?.role || "Member"}
                    </Badge>
                    <Badge variant="outline">{selectedMember?.team || "Unassigned"}</Badge>
                    <Badge variant="outline">{selectedMember?.roll_number || "No roll number"}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {/* Academic Profile */}
                <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Academic Profile</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{selectedMember?.department || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Position</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{selectedMember?.position || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Special Lab</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{selectedMember?.special_lab || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">CGPA</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{selectedMember?.cgpa || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Performance</p>
                  <div className="mt-4 flex justify-between gap-4">
                    <div className="flex-1 text-center">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Activity</p>
                      <p className="mt-2 text-xl font-bold text-foreground">{selectedMember?.activity_points || 0}</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward</p>
                      <p className="mt-2 text-xl font-bold text-foreground">{selectedMember?.reward_points || 0}</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</p>
                      <p className="mt-2 text-xl font-bold text-foreground">{selectedMember?.tasks || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Skills Overview */}
                <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Skills Overview</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Primary Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {getSkillItems(selectedMember?.primary_skill_1, selectedMember?.primary_skill_2).length > 0 ? (
                          getSkillItems(selectedMember?.primary_skill_1, selectedMember?.primary_skill_2).map((skill) => (
                            <Badge key={skill} variant="secondary" className="px-3 py-1 text-xs">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Secondary Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {getSkillItems(selectedMember?.secondary_skill_1, selectedMember?.secondary_skill_2).length > 0 ? (
                          getSkillItems(selectedMember?.secondary_skill_1, selectedMember?.secondary_skill_2).map((skill) => (
                            <Badge key={skill} variant="secondary" className="px-3 py-1 text-xs">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Special Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {getSkillItems(selectedMember?.special_skill_1, selectedMember?.special_skill_2).length > 0 ? (
                          getSkillItems(selectedMember?.special_skill_1, selectedMember?.special_skill_2).map((skill) => (
                            <Badge key={skill} variant="secondary" className="px-3 py-1 text-xs">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Links</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</p>
                      <p className="mt-2 text-sm font-medium text-foreground truncate">{selectedMember?.linkedin || "Not set"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">GitHub</p>
                      <p className="mt-2 text-sm font-medium text-foreground truncate">{selectedMember?.github || "Not set"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">LeetCode</p>
                      <p className="mt-2 text-sm font-medium text-foreground truncate">{selectedMember?.leetcode || "Not set"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setMemberDetailsOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={teamModalOpen} onOpenChange={(open) => {
          setTeamModalOpen(open)
          if (!open) resetTeamForm()
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTeamId ? "Edit Team" : "Create Team"}</DialogTitle>
              <DialogDescription>{editingTeamId ? "Update team details." : "Add a new team."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={teamForm.name} onChange={(event) => setTeamForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={teamForm.description} onChange={(event) => setTeamForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Team Lead</Label>
                <Select value={teamForm.lead_user_id || "none"} onValueChange={(value) => setTeamForm((prev) => ({ ...prev, lead_user_id: value === "none" ? "" : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Lead</SelectItem>
                    {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign Members</Label>
                <div className="max-h-44 overflow-y-auto rounded border border-border bg-muted p-2">
                  {members
                    .filter((member) => !member.teamId || member.teamId === String(editingTeamId))
                    .map((member) => {
                      const isChecked = teamForm.member_ids.includes(member.id)

                      return (
                        <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/70">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setTeamForm((prev) => ({
                                  ...prev,
                                  member_ids: [...new Set([...prev.member_ids, member.id])]
                                }))
                              } else {
                                setTeamForm((prev) => ({
                                  ...prev,
                                  member_ids: prev.member_ids.filter((id) => id !== member.id)
                                }))
                              }
                            }}
                          />
                          <span className="text-sm">{member.name} ({member.email})</span>
                        </label>
                      )
                    })}
                </div>
                <p className="text-xs text-muted-foreground">Only unassigned members are shown for assignment.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTeamModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTeam}>{editingTeamId ? "Save Changes" : "Create Team"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={performanceModalOpen}
          onOpenChange={(open) => {
            setPerformanceModalOpen(open)
            if (!open) {
              resetPerformanceForm()
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Performance</DialogTitle>
              <DialogDescription>Update performance metrics for {performanceForm.name || "this user"}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Activity Points</Label>
                <Input
                  type="number"
                  value={performanceForm.activity_points}
                  onChange={(event) => setPerformanceForm((prev) => ({ ...prev, activity_points: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Reward Points</Label>
                <Input
                  type="number"
                  value={performanceForm.reward_points}
                  onChange={(event) => setPerformanceForm((prev) => ({ ...prev, reward_points: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>CGPA</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={performanceForm.cgpa}
                  onChange={(event) => setPerformanceForm((prev) => ({ ...prev, cgpa: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPerformanceModalOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdatePerformance}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={projectModalOpen} onOpenChange={(open) => {
          setProjectModalOpen(open)
          if (!open) resetProjectForm()
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProjectId ? "Edit Project" : "Create Project"}</DialogTitle>
              <DialogDescription>{editingProjectId ? "Update project details." : "Add a new project."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={projectForm.name} onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={projectForm.description} onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={projectForm.team_id} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, team_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={projectForm.status} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planning">Planning</SelectItem>
                      <SelectItem value="Development">Development</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <Input type="number" min="0" max="100" value={projectForm.progress} onChange={(event) => setProjectForm((prev) => ({ ...prev, progress: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input type="date" value={projectForm.deadline} onChange={(event) => setProjectForm((prev) => ({ ...prev, deadline: event.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProject}>{editingProjectId ? "Save Changes" : "Create Project"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={taskModalOpen} onOpenChange={(open) => {
          setTaskModalOpen(open)
          if (!open) resetTaskForm()
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTaskId ? "Edit Task" : "Create Task"}</DialogTitle>
              <DialogDescription>{editingTaskId ? "Update task details." : "Assign a new task."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={taskForm.project_id} onValueChange={(value) => setTaskForm((prev) => ({ ...prev, project_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2">
                <Label>{editingTaskId ? "Assign To" : "Assign To Members"}</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                  {members.map((member) => {
                    const isChecked = taskForm.assigned_to_user_ids.includes(member.id)
                    const RoleIcon = roleIcons[member.role] || Circle

                    return (
                      <label key={member.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={isChecked}
                            onCheckedChange={(checked) => {
                              setTaskForm((prev) => {
                                if (editingTaskId) {
                                  return {
                                    ...prev,
                                    assigned_to_user_ids: checked ? [member.id] : [],
                                  }
                                }

                                return {
                                  ...prev,
                                  assigned_to_user_ids: checked
                                    ? [...new Set([...prev.assigned_to_user_ids, member.id])]
                                    : prev.assigned_to_user_ids.filter((id) => id !== member.id),
                                }
                              })
                            }}
                          />
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary/10 text-[11px] text-primary">{member.avatar}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{member.name}</span>
                                <RoleIcon className="h-3 w-3 shrink-0 text-primary" />
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editingTaskId ? "Editing keeps one assignee for this task." : "Select multiple members to create the same task for all of them at once."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(value) => setTaskForm((prev) => ({ ...prev, priority: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm((prev) => ({ ...prev, due_date: event.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTask}>{editingTaskId ? "Save Changes" : "Create Task"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={skillModalOpen} onOpenChange={(open) => {
          setSkillModalOpen(open)
          if (!open) resetSkillForm()
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSkillId ? "Edit Weekly Skill" : "Assign Weekly Skill"}</DialogTitle>
              <DialogDescription>{editingSkillId ? "Update this skill assignment." : "Assign a skill for a member."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{editingSkillId ? "Member" : "Assign To Members"}</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                  {members.map((member) => {
                    const isChecked = skillForm.user_ids.includes(member.id)
                    const RoleIcon = roleIcons[member.role] || Circle

                    return (
                      <label key={member.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSkillForm((prev) => {
                              if (editingSkillId) {
                                return {
                                  ...prev,
                                  user_ids: checked ? [member.id] : [],
                                }
                              }

                              return {
                                ...prev,
                                user_ids: checked
                                  ? [...new Set([...prev.user_ids, member.id])]
                                  : prev.user_ids.filter((id) => id !== member.id),
                                }
                              })
                            }}
                          />
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-[11px] text-primary">{member.avatar}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{member.name}</span>
                              <RoleIcon className="h-3 w-3 shrink-0 text-primary" />
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {editingSkillId ? "Editing keeps this skill linked to one member." : "Select multiple members to assign the same skill to all of them at once."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Skill Name</Label>
                <Input value={skillForm.skill_name} onChange={(event) => setSkillForm((prev) => ({ ...prev, skill_name: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={skillForm.level} onValueChange={(value) => setSkillForm((prev) => ({ ...prev, level: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Date</Label>
                  <Input type="date" value={skillForm.assigned_at} onChange={(event) => setSkillForm((prev) => ({ ...prev, assigned_at: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={skillForm.description} onChange={(event) => setSkillForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSkillModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignSkill}>{editingSkillId ? "Save Changes" : "Assign Skill"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={announcementInsightsOpen} onOpenChange={setAnnouncementInsightsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Announcement Reactions</DialogTitle>
              <DialogDescription>
                {selectedAnnouncement ? selectedAnnouncement.title : "Announcement details"}
              </DialogDescription>
            </DialogHeader>
            {selectedAnnouncement ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Likes</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{selectedAnnouncement.likeCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Acknowledged</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{selectedAnnouncement.acknowledgeCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Seen</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{selectedAnnouncement.seenCount}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">Seen By</p>
                  {selectedAnnouncement.seenBy.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No one has seen this announcement yet.</p>
                  ) : (
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                      {selectedAnnouncement.seenBy.map((viewer) => (
                        <div key={`${selectedAnnouncement.id}:${viewer.user_id}`} className="rounded-lg border border-border bg-muted/40 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{viewer.full_name}</p>
                              <p className="text-xs text-muted-foreground">{viewer.email}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDateTime(viewer.reacted_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {currentUser?.roleKey === "captain" ? (
                  <>
                    {renderReactionPeopleList(
                      "Liked By",
                      selectedAnnouncement.likedBy || [],
                      "No likes yet."
                    )}
                    {renderReactionPeopleList(
                      "Acknowledged By",
                      selectedAnnouncement.acknowledgedBy || [],
                      "No acknowledgements yet."
                    )}
                  </>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={announcementModalOpen} onOpenChange={(open) => {
          setAnnouncementModalOpen(open)
          if (!open) resetAnnouncementForm()
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAnnouncementId ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
              <DialogDescription>{editingAnnouncementId ? "Update this announcement." : "Send an announcement to all, a team, or one user."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={announcementForm.title} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={announcementForm.message} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, message: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={announcementForm.target_type} onValueChange={(value) => setAnnouncementForm((prev) => ({ ...prev, target_type: value, target_team_id: "", target_user_id: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {announcementForm.target_type === "team" ? (
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={announcementForm.target_team_id} onValueChange={(value) => setAnnouncementForm((prev) => ({ ...prev, target_team_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {announcementForm.target_type === "user" ? (
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={announcementForm.target_user_id} onValueChange={(value) => setAnnouncementForm((prev) => ({ ...prev, target_user_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAnnouncementModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAnnouncement}>{editingAnnouncementId ? "Save Changes" : "Create Announcement"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={reminderModalOpen} onOpenChange={(open) => {
          setReminderModalOpen(open)
          if (!open) resetReminderForm()
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingReminderId ? "Edit Reminder" : "Create Reminder"}</DialogTitle>
              <DialogDescription>{editingReminderId ? "Update this reminder." : "Set a reminder for all, a team, or one user."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={reminderForm.title} onChange={(event) => setReminderForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={reminderForm.description} onChange={(event) => setReminderForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={reminderForm.remind_at} onChange={(event) => setReminderForm((prev) => ({ ...prev, remind_at: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={reminderForm.target_type} onValueChange={(value) => setReminderForm((prev) => ({ ...prev, target_type: value, target_team_id: "", target_user_id: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reminderForm.target_type === "team" ? (
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={reminderForm.target_team_id} onValueChange={(value) => setReminderForm((prev) => ({ ...prev, target_team_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {reminderForm.target_type === "user" ? (
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={reminderForm.target_user_id} onValueChange={(value) => setReminderForm((prev) => ({ ...prev, target_user_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReminderModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveReminder}>{editingReminderId ? "Save Changes" : "Create Reminder"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
