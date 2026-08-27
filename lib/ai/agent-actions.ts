"use client";

import { useRouter } from "next/navigation";

export type AgentAction =
  | { type: "navigate"; path: string }
  | { type: "open_modal"; modal: string }
  | { type: "close_modal"; modal: string }
  | { type: "toggle_setting"; setting: string }
  | { type: "scroll_to"; target: string }
  | { type: "click_element"; selector: string }
  | { type: "fill_input"; selector: string; value: string }
  | { type: "submit_form"; selector?: string }
  | { type: "toggle_theme" }
  | { type: "toggle_sidebar" }
  | { type: "show_toast"; message: string; toastType?: "success" | "error" | "info" }
  | { type: "open_chat"; peer?: string }
  | { type: "create_event"; title: string; date?: string; time?: string }
  | { type: "approve_item"; id: string }
  | { type: "invite_member"; email: string; role: string };

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
    case "toggle_setting":
      return { type: "toggle_setting", setting: value };
    case "scroll_to":
      return { type: "scroll_to", target: value };
    case "click":
      return { type: "click_element", selector: value };
    case "fill":
      const [sel, val] = value.split("|");
      return { type: "fill_input", selector: sel?.trim() ?? "", value: val?.trim() ?? "" };
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
    case "create_event":
      const parts = value.split("|");
      return { type: "create_event", title: parts[0] ?? "", date: parts[1], time: parts[2] };
    case "approve":
      return { type: "approve_item", id: value };
    case "invite":
      const [email, role] = value.split("|");
      return { type: "invite_member", email: email?.trim() ?? "", role: role?.trim() ?? "" };
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

    case "toggle_theme":
      document.documentElement.classList.toggle("dark");
      const isDark = document.documentElement.classList.contains("dark");
      localStorage.setItem("celeste-theme", isDark ? "dark" : "light");
      break;

    case "toggle_sidebar":
      // Dispatch custom event that LayoutProvider listens to
      window.dispatchEvent(new CustomEvent("celeste-toggle-sidebar"));
      break;

    case "open_chat":
      if (action.peer) {
        router.push(`/chat?peer=${action.peer}`);
      } else {
        router.push("/chat");
      }
      break;

    case "show_toast":
      showToast(action.message, action.toastType);
      break;

    case "scroll_to":
      const el = document.getElementById(action.target) || document.querySelector(`[data-section="${action.target}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      break;

    case "click_element":
      const btn = document.querySelector(action.selector) as HTMLElement;
      btn?.click();
      break;

    case "fill_input":
      const input = document.querySelector(action.selector) as HTMLInputElement;
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(input, action.value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      break;

    case "submit_form":
      const form = action.selector
        ? document.querySelector(action.selector) as HTMLFormElement
        : document.querySelector("form");
      form?.requestSubmit();
      break;

    default:
      break;
  }
}

// Simple toast notification
function showToast(message: string, type: "success" | "error" | "info" = "info") {
  const colors = {
    success: "bg-gray-900 text-white",
    error: "bg-red-600 text-white",
    info: "bg-gray-800 text-white",
  };

  const toast = document.createElement("div");
  toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${colors[type]} animate-in fade-in slide-in-from-bottom-2 duration-300`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("animate-out", "fade-out", "slide-out-to-bottom-2");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Execute all actions from an AI response
export function executeActions(actions: AgentAction[], router: ReturnType<typeof useRouter>) {
  actions.forEach((action, i) => {
    setTimeout(() => executeAction(action, router), i * 300);
  });
}
