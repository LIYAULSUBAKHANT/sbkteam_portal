"use client"

import { create } from "zustand"

const initialState = {
  currentUser: null,
  users: [],
  teams: [],
  projects: [],
  tasks: [],
  skills: [],
  announcements: [],
  reminders: [],
  notifications: [],
  leaderboard: [],
  refreshToken: 0,
  lastChange: null,
}

function resolveValue(value, previousValue) {
  return typeof value === "function" ? value(previousValue) : value
}

export const useAppStore = create((set) => ({
  ...initialState,
  setCurrentUser: (value) => set((state) => ({ currentUser: resolveValue(value, state.currentUser) })),
  setUsers: (value) => set((state) => ({ users: resolveValue(value, state.users) })),
  setTeams: (value) => set((state) => ({ teams: resolveValue(value, state.teams) })),
  setProjects: (value) => set((state) => ({ projects: resolveValue(value, state.projects) })),
  setTasks: (value) => set((state) => ({ tasks: resolveValue(value, state.tasks) })),
  setSkills: (value) => set((state) => ({ skills: resolveValue(value, state.skills) })),
  setAnnouncements: (value) => set((state) => ({ announcements: resolveValue(value, state.announcements) })),
  setReminders: (value) => set((state) => ({ reminders: resolveValue(value, state.reminders) })),
  setNotifications: (value) => set((state) => ({ notifications: resolveValue(value, state.notifications) })),
  setLeaderboard: (value) => set((state) => ({ leaderboard: resolveValue(value, state.leaderboard) })),
  setDashboardData: (data) =>
    set({
      currentUser: data.currentUser,
      users: data.users,
      teams: data.teams,
      projects: data.projects,
      tasks: data.tasks,
      skills: data.skills,
      announcements: data.announcements,
      reminders: data.reminders,
      notifications: data.notifications,
      leaderboard: data.leaderboard,
    }),
  requestRefresh: (payload) =>
    set((state) => ({
      refreshToken: state.refreshToken + 1,
      lastChange: payload || null,
    })),
  resetStore: () => set(initialState),
}))
