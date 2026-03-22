"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { io } from "socket.io-client"
import { getStoredAuth, REALTIME_ROOT_URL } from "@/lib/api"
import { useAppStore } from "@/lib/app-store"

export default function RealtimeProvider({ children }) {
  const pathname = usePathname()
  const requestRefresh = useAppStore((state) => state.requestRefresh)
  const resetStore = useAppStore((state) => state.resetStore)
  const socketRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const { token } = getStoredAuth()

    if (!token) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }

      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }

      resetStore()
      return undefined
    }

    if (!socketRef.current) {
      socketRef.current = io(REALTIME_ROOT_URL, {
        transports: ["websocket", "polling"],
      })
    }

    const socket = socketRef.current
    const handleDataChanged = (payload) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        requestRefresh(payload)
      }, 150)
    }

    socket.on("data_changed", handleDataChanged)

    return () => {
      socket.off("data_changed", handleDataChanged)
    }
  }, [pathname, requestRefresh, resetStore])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  return children
}
