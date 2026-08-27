"use client";

import { useRouter } from "next/navigation";

export type AgentAction =
  // Navigation
  | { type: "navigate"; path: string }
  // UI
  | { type: "open_modal"; modal: string }
  | { type: "close_modal"; modal: string }
  | { type: "toggle_theme" }
  | { type: "toggle_sidebar" }
  | { type: "scroll_to"; target: string }
  | { type: "show_toast"; message: string; toastType?: "success" | "error" | "info" }
  // DOM interaction
  | { type: "click_element"; selector: string }
  | { type: "fill_input"; selector: string; value: string }
  | { type: "submit_form"; selector?: string }
  // Chat / DM
  | { type: "open_chat"; peer?: string }
  | { type: "send_dm"; peer: string; message: string }
  // Data actions
  | { type: "create_event"; title: string; date?: string; time?: string }
  | { type: "approve_item"; id: string }
  | { type: "invite_member"; email: string; role: string; name?: string }
  // Settings
  | { type: "set_language"; lang: string }
  // Tab/pill
  | { type: "click_tab"; tab: string }
  | { type: "set_page"; page: string };

// Parse action commands from AI response text
export function parseActions(text: string): { cleanText: string; actions: AgentAction[] } {
  const actionRegex = /\[ACTION:\s*([^\]]+)\]/g;
  const actions: AgentAction[] = [];
  let cleanText = text;

  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    const actionStr = match[1].trim();
    const action = parseActionString(actionStr);
    if (action) actions.push(action);
    cleanText = cleanText.replace(match[0], "").trim();
  }

  return { cleanText, actions };
}

function parseActionString(str: string): AgentAction | null {
  const [type, ...rest] = str.split(":");
  const value = rest.join(":").trim();

  switch (type) {
    case "navigate":
      return { type: "navigate", path: value };
    case "open_modal":
      return { type: "open_modal", modal: value };
    case "close_modal":
      return { type: "close_modal", modal: value };
    case "scroll_to":
      return { type: "scroll_to", target: value };
    case "click":
      return { type: "click_element", selector: value };
    case "fill": {
      const [sel, val] = value.split("|");
      return { type: "fill_input", selector: sel?.trim() ?? "", value: val?.trim() ?? "" };
    }
    case "submit":
      return { type: "submit_form", selector: value || undefined };
    case "toggle_theme":
      return { type: "toggle_theme" };
    case "toggle_sidebar":
      return { type: "toggle_sidebar" };
    case "toast":
      return { type: "show_toast", message: value };
    case "chat":
      return { type: "open_chat", peer: value || undefined };
    case "send_dm": {
      const [peer, msg] = value.split("|");
      return { type: "send_dm", peer: peer?.trim() ?? "", message: msg?.trim() ?? "" };
    }
    case "create_event": {
      const parts = value.split("|");
      return { type: "create_event", title: parts[0] ?? "", date: parts[1], time: parts[2] };
    }
    case "approve":
      return { type: "approve_item", id: value };
    case "invite": {
      const [email, role, name] = value.split("|");
      return { type: "invite_member", email: email?.trim() ?? "", role: role?.trim() ?? "", name: name?.trim() };
    }
    case "set_language":
      return { type: "set_language", lang: value };
    case "click_tab":
      return { type: "click_tab", tab: value };
    case "set_page":
      return { type: "set_page", page: value };
    default:
      return null;
  }
}

// Execute a single action
export function executeAction(action: AgentAction, router: ReturnType<typeof useRouter>) {
  switch (action.type) {
    case "navigate":
      router.push(action.path);
      break;

    case "toggle_theme": {
      const html = document.documentElement;
      const isDark = html.classList.contains("dark");
      if (isDark) {
        html.classList.remove("dark");
        localStorage.setItem("celeste-theme", "light");
      } else {
        html.classList.add("dark");
        localStorage.setItem("celeste-theme", "dark");
      }
      showToast(isDark ? "Switched to light mode" : "Switched to dark mode", "success");
      break;
    }

    case "toggle_sidebar":
      window.dispatchEvent(new CustomEvent("celeste-toggle-sidebar"));
      break;

    case "open_chat":
      if (action.peer) {
        router.push(`/chat?peer=${encodeURIComponent(action.peer)}`);
      } else {
        router.push("/chat");
      }
      break;

    case "send_dm":
      // Navigate to chat — the peer parameter opens the DM
      router.push(`/chat?peer=${encodeURIComponent(action.peer)}&auto=${encodeURIComponent(action.message)}`);
      break;

    case "show_toast":
      showToast(action.message, action.toastType);
      break;

    case "scroll_to": {
      const el =
        document.getElementById(action.target) ||
        document.querySelector(`[data-section="${action.target}"]`) ||
        document.querySelector(`[data-tab="${action.target}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }

    case "click_element": {
      const btn = document.querySelector(action.selector) as HTMLElement;
      btn?.click();
      break;
    }

    case "fill_input": {
      const input = document.querySelector(action.selector) as HTMLInputElement;
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        nativeInputValueSetter?.call(input, action.value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      break;
    }

    case "submit_form": {
      const form = action.selector
        ? (document.querySelector(action.selector) as HTMLFormElement)
        : document.querySelector("form");
      form?.requestSubmit();
      break;
    }

    case "set_language": {
      try {
        localStorage.setItem("celeste-locale", action.lang);
        window.location.reload();
      } catch { /* ignore */ }
      break;
    }

    case "click_tab": {
      // Try to find and click a tab/pill button by text content
      const allButtons = Array.from(document.querySelectorAll("button"));
      const btn = allButtons.find(
        (b) => b.textContent?.toLowerCase().includes(action.tab.toLowerCase()),
      );
      btn?.click();
      break;
    }

    case "set_page": {
      // Map common names to routes
      const routeMap: Record<string, string> = {
        home: "/home",
        dashboard: "/dashboard",
        chat: "/chat",
        teams: "/teams",
        org: "/org-chart",
        "org-chart": "/org-chart",
        calendar: "/calendar",
        documents: "/documents",
        settings: "/settings",
        approvals: "/approvals",
        ideas: "/ideas",
        reports: "/reports",
        notion: "/notion",
        equity: "/equity",
        developers: "/developers",
      };
      const route = routeMap[action.page.toLowerCase()] ?? `/${action.page.toLowerCase()}`;
      router.push(route);
      break;
    }

    default:
      break;
  }
}

// Simple toast notification
function showToast(
  message: string,
  type: "success" | "error" | "info" = "info",
) {
  const colors = {
    success: "bg-gray-900 text-white dark:bg-white dark:text-gray-900",
    error: "bg-red-600 text-white",
    info: "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900",
  };

  const toast = document.createElement("div");
  toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${colors[type]}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 300ms";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Execute all actions from an AI response with staggered timing
export function executeActions(
  actions: AgentAction[],
  router: ReturnType<typeof useRouter>,
) {
  actions.forEach((action, i) => {
    setTimeout(() => executeAction(action, router), i * 300);
  });
}
