"use client"

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

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

function getRealtimeRootUrl() {
  const normalizedBase = RAW_BASE_URL.replace(/\/+$/, "")

  try {
    const parsedUrl = new URL(normalizedBase)
    const apiIndex = parsedUrl.pathname.indexOf("/api")

    parsedUrl.pathname = apiIndex >= 0 ? parsedUrl.pathname.slice(0, apiIndex) : parsedUrl.pathname
    parsedUrl.search = ""
    parsedUrl.hash = ""

    return parsedUrl.toString().replace(/\/+$/, "")
  } catch {
    return normalizedBase.replace(/\/api(?:\/.*)?$/, "")
  }
}

const API_ROOT_URL = getApiRootUrl()
export const REALTIME_ROOT_URL = getRealtimeRootUrl()

const TOKEN_KEY = "sbk-token"
const USER_ID_KEY = "userId"
const ROLE_ID_KEY = "roleId"
const ROLE_KEY = "role"
const USER_KEY = "user"
const LEGACY_ROLE_KEY = "sbk-role"
const LEGACY_EMAIL_KEY = "sbk-email"
const REMEMBER_ME_KEY = "sbk-remember-me"

function getStorageEntries() {
  if (typeof window === "undefined") {
    return []
  }

  return [window.sessionStorage, window.localStorage]
}

function getStoredValue(key) {
  for (const storage of getStorageEntries()) {
    const value = storage.getItem(key)
    if (value !== null) {
      return value
    }
  }

  return null
}

function clearStorageKeys(storage) {
  storage.removeItem(TOKEN_KEY)
  storage.removeItem(USER_ID_KEY)
  storage.removeItem(ROLE_ID_KEY)
  storage.removeItem(ROLE_KEY)
  storage.removeItem(USER_KEY)
  storage.removeItem(LEGACY_ROLE_KEY)
  storage.removeItem(LEGACY_EMAIL_KEY)
  storage.removeItem(REMEMBER_ME_KEY)
}

function getParsedStoredUser() {
  const rawUser = getStoredValue(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

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
  return getStoredValue(TOKEN_KEY)
}

export function getStoredAuth() {
  if (typeof window === "undefined") {
    return { token: null, userId: null, roleId: null, role: null, user: null }
  }

  return {
    token: getStoredValue(TOKEN_KEY),
    userId: getStoredValue(USER_ID_KEY),
    roleId: getStoredValue(ROLE_ID_KEY),
    role: getStoredValue(ROLE_KEY) || getStoredValue(LEGACY_ROLE_KEY),
    user: getParsedStoredUser(),
  }
}

export function persistAuth({ token, userId, roleId, role, email, rememberMe, user }) {
  if (typeof window === "undefined") {
    return
  }

  const targetStorage = rememberMe ? window.localStorage : window.sessionStorage
  const resolvedUser = user || {
    id: userId,
    roleId,
    role,
    email: email || "",
  }

  clearStoredAuth()

  targetStorage.setItem(TOKEN_KEY, token)
  targetStorage.setItem(USER_ID_KEY, String(userId))
  targetStorage.setItem(ROLE_ID_KEY, String(roleId))
  targetStorage.setItem(ROLE_KEY, role)
  targetStorage.setItem(LEGACY_ROLE_KEY, role)
  targetStorage.setItem(USER_KEY, JSON.stringify(resolvedUser))

  if (email) {
    targetStorage.setItem(LEGACY_EMAIL_KEY, email)
  }

  if (typeof rememberMe === "boolean") {
    targetStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(rememberMe))
  }
}

export function clearStoredAuth() {
  if (typeof window === "undefined") {
    return
  }

  clearStorageKeys(window.sessionStorage)
  clearStorageKeys(window.localStorage)
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
