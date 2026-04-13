"use client"

import { apiGet, apiPost } from "@/lib/api"

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window
}

export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) {
    return false
  }

  const registration = await navigator.serviceWorker.register("/service-worker.js")
  const subscription = await registration.pushManager.getSubscription()
  return Boolean(subscription)
}

export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    throw new Error("This browser does not support push notifications.")
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.")
  }

  const config = await apiGet("/api/push-subscriptions/public-key")
  if (!config.publicKey) {
    throw new Error("Browser push is not configured in the backend.")
  }

  const registration = await navigator.serviceWorker.register("/service-worker.js")
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    })
  }

  await apiPost("/api/push-subscriptions/subscribe", subscription.toJSON())
  return true
}

export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) {
    return false
  }

  const registration = await navigator.serviceWorker.register("/service-worker.js")
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    return true
  }

  await apiPost("/api/push-subscriptions/unsubscribe", { endpoint: subscription.endpoint })
  await subscription.unsubscribe()
  return true
}
