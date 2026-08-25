"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CaretDown, MapPin, Envelope } from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { TeamsInvitesPanel } from "@/components/teams/TeamsInvitesPanel";

type Member = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
  location: string | null;
  email: string;
};

type Dept = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  headcount?: number;
};

export function TeamsClient({
  departments,
  membersByDept,
  roleTitles,
  manage,
}: {
  departments: Dept[];
  membersByDept: Record<string, Member[]>;
  roleTitles: Record<string, string>;
  manage?: { canManage: boolean; canBootstrap: boolean };
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Persist which department is expanded across reloads.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("celeste-teams-expanded");
      if (saved && departments.some((d) => d.id === saved)) setExpanded(saved);
    } catch {
      /* ignore */
    }
  }, [departments]);

  useEffect(() => {
    try {
      if (expanded) window.localStorage.setItem("celeste-teams-expanded", expanded);
      else window.localStorage.removeItem("celeste-teams-expanded");
    } catch {
      /* ignore */
    }
  }, [expanded]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Teams
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {departments.length} departments · {Object.values(membersByDept).reduce((a, b) => a + b.length, 0)} teammates
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const members = membersByDept[dept.id] ?? [];
          const lead = members[0];
          const isOpen = expanded === dept.id;
          return (
            <motion.div
              key={dept.id}
              layout
              className="card card-hover overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : dept.id)}
                className="w-full p-5 text-left"
              >
                <h3 className="flex items-center justify-between text-[15px] font-semibold text-gray-900">
                  {dept.name}
                  <CaretDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {dept.description}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <Users className="h-4 w-4 text-gray-400" />
                    {members.length} people
                  </div>
                  {lead && (
                    <div className="flex items-center gap-1.5">
                      <SquircleAvatar
                        name={lead.full_name}
                        src={lead.avatar_url}
                        size="sm"
                        className="ring-2 ring-white"
                      />
                      <span className="text-[12px] text-gray-600">
                        {roleTitles[lead.id] ?? "Lead"}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <ul className="divide-y divide-gray-50 px-5">
                      {members.length === 0 && (
                        <li className="py-3 text-sm text-gray-400">No members.</li>
                      )}
                      {members.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 py-3">
                          <SquircleAvatar
                            name={m.full_name}
                            src={m.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {m.full_name}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              {roleTitles[m.id] ?? m.role_title ?? "Team member"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            {m.location && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <MapPin className="h-3 w-3" />
                                {m.location}
                              </span>
                            )}
                            <Envelope className="h-3.5 w-3.5" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>            </motion.div>
          );
        })}
      </div>

      {manage && <TeamsInvitesPanel canManage={manage.canManage} canBootstrap={manage.canBootstrap} />}
    </div>
  );
}
