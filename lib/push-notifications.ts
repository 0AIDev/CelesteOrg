"use client";

// Request browser push notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Send a browser notification (only if permission granted and page not focused)
export function sendBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Don't notify if the page is focused
  if (document.hasFocus()) return;

  const n = new Notification(title, {
    body,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    tag: "celeste-dm",
  } as NotificationOptions);

  if (onClick) {
    n.onclick = () => {
      window.focus();
      onClick();
      n.close();
    };
  }
}

// Check if notifications are supported and enabled
export function notificationsAvailable(): boolean {
  return "Notification" in window && Notification.permission !== "denied";
}
