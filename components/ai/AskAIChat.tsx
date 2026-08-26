"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Assistant } from "@/components/ai/Assistant";
import { cn } from "@/lib/utils";

export function AskAIChat({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      {/* Minimal black floating button — bottom right, hidden while the drawer is open */}
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Ask Celeste"
        className={cn(
          "fixed bottom-5 right-5 z-40 inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-[0.6rem] border border-gray-900 bg-gray-900 px-2.5 text-[13px] font-medium text-white shadow-none transition-colors hover:bg-gray-800 active:bg-gray-950",
          open && "hidden",
        )}
      >
        <svg
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="ml-[-3px] mr-[5px] h-[18px] w-[18px] shrink-0"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          style={{ strokeWidth: 1.5 }}
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.563 2.813h-5.25a2.25 2.25 0 0 0-2.25 2.25v6.375a2.25 2.25 0 0 0 2.25 2.25h2.176a.75.75 0 0 1 .482.175l1.548 1.298a.75.75 0 0 0 .96.003l1.575-1.304a.75.75 0 0 1 .478-.172h2.156a2.25 2.25 0 0 0 2.25-2.25v-2.25"
          />
          <path
            fill="currentColor"
            d="m15.18 3.139-.522-1.359a.437.437 0 0 0-.816 0l-.522 1.359a.75.75 0 0 1-.431.43l-1.359.523a.437.437 0 0 0 0 .816l1.359.522a.75.75 0 0 1 .43.431l.523 1.359a.437.437 0 0 0 .816 0l.522-1.359a.75.75 0 0 1 .431-.43l1.359-.523a.437.437 0 0 0 0-.816l-1.359-.522a.75.75 0 0 1-.43-.431"
          />
        </svg>
        Ask Celeste
      </button>

      {/* In-flow right column — pushes the main content when open */}
      <div
        className={cn(
          "sticky top-0 h-screen shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
          open ? "w-[min(24rem,100vw)]" : "w-0",
        )}
        aria-hidden={!open}
      >
        <div className="m-4 mr-6 flex h-[calc(100vh-2rem)] w-[min(24rem,100vw)] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* Header — plain text + close */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Ask Celeste AI</p>
              <p className="text-[11px] text-gray-500">Knows your workspace in real time</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Assistant UI Thread */}
          <div className="flex-1 overflow-hidden">
            <Assistant />
          </div>
        </div>
      </div>
    </>
  );
}
