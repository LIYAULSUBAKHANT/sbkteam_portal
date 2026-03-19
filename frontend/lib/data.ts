// Dummy data for SBK Team Management Portal

export type Role = "Captain" | "Vice Captain" | "Manager" | "Member"
export type TaskStatus = "Pending" | "In Progress" | "Done"
export type ProjectStatus = "Planning" | "Development" | "Completed"

export interface Member {
  id: string
  name: string
  email: string
  role: Role
  team: string
  skills: string[]
  avatar: string
  points: number
  joinedAt: string
}

export interface Team {
  id: string
  name: string
  lead: string
  members: string[]
  description: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  team: string
  progress: number
  deadline: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  assignee: string
  project: string
  priority: "Low" | "Medium" | "High"
  dueDate: string
}

export interface Activity {
  id: string
  user: string
  action: string
  target: string
  timestamp: string
}

export const members: Member[] = [
  {
    id: "1",
    name: "Alex Chen",
    email: "alex@sbk.team",
    role: "Captain",
    team: "Team Alpha",
    skills: ["Leadership", "Strategy", "Frontend"],
    avatar: "AC",
    points: 2850,
    joinedAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Sarah Miller",
    email: "sarah@sbk.team",
    role: "Vice Captain",
    team: "Team Alpha",
    skills: ["Backend", "DevOps", "Mentoring"],
    avatar: "SM",
    points: 2420,
    joinedAt: "2024-02-01",
  },
  {
    id: "3",
    name: "James Wilson",
    email: "james@sbk.team",
    role: "Manager",
    team: "Team Beta",
    skills: ["Project Management", "UI/UX", "Analytics"],
    avatar: "JW",
    points: 2180,
    joinedAt: "2024-02-15",
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily@sbk.team",
    role: "Member",
    team: "Team Alpha",
    skills: ["React", "TypeScript", "Testing"],
    avatar: "ED",
    points: 1950,
    joinedAt: "2024-03-01",
  },
  {
    id: "5",
    name: "Michael Brown",
    email: "michael@sbk.team",
    role: "Member",
    team: "Team Beta",
    skills: ["Node.js", "Database", "API Design"],
    avatar: "MB",
    points: 1820,
    joinedAt: "2024-03-10",
  },
  {
    id: "6",
    name: "Lisa Johnson",
    email: "lisa@sbk.team",
    role: "Manager",
    team: "Team Gamma",
    skills: ["Marketing", "Content", "Social Media"],
    avatar: "LJ",
    points: 1750,
    joinedAt: "2024-03-15",
  },
  {
    id: "7",
    name: "David Lee",
    email: "david@sbk.team",
    role: "Member",
    team: "Team Gamma",
    skills: ["Python", "ML", "Data Analysis"],
    avatar: "DL",
    points: 1680,
    joinedAt: "2024-04-01",
  },
  {
    id: "8",
    name: "Amanda White",
    email: "amanda@sbk.team",
    role: "Member",
    team: "Team Beta",
    skills: ["Design", "Figma", "Prototyping"],
    avatar: "AW",
    points: 1540,
    joinedAt: "2024-04-10",
  },
]

export const teams: Team[] = [
  {
    id: "1",
    name: "Team Alpha",
    lead: "Alex Chen",
    members: ["1", "2", "4"],
    description: "Frontend development and user experience team",
  },
  {
    id: "2",
    name: "Team Beta",
    lead: "James Wilson",
    members: ["3", "5", "8"],
    description: "Backend infrastructure and API development team",
  },
  {
    id: "3",
    name: "Team Gamma",
    lead: "Lisa Johnson",
    members: ["6", "7"],
    description: "Marketing, content, and data analytics team",
  },
]

export const projects: Project[] = [
  {
    id: "1",
    name: "Dashboard Redesign",
    description: "Complete overhaul of the admin dashboard UI",
    status: "Development",
    team: "Team Alpha",
    progress: 75,
    deadline: "2026-04-15",
    createdAt: "2026-01-10",
  },
  {
    id: "2",
    name: "API v2 Migration",
    description: "Migrate all endpoints to new API version",
    status: "Planning",
    team: "Team Beta",
    progress: 25,
    deadline: "2026-05-01",
    createdAt: "2026-02-01",
  },
  {
    id: "3",
    name: "Mobile App Launch",
    description: "Launch companion mobile application",
    status: "Development",
    team: "Team Alpha",
    progress: 60,
    deadline: "2026-04-30",
    createdAt: "2026-01-20",
  },
  {
    id: "4",
    name: "Analytics Platform",
    description: "Build comprehensive analytics dashboard",
    status: "Planning",
    team: "Team Gamma",
    progress: 15,
    deadline: "2026-06-01",
    createdAt: "2026-03-01",
  },
  {
    id: "5",
    name: "Security Audit",
    description: "Complete security review and improvements",
    status: "Completed",
    team: "Team Beta",
    progress: 100,
    deadline: "2026-03-01",
    createdAt: "2026-01-05",
  },
]

export const tasks: Task[] = [
  {
    id: "1",
    title: "Implement new sidebar navigation",
    description: "Create responsive sidebar with all menu items",
    status: "Done",
    assignee: "Emily Davis",
    project: "Dashboard Redesign",
    priority: "High",
    dueDate: "2026-03-20",
  },
  {
    id: "2",
    title: "Design stats cards component",
    description: "Create reusable stats card with animations",
    status: "In Progress",
    assignee: "Amanda White",
    project: "Dashboard Redesign",
    priority: "Medium",
    dueDate: "2026-03-25",
  },
  {
    id: "3",
    title: "Set up API versioning",
    description: "Configure API versioning middleware",
    status: "Pending",
    assignee: "Michael Brown",
    project: "API v2 Migration",
    priority: "High",
    dueDate: "2026-04-01",
  },
  {
    id: "4",
    title: "Create user authentication flow",
    description: "Implement OAuth and JWT authentication",
    status: "In Progress",
    assignee: "Sarah Miller",
    project: "Mobile App Launch",
    priority: "High",
    dueDate: "2026-03-28",
  },
  {
    id: "5",
    title: "Design analytics widgets",
    description: "Create chart components for analytics",
    status: "Pending",
    assignee: "David Lee",
    project: "Analytics Platform",
    priority: "Medium",
    dueDate: "2026-04-15",
  },
  {
    id: "6",
    title: "Write API documentation",
    description: "Document all API endpoints with examples",
    status: "Pending",
    assignee: "James Wilson",
    project: "API v2 Migration",
    priority: "Low",
    dueDate: "2026-04-20",
  },
]

export const activities: Activity[] = [
  {
    id: "1",
    user: "Alex Chen",
    action: "completed task",
    target: "Implement new sidebar navigation",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    user: "Sarah Miller",
    action: "started working on",
    target: "Create user authentication flow",
    timestamp: "3 hours ago",
  },
  {
    id: "3",
    user: "James Wilson",
    action: "created project",
    target: "Analytics Platform",
    timestamp: "5 hours ago",
  },
  {
    id: "4",
    user: "Emily Davis",
    action: "assigned to",
    target: "Design stats cards component",
    timestamp: "1 day ago",
  },
  {
    id: "5",
    user: "Michael Brown",
    action: "updated status of",
    target: "API v2 Migration",
    timestamp: "1 day ago",
  },
]

export const stats = {
  totalMembers: members.length,
  activeProjects: projects.filter((p) => p.status !== "Completed").length,
  tasksPending: tasks.filter((t) => t.status === "Pending").length,
  topPerformer: members.sort((a, b) => b.points - a.points)[0],
}
