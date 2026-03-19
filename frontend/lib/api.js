"use client"

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

function getApiRootUrl() {
  const normalizedBase = RAW_BASE_URL.replace(/\/+$/, "")

  try {
    const parsedUrl = new URL(normalizedBase)
    const apiIndex = parsedUrl.pathname.indexOf("/api")

    parsedUrl.pathname = apiIndex >= 0 ? parsedUrl.pathname.slice(0, apiIndex + 4) : ""
    parsedUrl.search = ""
    parsedUrl.hash = ""

    return parsedUrl.toString().replace(/\/+$/, "")
  } catch {
    return normalizedBase.replace(/\/api(?:\/.*)?$/, "/api")
  }
}

const API_ROOT_URL = getApiRootUrl()

const TOKEN_KEY = "sbk-token"
const USER_ID_KEY = "userId"
const ROLE_ID_KEY = "roleId"
const ROLE_KEY = "role"

export class ApiError extends Error {
  constructor(message, status, payload, requestUrl) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
    this.requestUrl = requestUrl
  }
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const apiPath = normalizedPath.startsWith("/api/") ? normalizedPath : `/api${normalizedPath}`

  if (API_ROOT_URL.endsWith("/api")) {
    return `${API_ROOT_URL}${apiPath.replace(/^\/api/, "")}`
  }

  return `${API_ROOT_URL}${apiPath}`
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredAuth() {
  if (typeof window === "undefined") {
    return { token: null, userId: null, roleId: null, role: null }
  }

  return {
    token: localStorage.getItem(TOKEN_KEY),
    userId: localStorage.getItem(USER_ID_KEY),
    roleId: localStorage.getItem(ROLE_ID_KEY),
    role: localStorage.getItem(ROLE_KEY) || localStorage.getItem("sbk-role"),
  }
}

export function persistAuth({ token, userId, roleId, role, email, rememberMe }) {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_ID_KEY, String(userId))
  localStorage.setItem(ROLE_ID_KEY, String(roleId))
  localStorage.setItem(ROLE_KEY, role)
  localStorage.setItem("sbk-role", role)

  if (email) {
    localStorage.setItem("sbk-email", email)
  }

  if (typeof rememberMe === "boolean") {
    localStorage.setItem("sbk-remember-me", JSON.stringify(rememberMe))
  }
}

export function clearStoredAuth() {
  if (typeof window === "undefined") {
    return
  }

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(ROLE_ID_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem("sbk-role")
  localStorage.removeItem("sbk-email")
  localStorage.removeItem("sbk-remember-me")
}

export function roleIdToStorageRole(roleId) {
  const normalizedRoleId = Number(roleId)

  if (normalizedRoleId === 1) return "captain"
  if (normalizedRoleId === 2) return "vice_captain"
  if (normalizedRoleId === 3) return "manager"
  if (normalizedRoleId === 4) return "strategist"
  return "member"
}

export function getDashboardRoute(roleId) {
  return Number(roleId) >= 1 && Number(roleId) <= 4 ? "/admin/dashboard" : "/member/dashboard"
}

export async function apiRequest(path, options = {}) {
  const requestUrl = buildApiUrl(path)
  const token = getStoredToken()
  const headers = new Headers(options.headers || {})
  const method = options.method || "GET"

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  let response

  try {
    console.log("[API]", method, requestUrl)
    response = await fetch(requestUrl, {
      ...options,
      headers,
    })
  } catch (error) {
    throw new ApiError(
      "Failed to fetch.",
      0,
      { cause: error?.message || "Network request failed." },
      requestUrl
    )
  }

  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || "Request failed.",
      response.status,
      payload,
      requestUrl
    )
  }

  return payload
}

export function apiGet(path) {
  return apiRequest(path)
}

export function apiPost(path, body) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function apiPatch(path, body) {
  return apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function apiPut(path, body) {
  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function apiDelete(path) {
  return apiRequest(path, {
    method: "DELETE",
  })
}
