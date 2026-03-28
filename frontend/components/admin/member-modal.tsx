"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Member, type Role, teams } from "@/lib/data"

interface MemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
  onSubmit: (data: Partial<Member>) => void
}

const roles: Role[] = ["Captain", "Vice Captain", "Manager", "Member"]
const skillOptions = ["React", "TypeScript", "Node.js", "Python", "Design", "DevOps", "Leadership", "Marketing", "Analytics", "UI/UX"]

export function MemberModal({ open, onOpenChange, member, onSubmit }: MemberModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Member" as Role,
    team: "Team Alpha",
    skills: [] as string[],
  })

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        role: member.role,
        team: member.team,
        skills: member.skills,
      })
    } else {
      setFormData({
        name: "",
        email: "",
        role: "Member",
        team: "Team Alpha",
        skills: [],
      })
    }
  }, [member, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 glass-card rounded-xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {member ? "Edit Member" : "Add New Member"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
              className="w-full rounded-lg bg-muted border-none px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              required
              className="w-full rounded-lg bg-muted border-none px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
              className="w-full rounded-lg bg-muted border-none px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Team
            </label>
            <select
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              className="w-full rounded-lg bg-muted border-none px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Skills Overview */}
          {member && (
            <div className="pt-2">
              {/* Primary Skills */}
              {(member.primary_skill_1 || member.primary_skill_2) && (
                <div className="mt-6">
                  <h3 className="mb-2 text-sm text-muted-foreground">Primary Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {member.primary_skill_1 && <span className="skill-badge">{member.primary_skill_1}</span>}
                    {member.primary_skill_2 && <span className="skill-badge">{member.primary_skill_2}</span>}
                  </div>
                </div>
              )}

              {/* Secondary Skills */}
              {(member.secondary_skill_1 || member.secondary_skill_2) && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm text-muted-foreground">Secondary Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {member.secondary_skill_1 && <span className="skill-badge">{member.secondary_skill_1}</span>}
                    {member.secondary_skill_2 && <span className="skill-badge">{member.secondary_skill_2}</span>}
                  </div>
                </div>
              )}

              {/* Special Skills */}
              {(member.special_skill_1 || member.special_skill_2) && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm text-muted-foreground">Special Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {member.special_skill_1 && <span className="skill-badge">{member.special_skill_1}</span>}
                    {member.special_skill_2 && <span className="skill-badge">{member.special_skill_2}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {member ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
