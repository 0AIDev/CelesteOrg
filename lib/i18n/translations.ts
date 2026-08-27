export type Locale = "en" | "it" | "es" | "ja" | "fr" | "de";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  es: "Espanol",
  ja: "Japanese",
  fr: "Francais",
  de: "Deutsch",
};

export const localeFlags: Record<Locale, string> = {
  en: "US",
  it: "IT",
  es: "ES",
  ja: "JP",
  fr: "FR",
  de: "DE",
};

export type TranslationKeys = {
  // Sidebar
  "sidebar.home": string;
  "sidebar.ceoDashboard": string;
  "sidebar.orgChart": string;
  "sidebar.teams": string;
  "sidebar.chat": string;
  "sidebar.documents": string;
  "sidebar.calendar": string;
  "sidebar.tasks": string;
  "sidebar.approvals": string;
  "sidebar.notion": string;
  "sidebar.insights": string;
  "sidebar.ideas": string;
  "sidebar.reports": string;
  "sidebar.issues": string;
  "sidebar.financeGrowth": string;
  "sidebar.equity": string;
  "sidebar.crm": string;
  "sidebar.socialPlanner": string;
  "sidebar.developer": string;
  "sidebar.github": string;
  "sidebar.promptVault": string;
  "sidebar.skillsCreator": string;
  "sidebar.recordings": string;
  "sidebar.developers": string;
  "sidebar.settings": string;
  "sidebar.pinned": string;
  "sidebar.growTeam": string;
  "sidebar.growTeamDesc": string;
  "sidebar.onboarding": string;
  "sidebar.standups": string;
  "sidebar.realtimeAiUsage": string;

  // Header
  "header.search": string;
  "header.notifications": string;
  "header.new": string;
  "header.markAllRead": string;
  "header.nothingHere": string;
  "header.profile": string;
  "header.settings": string;
  "header.feedback": string;
  "header.darkMode": string;
  "header.lightMode": string;
  "header.signOut": string;

  // Dashboard
  "dashboard.goodMorning": string;
  "dashboard.goodAfternoon": string;
  "dashboard.goodEvening": string;
  "dashboard.briefing": string;
  "dashboard.pendingApprovals": string;
  "dashboard.calendar": string;
  "dashboard.recentDocs": string;
  "dashboard.ideas": string;
  "dashboard.notifications": string;
  "dashboard.noEvents": string;
  "dashboard.viewAll": string;
  "dashboard.todaySchedule": string;
  "dashboard.noApprovals": string;
  "dashboard.allCaughtUp": string;
  "dashboard.quickActions": string;
  "dashboard.startStandup": string;
  "dashboard.newDocument": string;
  "dashboard.reportIssue": string;

  // Settings
  "settings.title": string;
  "settings.description": string;
  "settings.profile": string;
  "settings.security": string;
  "settings.notifications": string;
  "settings.fullName": string;
  "settings.email": string;
  "settings.bio": string;
  "settings.location": string;
  "settings.phone": string;
  "settings.companyHistory": string;
  "settings.saveChanges": string;
  "settings.saving": string;
  "settings.saved": string;
  "settings.changePassword": string;
  "settings.currentPassword": string;
  "settings.newPassword": string;
  "settings.confirmPassword": string;
  "settings.updatePassword": string;

  // Onboarding
  "onboarding.welcome": string;
  "onboarding.welcomeWithName": string;
  "onboarding.setPassword": string;
  "onboarding.tellUs": string;
  "onboarding.yourRole": string;
  "onboarding.whatsYourRole": string;
  "onboarding.teamAwaits": string;
  "onboarding.setGoals": string;
  "onboarding.howWeWork": string;
  "onboarding.toolsAccess": string;
  "onboarding.yourTechStack": string;
  "onboarding.workStyle": string;
  "onboarding.oneLastThing": string;
  "onboarding.next": string;
  "onboarding.back": string;
  "onboarding.skip": string;
  "onboarding.createAccount": string;
  "onboarding.continue": string;
  "onboarding.signFinish": string;
  "onboarding.saving": string;
  "onboarding.fullName": string;
  "onboarding.firstNameLastName": string;
  "onboarding.email": string;
  "onboarding.emailInviteNote": string;
  "onboarding.password": string;
  "onboarding.atLeast8Chars": string;
  "onboarding.confirmPassword": string;
  "onboarding.repeatPassword": string;
  "onboarding.passwordsNoMatch": string;
  "onboarding.profilePhoto": string;
  "onboarding.choosePhoto": string;
  "onboarding.department": string;
  "onboarding.role": string;
  "onboarding.location": string;
  "onboarding.cityCountry": string;
  "onboarding.phone": string;
  "onboarding.shortBio": string;
  "onboarding.whatDoYouDo": string;
  "onboarding.weekGoals": string;
  "onboarding.thirtyDayGoals": string;
  "onboarding.ninetyDayGoals": string;
  "onboarding.keyPeople": string;
  "onboarding.projectsInterest": string;
  "onboarding.selectDept": string;
  "onboarding.selectAtLeastOneTool": string;
  "onboarding.atLeastOneGoal": string;
  "onboarding.alreadySigned": string;
  "onboarding.clickContinue": string;
  "onboarding.typeLegalName": string;
  "onboarding.agreeToAgreement": string;
  "onboarding.coreFocusHours": string;
  "onboarding.preferredComm": string;
  "onboarding.notificationsToggle": string;
  "onboarding.notifDesc": string;
  "onboarding.primaryLanguage": string;
  "onboarding.frameworksTools": string;
  "onboarding.preferredAiModel": string;

  // Onboarding feature cards
  "onboarding.orgChartDesc": string;
  "onboarding.calendarDesc": string;
  "onboarding.chatDesc": string;
  "onboarding.approvalsDesc": string;
  "onboarding.documentsDesc": string;
  "onboarding.aiAssistantDesc": string;
  "onboarding.quickActionsDesc": string;

  // Onboarding team cards
  "onboarding.team1": string;
  "onboarding.team2": string;
  "onboarding.team3": string;
  "onboarding.team4": string;

  // Onboarding culture cards
  "onboarding.culture1": string;
  "onboarding.culture2": string;
  "onboarding.culture3": string;
  "onboarding.culture4": string;
  "onboarding.culture5": string;

  // Chat
  "chat.search": string;
  "chat.newMessage": string;
  "chat.typeMessage": string;
  "chat.noMessages": string;
  "chat.replyTo": string;
  "chat.cancelReply": string;
  "chat.pin": string;
  "chat.unpin": string;

  // Common
  "common.required": string;
  "common.optional": string;
  "common.cancel": string;
  "common.delete": string;
  "common.edit": string;
  "common.save": string;
  "common.close": string;
  "common.confirm": string;
  "common.loading": string;
  "common.error": string;
  "common.success": string;
  "common.searchEverything": string;
  "common.language": string;
  "common.pending": string;
  "common.approved": string;
  "common.rejected": string;
  "common.active": string;
  "common.name": string;
  "common.status": string;
  "common.date": string;
  "common.priority": string;
  "common.actions": string;
  "common.description": string;
  "common.title": string;
  "common.open": string;

  // Dashboard
  "dashboard.timeOffWeek": string;
  "dashboard.openIdeas": string;
  "dashboard.todaysSchedule": string;
  "dashboard.activity": string;

  // Chat
  "chat.channels": string;
  "chat.directMessages": string;
  "chat.replyingTo": string;

  // Documents
  "docs.sendForSignature": string;
  "docs.documentPreview": string;
  "docs.signed": string;
  "docs.electronicallySign": string;
  "docs.sendReminder": string;
  "docs.revokeRequest": string;
  "docs.deleteDocument": string;

  // Calendar
  "calendar.vacation": string;
  "calendar.remote": string;
  "calendar.sick": string;
  "calendar.meeting": string;
  "calendar.pending": string;
  "calendar.start": string;
  "calendar.end": string;
  "calendar.prevMonth": string;
  "calendar.nextMonth": string;

  // Approvals
  "approvals.pending": string;
  "approvals.approved": string;
  "approvals.rejected": string;
  "approvals.reviewed": string;

  // Org Chart
  "org.profile": string;
  "org.about": string;
  "org.location": string;
  "org.prevCompanies": string;
  "org.equityVested": string;
  "org.manager": string;
  "org.team": string;
  "org.saved": string;

  // Role Dashboard
  "roleDash.directReports": string;
  "roleDash.approvalsToReview": string;
  "roleDash.upcomingEvents": string;
  "roleDash.leadership": string;
  "roleDash.approve": string;
  "roleDash.reject": string;

  // Settings
  "settings.activeSessions": string;
  "settings.currentDevice": string;
  "settings.currentDeviceDesc": string;
  "settings.updated": string;
  "settings.approvalRequests": string;
  "settings.approvalRequestsDesc": string;
  "settings.morningReminder": string;
  "settings.morningReminderDesc": string;
  "settings.eodReminder": string;
  "settings.eodReminderDesc": string;
  "settings.newIdeas": string;
  "settings.newIdeasDesc": string;

  // Command Menu
  "cmd.approveReject": string;
  "cmd.orgChart": string;
  "cmd.githubActivity": string;
  "cmd.notifications": string;
  "cmd.equity": string;
  "cmd.devSettings": string;

  // AI Usage
  "ai.tokens": string;
  "ai.cost": string;
  "ai.avgLatency": string;
  "ai.errors": string;
  "ai.requests": string;
  "ai.tokensPerHour": string;
  "ai.costByProvider": string;
  "ai.teamConsumption": string;
  "ai.recentCalls": string;

  // Equity
  "equity.totalShares": string;
  "equity.vested": string;
  "equity.unvested": string;
  "equity.editGrant": string;
  "equity.deleteGrant": string;

  // Issues
  "issues.issue": string;
  "issues.track": string;
  "issues.assignee": string;

  // CRM
  "crm.company": string;
  "crm.rating": string;
  "crm.feedback": string;
  "crm.added": string;
  "crm.addFeedback": string;
  "crm.notes": string;
  "crm.category": string;

  // Recordings
  "recordings.processing": string;
  "recordings.deleteRecording": string;

  // Ideas
  "ideas.addIdea": string;

  // Documents extra
  "docs.date": string;

  // Morning briefing
  "briefing.refresh": string;
};

const en: TranslationKeys = {
  // Sidebar
  "sidebar.home": "Home",
  "sidebar.ceoDashboard": "CEO Dashboard",
  "sidebar.orgChart": "Org Chart",
  "sidebar.teams": "Teams",
  "sidebar.chat": "Chat",
  "sidebar.documents": "Documents",
  "sidebar.calendar": "Calendar",
  "sidebar.tasks": "Tasks",
  "sidebar.approvals": "Approvals",
  "sidebar.notion": "Notion",
  "sidebar.insights": "Insights",
  "sidebar.ideas": "Ideas",
  "sidebar.reports": "Reports",
  "sidebar.issues": "Issues",
  "sidebar.financeGrowth": "Finance & Growth",
  "sidebar.equity": "Equity",
  "sidebar.crm": "CRM",
  "sidebar.socialPlanner": "Social Planner",
  "sidebar.developer": "Developer",
  "sidebar.github": "GitHub",
  "sidebar.promptVault": "Prompt Vault",
  "sidebar.skillsCreator": "Skills Creator",
  "sidebar.recordings": "Recordings",
  "sidebar.developers": "Developers",
  "sidebar.settings": "Settings",
  "sidebar.pinned": "Pinned",
  "sidebar.growTeam": "Grow your team",
  "sidebar.growTeamDesc": "Invite colleagues to Celeste HQ and start collaborating.",
  "sidebar.onboarding": "Onboarding",
  "sidebar.standups": "Standups",
  "sidebar.realtimeAiUsage": "Realtime AI Usage",

  // Header
  "header.search": "Search everything...",
  "header.notifications": "Notifications",
  "header.new": "new",
  "header.markAllRead": "Mark all read",
  "header.nothingHere": "Nothing here yet.",
  "header.profile": "Profile",
  "header.settings": "Settings",
  "header.feedback": "Feedback",
  "header.darkMode": "Dark mode",
  "header.lightMode": "Light mode",
  "header.signOut": "Sign out",

  // Dashboard
  "dashboard.goodMorning": "Good morning",
  "dashboard.goodAfternoon": "Good afternoon",
  "dashboard.goodEvening": "Good evening",
  "dashboard.briefing": "Your daily briefing",
  "dashboard.pendingApprovals": "Pending approvals",
  "dashboard.calendar": "Calendar",
  "dashboard.recentDocs": "Recent documents",
  "dashboard.ideas": "Ideas",
  "dashboard.notifications": "Notifications",
  "dashboard.noEvents": "No events scheduled today.",
  "dashboard.viewAll": "View all",
  "dashboard.todaySchedule": "Today's schedule",
  "dashboard.noApprovals": "No pending approvals.",
  "dashboard.allCaughtUp": "All caught up!",
  "dashboard.quickActions": "Quick actions",
  "dashboard.startStandup": "Start standup",
  "dashboard.newDocument": "New document",
  "dashboard.reportIssue": "Report issue",

  // Settings
  "settings.title": "Settings",
  "settings.description": "Manage your account and preferences.",
  "settings.profile": "Profile",
  "settings.security": "Security",
  "settings.notifications": "Notifications",
  "settings.fullName": "Full name",
  "settings.email": "Email",
  "settings.bio": "Bio",
  "settings.location": "Location",
  "settings.phone": "Phone",
  "settings.companyHistory": "Company history",
  "settings.saveChanges": "Save changes",
  "settings.saving": "Saving...",
  "settings.saved": "Saved!",
  "settings.changePassword": "Change password",
  "settings.currentPassword": "Current password",
  "settings.newPassword": "New password",
  "settings.confirmPassword": "Confirm password",
  "settings.updatePassword": "Update password",

  // Onboarding
  "onboarding.welcome": "Welcome to Celeste HQ",
  "onboarding.welcomeWithName": "Welcome to Celeste HQ ({name})",
  "onboarding.setPassword": "Set your password",
  "onboarding.tellUs": "Tell us about yourself",
  "onboarding.yourRole": "Your role",
  "onboarding.whatsYourRole": "What's your role?",
  "onboarding.teamAwaits": "Your team awaits",
  "onboarding.setGoals": "Set your goals",
  "onboarding.howWeWork": "How we work",
  "onboarding.toolsAccess": "Tools & access",
  "onboarding.yourTechStack": "Your tech stack",
  "onboarding.workStyle": "Work style",
  "onboarding.oneLastThing": "One last thing",
  "onboarding.next": "Next",
  "onboarding.back": "Back",
  "onboarding.skip": "Skip",
  "onboarding.createAccount": "Create account",
  "onboarding.continue": "Continue",
  "onboarding.signFinish": "Sign & finish",
  "onboarding.saving": "Saving...",
  "onboarding.fullName": "Full name",
  "onboarding.firstNameLastName": "First and last name",
  "onboarding.email": "Email",
  "onboarding.emailInviteNote": "This is the email you were invited with.",
  "onboarding.password": "Password",
  "onboarding.atLeast8Chars": "At least 8 characters",
  "onboarding.confirmPassword": "Confirm password",
  "onboarding.repeatPassword": "Repeat your password",
  "onboarding.passwordsNoMatch": "Passwords don't match",
  "onboarding.profilePhoto": "Profile photo",
  "onboarding.choosePhoto": "Choose a photo for your profile.",
  "onboarding.department": "Department",
  "onboarding.role": "Role",
  "onboarding.location": "Location",
  "onboarding.cityCountry": "City, Country",
  "onboarding.phone": "Phone",
  "onboarding.shortBio": "Short bio",
  "onboarding.whatDoYouDo": "What do you do?",
  "onboarding.weekGoals": "Goals for the first week",
  "onboarding.thirtyDayGoals": "Goals for the first 30 days",
  "onboarding.ninetyDayGoals": "Goals for the first 90 days",
  "onboarding.keyPeople": "Key people to meet",
  "onboarding.projectsInterest": "Projects of interest",
  "onboarding.selectDept": "Select a department to continue",
  "onboarding.selectAtLeastOneTool": "Select at least one tool to continue",
  "onboarding.atLeastOneGoal": "At least one goal is required",
  "onboarding.alreadySigned": "Already signed",
  "onboarding.clickContinue": "Click Continue to finish.",
  "onboarding.typeLegalName": "Type your full legal name",
  "onboarding.agreeToAgreement": "I have read and agree to the agreement.",
  "onboarding.coreFocusHours": "Core focus hours",
  "onboarding.preferredComm": "Preferred communication",
  "onboarding.notificationsToggle": "Notifications",
  "onboarding.notifDesc": "Approvals, mentions, task updates.",
  "onboarding.primaryLanguage": "Primary language",
  "onboarding.frameworksTools": "Frameworks & tools",
  "onboarding.preferredAiModel": "Preferred AI model",

  // Onboarding feature cards
  "onboarding.orgChartDesc": "See the full team structure, who reports to whom, and message anyone directly.",
  "onboarding.calendarDesc": "View and create events, schedule meetings, and see team availability.",
  "onboarding.chatDesc": "Direct messages and channel-based team communication in real time.",
  "onboarding.approvalsDesc": "Review and approve requests from the team — documents, expenses, and more.",
  "onboarding.documentsDesc": "Share, sign, and manage company documents in one place.",
  "onboarding.aiAssistantDesc": "Ask Celeste anything about the workspace — calendar, approvals, team, and more.",
  "onboarding.quickActionsDesc": "Press Cmd+K anywhere to search, navigate, or run commands instantly.",

  // Onboarding team cards
  "onboarding.team1": "Every person has a role in the Org Chart — see who reports to whom",
  "onboarding.team2": "Your direct manager is assigned by the CEO or department head",
  "onboarding.team3": "Message anyone directly from their profile in the Org Chart",
  "onboarding.team4": "Join #general, #engineering, and your department channel",

  // Onboarding culture cards
  "onboarding.culture1": "Ship fast, iterate faster — done is better than perfect",
  "onboarding.culture2": "Default to transparency — share context, not conclusions",
  "onboarding.culture3": "Own your work — take initiative, be accountable",
  "onboarding.culture4": "Async-first: write it down before scheduling a meeting",
  "onboarding.culture5": "DACI framework: Driver, Approver, Contributors, Informed",

  // Chat
  "chat.search": "Search conversations...",
  "chat.newMessage": "New message",
  "chat.typeMessage": "Type a message...",
  "chat.noMessages": "No messages yet. Say hello!",
  "chat.replyTo": "Replying to",
  "chat.cancelReply": "Cancel reply",
  "chat.pin": "Pin message",
  "chat.unpin": "Unpin message",

  // Common
  "common.required": "required",
  "common.optional": "optional",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.save": "Save",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.success": "Success",
  "common.searchEverything": "Search everything...",
  "common.language": "Language",
  "common.pending": "Pending",
  "common.approved": "Approved",
  "common.rejected": "Rejected",
  "common.active": "Active",
  "common.name": "Name",
  "common.status": "Status",
  "common.date": "Date",
  "common.priority": "Priority",
  "common.actions": "Actions",
  "common.description": "Description",
  "common.title": "Title",
  "common.open": "Open",

  "dashboard.timeOffWeek": "Time off this week",
  "dashboard.openIdeas": "Open ideas",
  "dashboard.todaysSchedule": "Today's schedule",
  "dashboard.activity": "Activity",

  "chat.channels": "Channels",
  "chat.directMessages": "Direct Messages",
  "chat.replyingTo": "Replying to",

  "docs.sendForSignature": "Send for signature",
  "docs.documentPreview": "Document preview",
  "docs.signed": "Signed",
  "docs.electronicallySign": "Electronically sign",
  "docs.sendReminder": "Send a reminder to everyone who hasn't signed yet",
  "docs.revokeRequest": "Revoke request",
  "docs.deleteDocument": "Delete document",

  "calendar.vacation": "Vacation",
  "calendar.remote": "Remote",
  "calendar.sick": "Sick",
  "calendar.meeting": "Meeting",
  "calendar.pending": "Pending",
  "calendar.start": "Start",
  "calendar.end": "End",
  "calendar.prevMonth": "Previous month",
  "calendar.nextMonth": "Next month",

  "approvals.pending": "Pending",
  "approvals.approved": "Approved",
  "approvals.rejected": "Rejected",
  "approvals.reviewed": "Reviewed",

  "org.profile": "Profile",
  "org.about": "About",
  "org.location": "Location",
  "org.prevCompanies": "Previous companies",
  "org.equityVested": "Equity vested",
  "org.manager": "Manager",
  "org.team": "Team",
  "org.saved": "Saved",

  "roleDash.directReports": "Direct reports",
  "roleDash.approvalsToReview": "Approvals to review",
  "roleDash.upcomingEvents": "Upcoming events",
  "roleDash.leadership": "Leadership",
  "roleDash.approve": "Approve",
  "roleDash.reject": "Reject",

  "settings.activeSessions": "Active sessions",
  "settings.currentDevice": "This device",
  "settings.currentDeviceDesc": "Current browser session - active now",
  "settings.updated": "Updated",
  "settings.approvalRequests": "Approval requests",
  "settings.approvalRequestsDesc": "When someone needs your sign-off",
  "settings.morningReminder": "Morning standup reminders",
  "settings.morningReminderDesc": "Daily 9am prompt",
  "settings.eodReminder": "EOD reminders",
  "settings.eodReminderDesc": "Daily 5pm prompt to wrap up",
  "settings.newIdeas": "New ideas",
  "settings.newIdeasDesc": "High-signal ideas from the vault",

  "cmd.approveReject": "Approve / Reject",
  "cmd.orgChart": "Org Chart",
  "cmd.githubActivity": "GitHub Activity",
  "cmd.notifications": "Notifications",
  "cmd.equity": "Equity & Cap Table",
  "cmd.devSettings": "Developer Settings",

  "ai.tokens": "Tokens",
  "ai.cost": "Cost",
  "ai.avgLatency": "Avg latency",
  "ai.errors": "Errors",
  "ai.requests": "Requests",
  "ai.tokensPerHour": "Tokens per hour - last 24h",
  "ai.costByProvider": "Cost by provider",
  "ai.teamConsumption": "Team consumption - today",
  "ai.recentCalls": "Recent calls",

  "equity.totalShares": "Total shares",
  "equity.vested": "Vested",
  "equity.unvested": "Unvested",
  "equity.editGrant": "Edit grant",
  "equity.deleteGrant": "Delete grant",

  "issues.issue": "Issue",
  "issues.track": "Track",
  "issues.assignee": "Assignee",

  "crm.company": "Company",
  "crm.rating": "Rating",
  "crm.feedback": "Feedback",
  "crm.added": "Added",
  "crm.addFeedback": "Add feedback",
  "crm.notes": "Notes",
  "crm.category": "Category",

  "recordings.processing": "Processing",
  "recordings.deleteRecording": "Delete recording",

  "ideas.addIdea": "Add idea",

  "docs.date": "Date",

  "briefing.refresh": "Refresh briefing",
};

const it: TranslationKeys = {
  "sidebar.home": "Home",
  "sidebar.ceoDashboard": "Dashboard CEO",
  "sidebar.orgChart": "Org Chart",
  "sidebar.teams": "Team",
  "sidebar.chat": "Chat",
  "sidebar.documents": "Documenti",
  "sidebar.calendar": "Calendario",
  "sidebar.tasks": "Attivita",
  "sidebar.approvals": "Approvazioni",
  "sidebar.notion": "Notion",
  "sidebar.insights": "Analisi",
  "sidebar.ideas": "Idee",
  "sidebar.reports": "Report",
  "sidebar.issues": "Problemi",
  "sidebar.financeGrowth": "Finanza & Crescita",
  "sidebar.equity": "Equity",
  "sidebar.crm": "CRM",
  "sidebar.socialPlanner": "Social Planner",
  "sidebar.developer": "Sviluppo",
  "sidebar.github": "GitHub",
  "sidebar.promptVault": "Prompt Vault",
  "sidebar.skillsCreator": "Skills Creator",
  "sidebar.recordings": "Registrazioni",
  "sidebar.developers": "Sviluppatori",
  "sidebar.settings": "Impostazioni",
  "sidebar.pinned": "Fissati",
  "sidebar.growTeam": "Cresci il tuo team",
  "sidebar.growTeamDesc": "Invita colleghi a Celeste HQ e inizia a collaborare.",
  "sidebar.onboarding": "Onboarding",
  "sidebar.standups": "Standup",
  "sidebar.realtimeAiUsage": "Utilizzo AI in tempo reale",

  "header.search": "Cerca tutto...",
  "header.notifications": "Notifiche",
  "header.new": "nuove",
  "header.markAllRead": "Segna tutte come lette",
  "header.nothingHere": "Niente qui.",
  "header.profile": "Profilo",
  "header.settings": "Impostazioni",
  "header.feedback": "Feedback",
  "header.darkMode": "Modalita scura",
  "header.lightMode": "Modalita chiara",
  "header.signOut": "Esci",

  "dashboard.goodMorning": "Buongiorno",
  "dashboard.goodAfternoon": "Buon pomeriggio",
  "dashboard.goodEvening": "Buona sera",
  "dashboard.briefing": "Il tuo briefing giornaliero",
  "dashboard.pendingApprovals": "Approvazioni in sospeso",
  "dashboard.calendar": "Calendario",
  "dashboard.recentDocs": "Documenti recenti",
  "dashboard.ideas": "Idee",
  "dashboard.notifications": "Notifiche",
  "dashboard.noEvents": "Nessun evento oggi.",
  "dashboard.viewAll": "Vedi tutto",
  "dashboard.todaySchedule": "Programma di oggi",
  "dashboard.noApprovals": "Nessuna approvazione in sospeso.",
  "dashboard.allCaughtUp": "Tutto aggiornato!",
  "dashboard.quickActions": "Azioni rapide",
  "dashboard.startStandup": "Avvia standup",
  "dashboard.newDocument": "Nuovo documento",
  "dashboard.reportIssue": "Segnala problema",

  "settings.title": "Impostazioni",
  "settings.description": "Gestisci il tuo account e le preferenze.",
  "settings.profile": "Profilo",
  "settings.security": "Sicurezza",
  "settings.notifications": "Notifiche",
  "settings.fullName": "Nome completo",
  "settings.email": "Email",
  "settings.bio": "Bio",
  "settings.location": "Localita",
  "settings.phone": "Telefono",
  "settings.companyHistory": "Cronologia azienda",
  "settings.saveChanges": "Salva modifiche",
  "settings.saving": "Salvataggio...",
  "settings.saved": "Salvato!",
  "settings.changePassword": "Cambia password",
  "settings.currentPassword": "Password attuale",
  "settings.newPassword": "Nuova password",
  "settings.confirmPassword": "Conferma password",
  "settings.updatePassword": "Aggiorna password",

  "onboarding.welcome": "Benvenuto a Celeste HQ",
  "onboarding.welcomeWithName": "Benvenuto a Celeste HQ ({name})",
  "onboarding.setPassword": "Imposta la tua password",
  "onboarding.tellUs": "Raccontaci di te",
  "onboarding.yourRole": "Il tuo ruolo",
  "onboarding.whatsYourRole": "Qual e il tuo ruolo?",
  "onboarding.teamAwaits": "Il tuo team ti aspetta",
  "onboarding.setGoals": "Imposta i tuoi obiettivi",
  "onboarding.howWeWork": "Come lavoriamo",
  "onboarding.toolsAccess": "Strumenti e accesso",
  "onboarding.yourTechStack": "Il tuo stack tecnologico",
  "onboarding.workStyle": "Stile di lavoro",
  "onboarding.oneLastThing": "Un'ultima cosa",
  "onboarding.next": "Avanti",
  "onboarding.back": "Indietro",
  "onboarding.skip": "Salta",
  "onboarding.createAccount": "Crea account",
  "onboarding.continue": "Continua",
  "onboarding.signFinish": "Firma e termina",
  "onboarding.saving": "Salvataggio...",
  "onboarding.fullName": "Nome completo",
  "onboarding.firstNameLastName": "Nome e cognome",
  "onboarding.email": "Email",
  "onboarding.emailInviteNote": "Questa e l'email con cui sei stato invitato.",
  "onboarding.password": "Password",
  "onboarding.atLeast8Chars": "Almeno 8 caratteri",
  "onboarding.confirmPassword": "Conferma password",
  "onboarding.repeatPassword": "Ripeti la password",
  "onboarding.passwordsNoMatch": "Le password non coincidono",
  "onboarding.profilePhoto": "Foto profilo",
  "onboarding.choosePhoto": "Scegli una foto per il tuo profilo.",
  "onboarding.department": "Dipartimento",
  "onboarding.role": "Ruolo",
  "onboarding.location": "Localita",
  "onboarding.cityCountry": "Citta, Paese",
  "onboarding.phone": "Telefono",
  "onboarding.shortBio": "Breve biografia",
  "onboarding.whatDoYouDo": "Cosa fai?",
  "onboarding.weekGoals": "Obiettivi per la prima settimana",
  "onboarding.thirtyDayGoals": "Obiettivi per i primi 30 giorni",
  "onboarding.ninetyDayGoals": "Obiettivi per i primi 90 giorni",
  "onboarding.keyPeople": "Persone chiave da incontrare",
  "onboarding.projectsInterest": "Progetti di interesse",
  "onboarding.selectDept": "Seleziona un dipartimento per continuare",
  "onboarding.selectAtLeastOneTool": "Seleziona almeno uno strumento",
  "onboarding.atLeastOneGoal": "Almeno un obiettivo e richiesto",
  "onboarding.alreadySigned": "Gia firmato",
  "onboarding.clickContinue": "Clicca Continua per terminare.",
  "onboarding.typeLegalName": "Scrivi il tuo nome legale completo",
  "onboarding.agreeToAgreement": "Ho letto e accetto l'accordo.",
  "onboarding.coreFocusHours": "Ore di focus principali",
  "onboarding.preferredComm": "Comunicazione preferita",
  "onboarding.notificationsToggle": "Notifiche",
  "onboarding.notifDesc": "Approvazioni, menzioni, aggiornamenti attivita.",
  "onboarding.primaryLanguage": "Linguaggio principale",
  "onboarding.frameworksTools": "Framework e strumenti",
  "onboarding.preferredAiModel": "Modello AI preferito",

  "onboarding.orgChartDesc": "Vedi la struttura completa del team, chi riporta a chi, e messaggia chiunque direttamente.",
  "onboarding.calendarDesc": "Visualizza e crea eventi, pianifica riunioni e vedi la disponibilita del team.",
  "onboarding.chatDesc": "Messaggi diretti e comunicazione del team basata su canali in tempo reale.",
  "onboarding.approvalsDesc": "Rivedi e approva richieste dal team — documenti, spese e altro.",
  "onboarding.documentsDesc": "Condividi, firma e gestisci i documenti aziendali in un unico posto.",
  "onboarding.aiAssistantDesc": "Chiedi a Celeste qualsiasi cosa sul workspace — calendario, approvazioni, team e altro.",
  "onboarding.quickActionsDesc": "Premi Cmd+K ovunque per cercare, navigare o eseguire comandi istantaneamente.",

  "onboarding.team1": "Ogni persona ha un ruolo nell'Org Chart — vedi chi riporta a chi",
  "onboarding.team2": "Il tuo direttoresponsabile e assegnato dal CEO o dal capo dipartimento",
  "onboarding.team3": "Messaggia chiunque direttamente dal suo profilo nell'Org Chart",
  "onboarding.team4": "Entra in #general, #engineering e nel canale del tuo dipartimento",

  "onboarding.culture1": "Spedisci veloce, iterpiu veloce — fatto e meglio che perfetto",
  "onboarding.culture2": "Trasparenza predefinita — condividi il contesto, non le conclusioni",
  "onboarding.culture3": "Padroneggia il tuo lavoro — prendi iniziativa, sii responsabile",
  "onboarding.culture4": "Async-first: scrivi prima di programmare una riunione",
  "onboarding.culture5": "Framework DACI: Driver, Approver, Contributors, Informed",

  "chat.search": "Cerca conversazioni...",
  "chat.newMessage": "Nuovo messaggio",
  "chat.typeMessage": "Scrivi un messaggio...",
  "chat.noMessages": "Nessun messaggio. Dì ciao!",
  "chat.replyTo": "Rispondi a",
  "chat.cancelReply": "Annulla risposta",
  "chat.pin": "Fissa messaggio",
  "chat.unpin": "Rimuovi fisso",

  "common.required": "obbligatorio",
  "common.optional": "opzionale",
  "common.cancel": "Annulla",
  "common.delete": "Elimina",
  "common.edit": "Modifica",
  "common.save": "Salva",
  "common.close": "Chiudi",
  "common.confirm": "Conferma",
  "common.loading": "Caricamento...",
  "common.error": "Errore",
  "common.success": "Successo",
  "common.searchEverything": "Cerca tutto...",
  "common.language": "Lingua",

  "common.pending": "In sospeso",
  "common.approved": "Approvato",
  "common.rejected": "Rifiutato",
  "common.active": "Attivo",
  "common.name": "Nome",
  "common.status": "Stato",
  "common.date": "Data",
  "common.priority": "Priorita",
  "common.actions": "Azioni",
  "common.description": "Descrizione",
  "common.title": "Titolo",
  "common.open": "Apri",
  "dashboard.timeOffWeek": "Permessi questa settimana",
  "dashboard.openIdeas": "Idee aperte",
  "dashboard.todaysSchedule": "Programma di oggi",
  "dashboard.activity": "Attivita",
  "chat.channels": "Canali",
  "chat.directMessages": "Messaggi diretti",
  "chat.replyingTo": "Rispondi a",
  "docs.sendForSignature": "Invia per firma",
  "docs.documentPreview": "Anteprima documento",
  "docs.signed": "Firmato",
  "docs.electronicallySign": "Firma electronicamente",
  "docs.sendReminder": "Invia un promemoria a chi non ha ancora firmato",
  "docs.revokeRequest": "Revoca richiesta",
  "docs.deleteDocument": "Elimina documento",
  "calendar.vacation": "Vacanza",
  "calendar.remote": "Remoto",
  "calendar.sick": "Malattia",
  "calendar.meeting": "Riunione",
  "calendar.pending": "In sospeso",
  "calendar.start": "Inizio",
  "calendar.end": "Fine",
  "calendar.prevMonth": "Mese precedente",
  "calendar.nextMonth": "Mese successivo",
  "approvals.pending": "In sospeso",
  "approvals.approved": "Approvato",
  "approvals.rejected": "Rifiutato",
  "approvals.reviewed": "Esaminato",
  "org.profile": "Profilo",
  "org.about": "Informazioni",
  "org.location": "Localita",
  "org.prevCompanies": "Precedenti aziende",
  "org.equityVested": "Equity maturata",
  "org.manager": "Responsabile",
  "org.team": "Team",
  "org.saved": "Salvato",
  "roleDash.directReports": "Subordinati diretti",
  "roleDash.approvalsToReview": "Approvazioni da esaminare",
  "roleDash.upcomingEvents": "Prossimi eventi",
  "roleDash.leadership": "Leadership",
  "roleDash.approve": "Approva",
  "roleDash.reject": "Rifiuta",
  "settings.activeSessions": "Sessioni attive",
  "settings.currentDevice": "Questo dispositivo",
  "settings.currentDeviceDesc": "Sessione browser attiva",
  "settings.updated": "Aggiornato",
  "settings.approvalRequests": "Richieste di approvazione",
  "settings.approvalRequestsDesc": "Quando qualcuno ha bisogno della tua firma",
  "settings.morningReminder": "Promemoria standup mattutino",
  "settings.morningReminderDesc": "Avviso giornaliero alle 9",
  "settings.eodReminder": "Promemoria fine giornata",
  "settings.eodReminderDesc": "Avviso giornaliero alle 17",
  "settings.newIdeas": "Nuove idee",
  "settings.newIdeasDesc": "Idee ad alto segnale dal vault",
  "cmd.approveReject": "Approva / Rifiuta",
  "cmd.orgChart": "Org Chart",
  "cmd.githubActivity": "Attivita GitHub",
  "cmd.notifications": "Notifiche",
  "cmd.equity": "Equity e Cap Table",
  "cmd.devSettings": "Impostazioni Sviluppatore",
  "ai.tokens": "Token",
  "ai.cost": "Costo",
  "ai.avgLatency": "Latenza media",
  "ai.errors": "Errori",
  "ai.requests": "Richieste",
  "ai.tokensPerHour": "Token per ora - ultime 24h",
  "ai.costByProvider": "Costo per provider",
  "ai.teamConsumption": "Consumo team - oggi",
  "ai.recentCalls": "Chiamate recenti",
  "equity.totalShares": "Azioni totali",
  "equity.vested": "Maturate",
  "equity.unvested": "Non maturate",
  "equity.editGrant": "Modifica grant",
  "equity.deleteGrant": "Elimina grant",
  "issues.issue": "Problema",
  "issues.track": "Traccia",
  "issues.assignee": "Assegnatario",
  "crm.company": "Azienda",
  "crm.rating": "Valutazione",
  "crm.feedback": "Feedback",
  "crm.added": "Aggiunto",
  "crm.addFeedback": "Aggiungi feedback",
  "crm.notes": "Note",
  "crm.category": "Categoria",
  "recordings.processing": "In elaborazione",
  "recordings.deleteRecording": "Elimina registrazione",
  "ideas.addIdea": "Aggiungi idea",
  "docs.date": "Data",
  "briefing.refresh": "Aggiorna briefing",
};

const es: TranslationKeys = {
  "sidebar.home": "Inicio",
  "sidebar.ceoDashboard": "Panel del CEO",
  "sidebar.orgChart": "Organigrama",
  "sidebar.teams": "Equipos",
  "sidebar.chat": "Chat",
  "sidebar.documents": "Documentos",
  "sidebar.calendar": "Calendario",
  "sidebar.tasks": "Tareas",
  "sidebar.approvals": "Aprobaciones",
  "sidebar.notion": "Notion",
  "sidebar.insights": "Analisis",
  "sidebar.ideas": "Ideas",
  "sidebar.reports": "Informes",
  "sidebar.issues": "Problemas",
  "sidebar.financeGrowth": "Finanzas y Crecimiento",
  "sidebar.equity": "Capital",
  "sidebar.crm": "CRM",
  "sidebar.socialPlanner": "Planificador Social",
  "sidebar.developer": "Desarrollo",
  "sidebar.github": "GitHub",
  "sidebar.promptVault": "Prompt Vault",
  "sidebar.skillsCreator": "Skills Creator",
  "sidebar.recordings": "Grabaciones",
  "sidebar.developers": "Desarrolladores",
  "sidebar.settings": "Configuracion",
  "sidebar.pinned": "Fijados",
  "sidebar.growTeam": "Haz crecer tu equipo",
  "sidebar.growTeamDesc": "Invita a colegas a Celeste HQ y empieza a colaborar.",
  "sidebar.onboarding": "Incorporacion",
  "sidebar.standups": "Standups",
  "sidebar.realtimeAiUsage": "Uso de IA en tiempo real",

  "header.search": "Buscar todo...",
  "header.notifications": "Notificaciones",
  "header.new": "nuevas",
  "header.markAllRead": "Marcar todo leido",
  "header.nothingHere": "Nada aqui.",
  "header.profile": "Perfil",
  "header.settings": "Configuracion",
  "header.feedback": "Comentarios",
  "header.darkMode": "Modo oscuro",
  "header.lightMode": "Modo claro",
  "header.signOut": "Cerrar sesion",

  "dashboard.goodMorning": "Buenos dias",
  "dashboard.goodAfternoon": "Buenas tardes",
  "dashboard.goodEvening": "Buenas noches",
  "dashboard.briefing": "Tu resumen diario",
  "dashboard.pendingApprovals": "Aprobaciones pendientes",
  "dashboard.calendar": "Calendario",
  "dashboard.recentDocs": "Documentos recientes",
  "dashboard.ideas": "Ideas",
  "dashboard.notifications": "Notificaciones",
  "dashboard.noEvents": "No hay eventos hoy.",
  "dashboard.viewAll": "Ver todo",
  "dashboard.todaySchedule": "Programa de hoy",
  "dashboard.noApprovals": "Sin aprobaciones pendientes.",
  "dashboard.allCaughtUp": "Todo al dia!",
  "dashboard.quickActions": "Acciones rapidas",
  "dashboard.startStandup": "Iniciar standup",
  "dashboard.newDocument": "Nuevo documento",
  "dashboard.reportIssue": "Reportar problema",

  "settings.title": "Configuracion",
  "settings.description": "Gestiona tu cuenta y preferencias.",
  "settings.profile": "Perfil",
  "settings.security": "Seguridad",
  "settings.notifications": "Notificaciones",
  "settings.fullName": "Nombre completo",
  "settings.email": "Email",
  "settings.bio": "Biografia",
  "settings.location": "Ubicacion",
  "settings.phone": "Telefono",
  "settings.companyHistory": "Historial de la empresa",
  "settings.saveChanges": "Guardar cambios",
  "settings.saving": "Guardando...",
  "settings.saved": "Guardado!",
  "settings.changePassword": "Cambiar contrasena",
  "settings.currentPassword": "Contrasena actual",
  "settings.newPassword": "Nueva contrasena",
  "settings.confirmPassword": "Confirmar contrasena",
  "settings.updatePassword": "Actualizar contrasena",

  "onboarding.welcome": "Bienvenido a Celeste HQ",
  "onboarding.welcomeWithName": "Bienvenido a Celeste HQ ({name})",
  "onboarding.setPassword": "Establece tu contrasena",
  "onboarding.tellUs": "Cuentanos sobre ti",
  "onboarding.yourRole": "Tu rol",
  "onboarding.whatsYourRole": "Cual es tu rol?",
  "onboarding.teamAwaits": "Tu equipo te espera",
  "onboarding.setGoals": "Establece tus objetivos",
  "onboarding.howWeWork": "Como trabajamos",
  "onboarding.toolsAccess": "Herramientas y acceso",
  "onboarding.yourTechStack": "Tu stack tecnico",
  "onboarding.workStyle": "Estilo de trabajo",
  "onboarding.oneLastThing": "Una ultima cosa",
  "onboarding.next": "Siguiente",
  "onboarding.back": "Atras",
  "onboarding.skip": "Omitir",
  "onboarding.createAccount": "Crear cuenta",
  "onboarding.continue": "Continuar",
  "onboarding.signFinish": "Firmar y finalizar",
  "onboarding.saving": "Guardando...",
  "onboarding.fullName": "Nombre completo",
  "onboarding.firstNameLastName": "Nombre y apellidos",
  "onboarding.email": "Email",
  "onboarding.emailInviteNote": "Este es el email con el que fuiste invitado.",
  "onboarding.password": "Contrasena",
  "onboarding.atLeast8Chars": "Al menos 8 caracteres",
  "onboarding.confirmPassword": "Confirmar contrasena",
  "onboarding.repeatPassword": "Repite tu contrasena",
  "onboarding.passwordsNoMatch": "Las contrasenas no coinciden",
  "onboarding.profilePhoto": "Foto de perfil",
  "onboarding.choosePhoto": "Elige una foto para tu perfil.",
  "onboarding.department": "Departamento",
  "onboarding.role": "Rol",
  "onboarding.location": "Ubicacion",
  "onboarding.cityCountry": "Ciudad, Pais",
  "onboarding.phone": "Telefono",
  "onboarding.shortBio": "Breve biografia",
  "onboarding.whatDoYouDo": "A que te dedicas?",
  "onboarding.weekGoals": "Objetivos de la primera semana",
  "onboarding.thirtyDayGoals": "Objetivos de los primeros 30 dias",
  "onboarding.ninetyDayGoals": "Objetivos de los primeros 90 dias",
  "onboarding.keyPeople": "Personas clave a conocer",
  "onboarding.projectsInterest": "Proyectos de interes",
  "onboarding.selectDept": "Selecciona un departamento para continuar",
  "onboarding.selectAtLeastOneTool": "Selecciona al menos una herramienta",
  "onboarding.atLeastOneGoal": "Al menos un objetivo es obligatorio",
  "onboarding.alreadySigned": "Ya firmado",
  "onboarding.clickContinue": "Haz clic en Continuar para terminar.",
  "onboarding.typeLegalName": "Escribe tu nombre legal completo",
  "onboarding.agreeToAgreement": "He leido y acepto el acuerdo.",
  "onboarding.coreFocusHours": "Horas principales de enfoque",
  "onboarding.preferredComm": "Comunicacion preferida",
  "onboarding.notificationsToggle": "Notificaciones",
  "onboarding.notifDesc": "Aprobaciones, menciones, actualizaciones de tareas.",
  "onboarding.primaryLanguage": "Lenguaje principal",
  "onboarding.frameworksTools": "Frameworks y herramientas",
  "onboarding.preferredAiModel": "Modelo de IA preferido",

  "onboarding.orgChartDesc": "Ve la estructura completa del equipo, quien reporta a quien, y mensajea a cualquiera directamente.",
  "onboarding.calendarDesc": "Visualiza y crea eventos, programa reuniones y ve la disponibilidad del equipo.",
  "onboarding.chatDesc": "Mensajes directos y comunicacion del equipo por canales en tiempo real.",
  "onboarding.approvalsDesc": "Revisa y aprueba solicitudes del equipo — documentos, gastos y mas.",
  "onboarding.documentsDesc": "Comparte, firma y gestiona documentos de la empresa en un solo lugar.",
  "onboarding.aiAssistantDesc": "Pregunta a Celeste cualquier cosa sobre el espacio de trabajo — calendario, aprobaciones, equipo y mas.",
  "onboarding.quickActionsDesc": "Presiona Cmd+K en cualquier lugar para buscar, navegar o ejecutar comandos al instante.",

  "onboarding.team1": "Cada persona tiene un rol en el Organigrama — ve quien reporta a quien",
  "onboarding.team2": "Tu gerente directo es asignado por el CEO o el jefe del departamento",
  "onboarding.team3": "Mensajea a cualquiera directamente desde su perfil en el Organigrama",
  "onboarding.team4": "Unete a #general, #engineering y el canal de tu departamento",

  "onboarding.culture1": "Lanza rapido, itera mas rapido — terminado es mejor que perfecto",
  "onboarding.culture2": "Transparencia por defecto — comparte contexto, no conclusiones",
  "onboarding.culture3": "Asume tu trabajo — toma iniciativa, se responsable",
  "onboarding.culture4": "Async-first: escrubelo antes de programar una reunion",
  "onboarding.culture5": "Framework DACI: Driver, Approver, Contributors, Informed",

  "chat.search": "Buscar conversaciones...",
  "chat.newMessage": "Nuevo mensaje",
  "chat.typeMessage": "Escribe un mensaje...",
  "chat.noMessages": "Sin mensajes aun. Di hola!",
  "chat.replyTo": "Responder a",
  "chat.cancelReply": "Cancelar respuesta",
  "chat.pin": "Fijar mensaje",
  "chat.unpin": "Desfijar mensaje",

  "common.required": "obligatorio",
  "common.optional": "opcional",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.save": "Guardar",
  "common.close": "Cerrar",
  "common.confirm": "Confirmar",
  "common.loading": "Cargando...",
  "common.error": "Error",
  "common.success": "Exito",
  "common.searchEverything": "Buscar todo...",
  "common.language": "Idioma",

  "common.pending": "Pendiente",
  "common.approved": "Aprobado",
  "common.rejected": "Rechazado",
  "common.active": "Activo",
  "common.name": "Nombre",
  "common.status": "Estado",
  "common.date": "Fecha",
  "common.priority": "Prioridad",
  "common.actions": "Acciones",
  "common.description": "Descripcion",
  "common.title": "Titulo",
  "common.open": "Abrir",
  "dashboard.timeOffWeek": "Permisos esta semana",
  "dashboard.openIdeas": "Ideas abiertas",
  "dashboard.todaysSchedule": "Programa de hoy",
  "dashboard.activity": "Actividad",
  "chat.channels": "Canales",
  "chat.directMessages": "Mensajes directos",
  "chat.replyingTo": "Respondiendo a",
  "docs.sendForSignature": "Enviar para firma",
  "docs.documentPreview": "Vista previa del documento",
  "docs.signed": "Firmado",
  "docs.electronicallySign": "Firmar electronicamente",
  "docs.sendReminder": "Enviar un recordatorio a quien no haya firmado",
  "docs.revokeRequest": "Revocar solicitud",
  "docs.deleteDocument": "Eliminar documento",
  "calendar.vacation": "Vacaciones",
  "calendar.remote": "Remoto",
  "calendar.sick": "Enfermedad",
  "calendar.meeting": "Reunion",
  "calendar.pending": "Pendiente",
  "calendar.start": "Inicio",
  "calendar.end": "Fin",
  "calendar.prevMonth": "Mes anterior",
  "calendar.nextMonth": "Mes siguiente",
  "approvals.pending": "Pendiente",
  "approvals.approved": "Aprobado",
  "approvals.rejected": "Rechazado",
  "approvals.reviewed": "Revisado",
  "org.profile": "Perfil",
  "org.about": "Acerca de",
  "org.location": "Ubicacion",
  "org.prevCompanies": "Empresas anteriores",
  "org.equityVested": "Capital adquirido",
  "org.manager": "Gerente",
  "org.team": "Equipo",
  "org.saved": "Guardado",
  "roleDash.directReports": "Reportes directos",
  "roleDash.approvalsToReview": "Aprobaciones por revisar",
  "roleDash.upcomingEvents": "Proximos eventos",
  "roleDash.leadership": "Liderazgo",
  "roleDash.approve": "Aprobar",
  "roleDash.reject": "Rechazar",
  "settings.activeSessions": "Sesiones activas",
  "settings.currentDevice": "Este dispositivo",
  "settings.currentDeviceDesc": "Sesion actual del navegador",
  "settings.updated": "Actualizado",
  "settings.approvalRequests": "Solicitudes de aprobacion",
  "settings.approvalRequestsDesc": "Cuando alguien necesita tu firma",
  "settings.morningReminder": "Recordatorios de standup matutino",
  "settings.morningReminderDesc": "Aviso diario a las 9am",
  "settings.eodReminder": "Recordatorios de fin de dia",
  "settings.eodReminderDesc": "Aviso diario a las 5pm",
  "settings.newIdeas": "Nuevas ideas",
  "settings.newIdeasDesc": "Ideas de alta senal del vault",
  "cmd.approveReject": "Aprobar / Rechazar",
  "cmd.orgChart": "Organigrama",
  "cmd.githubActivity": "Actividad GitHub",
  "cmd.notifications": "Notificaciones",
  "cmd.equity": "Capital y Cap Table",
  "cmd.devSettings": "Configuracion de Desarrollador",
  "ai.tokens": "Tokens",
  "ai.cost": "Costo",
  "ai.avgLatency": "Latencia promedio",
  "ai.errors": "Errores",
  "ai.requests": "Solicitudes",
  "ai.tokensPerHour": "Tokens por hora - ultimas 24h",
  "ai.costByProvider": "Costo por proveedor",
  "ai.teamConsumption": "Consumo del equipo - hoy",
  "ai.recentCalls": "Llamadas recientes",
  "equity.totalShares": "Acciones totales",
  "equity.vested": "Adquiridas",
  "equity.unvested": "No adquiridas",
  "equity.editGrant": "Editar concesion",
  "equity.deleteGrant": "Eliminar concesion",
  "issues.issue": "Problema",
  "issues.track": "Seguimiento",
  "issues.assignee": "Asignado",
  "crm.company": "Empresa",
  "crm.rating": "Calificacion",
  "crm.feedback": "Comentarios",
  "crm.added": "Agregado",
  "crm.addFeedback": "Agregar comentario",
  "crm.notes": "Notas",
  "crm.category": "Categoria",
  "recordings.processing": "Procesando",
  "recordings.deleteRecording": "Eliminar grabacion",
  "ideas.addIdea": "Agregar idea",
  "docs.date": "Fecha",
  "briefing.refresh": "Actualizar resumen",
};

const ja: TranslationKeys = {
  "sidebar.home": "ホーム",
  "sidebar.ceoDashboard": "CEOダッシュボード",
  "sidebar.orgChart": "組織図",
  "sidebar.teams": "チーム",
  "sidebar.chat": "チャット",
  "sidebar.documents": "ドキュメント",
  "sidebar.calendar": "カレンダー",
  "sidebar.tasks": "タスク",
  "sidebar.approvals": "承認",
  "sidebar.notion": "Notion",
  "sidebar.insights": "インサイト",
  "sidebar.ideas": "アイデア",
  "sidebar.reports": "レポート",
  "sidebar.issues": "問題",
  "sidebar.financeGrowth": "財務・成長",
  "sidebar.equity": "エクイティ",
  "sidebar.crm": "CRM",
  "sidebar.socialPlanner": "ソーシャルプランナー",
  "sidebar.developer": "開発",
  "sidebar.github": "GitHub",
  "sidebar.promptVault": "プロンプトボールト",
  "sidebar.skillsCreator": "スキルスクリエイター",
  "sidebar.recordings": "録画",
  "sidebar.developers": "開発者",
  "sidebar.settings": "設定",
  "sidebar.pinned": "ピン留め",
  "sidebar.growTeam": "チームを成長させる",
  "sidebar.growTeamDesc": "同僚をCeleste HQに招待してコラボレーションを始めましょう。",
  "sidebar.onboarding": "オンボーディング",
  "sidebar.standups": "スタンドアップ",
  "sidebar.realtimeAiUsage": "リアルタイムAI使用量",

  "header.search": "すべて検索...",
  "header.notifications": "通知",
  "header.new": "件の新着",
  "header.markAllRead": "すべて既読にする",
  "header.nothingHere": "まだありません。",
  "header.profile": "プロフィール",
  "header.settings": "設定",
  "header.feedback": "フィードバック",
  "header.darkMode": "ダークモード",
  "header.lightMode": "ライトモード",
  "header.signOut": "サインアウト",

  "dashboard.goodMorning": "おはようございます",
  "dashboard.goodAfternoon": "こんにちは",
  "dashboard.goodEvening": "こんばんは",
  "dashboard.briefing": "今日のブリーフィング",
  "dashboard.pendingApprovals": "保留中の承認",
  "dashboard.calendar": "カレンダー",
  "dashboard.recentDocs": "最近のドキュメント",
  "dashboard.ideas": "アイデア",
  "dashboard.notifications": "通知",
  "dashboard.noEvents": "今日の予定はありません。",
  "dashboard.viewAll": "すべて見る",
  "dashboard.todaySchedule": "今日のスケジュール",
  "dashboard.noApprovals": "保留中の承認はありません。",
  "dashboard.allCaughtUp": "すべて最新です！",
  "dashboard.quickActions": "クイックアクション",
  "dashboard.startStandup": "スタンドアップ開始",
  "dashboard.newDocument": "新規ドキュメント",
  "dashboard.reportIssue": "問題を報告",

  "settings.title": "設定",
  "settings.description": "アカウントと設定を管理します。",
  "settings.profile": "プロフィール",
  "settings.security": "セキュリティ",
  "settings.notifications": "通知",
  "settings.fullName": "氏名",
  "settings.email": "メール",
  "settings.bio": "自己紹介",
  "settings.location": "場所",
  "settings.phone": "電話番号",
  "settings.companyHistory": "会社の履歴",
  "settings.saveChanges": "変更を保存",
  "settings.saving": "保存中...",
  "settings.saved": "保存完了！",
  "settings.changePassword": "パスワードを変更",
  "settings.currentPassword": "現在のパスワード",
  "settings.newPassword": "新しいパスワード",
  "settings.confirmPassword": "パスワードを確認",
  "settings.updatePassword": "パスワードを更新",

  "onboarding.welcome": "Celeste HQへようこそ",
  "onboarding.welcomeWithName": "Celeste HQへようこそ（{name}）",
  "onboarding.setPassword": "パスワードを設定",
  "onboarding.tellUs": "自己紹介をお願いします",
  "onboarding.yourRole": "あなたの役職",
  "onboarding.whatsYourRole": "あなたの役職は何ですか？",
  "onboarding.teamAwaits": "チームがあなたを待っています",
  "onboarding.setGoals": "目標を設定",
  "onboarding.howWeWork": "私たちの働き方",
  "onboarding.toolsAccess": "ツールとアクセス",
  "onboarding.yourTechStack": "テックスタック",
  "onboarding.workStyle": "ワークスタイル",
  "onboarding.oneLastThing": "最後にひとつ",
  "onboarding.next": "次へ",
  "onboarding.back": "戻る",
  "onboarding.skip": "スキップ",
  "onboarding.createAccount": "アカウント作成",
  "onboarding.continue": "続ける",
  "onboarding.signFinish": "署名して完了",
  "onboarding.saving": "保存中...",
  "onboarding.fullName": "氏名",
  "onboarding.firstNameLastName": "名前と名字",
  "onboarding.email": "メール",
  "onboarding.emailInviteNote": "招待に使用されたメールアドレスです。",
  "onboarding.password": "パスワード",
  "onboarding.atLeast8Chars": "8文字以上",
  "onboarding.confirmPassword": "パスワードを確認",
  "onboarding.repeatPassword": "パスワードを再入力",
  "onboarding.passwordsNoMatch": "パスワードが一致しません",
  "onboarding.profilePhoto": "プロフィール写真",
  "onboarding.choosePhoto": "プロフィールの写真を選択してください。",
  "onboarding.department": "部門",
  "onboarding.role": "役職",
  "onboarding.location": "場所",
  "onboarding.cityCountry": "都市、国",
  "onboarding.phone": "電話番号",
  "onboarding.shortBio": "簡単な自己紹介",
  "onboarding.whatDoYouDo": "何をしていますか？",
  "onboarding.weekGoals": "最初の1週間の目標",
  "onboarding.thirtyDayGoals": "最初の30日間の目標",
  "onboarding.ninetyDayGoals": "最初の90日間の目標",
  "onboarding.keyPeople": "会うべき重要な人",
  "onboarding.projectsInterest": "興味のあるプロジェクト",
  "onboarding.selectDept": "続行するには部門を選択してください",
  "onboarding.selectAtLeastOneTool": "至少ついてツールを選択してください",
  "onboarding.atLeastOneGoal": "少なくとも1つの目標が必要です",
  "onboarding.alreadySigned": "署名済み",
  "onboarding.clickContinue": "「続ける」をクリックして完了します。",
  "onboarding.typeLegalName": "法的な氏名を入力してください",
  "onboarding.agreeToAgreement": "契約を読み、同意します。",
  "onboarding.coreFocusHours": "集中時間帯",
  "onboarding.preferredComm": "希望するコミュニケーション",
  "onboarding.notificationsToggle": "通知",
  "onboarding.notifDesc": "承認、メンション、タスクの更新。",
  "onboarding.primaryLanguage": "主なプログラミング言語",
  "onboarding.frameworksTools": "フレームワークとツール",
  "onboarding.preferredAiModel": "希望するAIモデル",

  "onboarding.orgChartDesc": "チームの全体構造を確認し、誰が誰に報告しているかを把握し、誰にでも直接メッセージできます。",
  "onboarding.calendarDesc": "イベントの作成・閲覧、会議のスケジュール、チームの空き状況を確認できます。",
  "onboarding.chatDesc": "ダイレクトメッセージとチャネルベースのチームコミュニケーションをリアルタイムで。",
  "onboarding.approvalsDesc": "チームからのリクエストを確認・承認 — ドキュメント、費用など。",
  "onboarding.documentsDesc": "会社のドキュメントを一か所で共有、署名、管理できます。",
  "onboarding.aiAssistantDesc": "ワークスペースについてCelesteに何でも質問 — カレンダー、承認、チームなど。",
  "onboarding.quickActionsDesc": "Cmd+Kを押すだけで検索、ナビゲーション、コマンド実行ができます。",

  "onboarding.team1": "全員が組織図に役職を持っています — 誰が誰に報告しているか確認",
  "onboarding.team2": "直属の上司はCEOまたは部門長が任命します",
  "onboarding.team3": "組織図のプロフィールから誰にでも直接メッセージ可能",
  "onboarding.team4": "#general、#engineering、部門チャンネルに参加",

  "onboarding.culture1": "素早く出荷し、さらに速く改善 — 完璧より完了が大事",
  "onboarding.culture2": "透明性を重視 — 結論ではなくコンテキストを共有",
  "onboarding.culture3": "自分の仕事に責任を持つ — 主導権を取り、説明責任を果たす",
  "onboarding.culture4": "非同期優先：ミーティングを設定する前に書き留める",
  "onboarding.culture5": "DACIフレームワーク：Driver, Approver, Contributors, Informed",

  "chat.search": "会話を検索...",
  "chat.newMessage": "新規メッセージ",
  "chat.typeMessage": "メッセージを入力...",
  "chat.noMessages": "まだメッセージがありません。挨拶しましょう！",
  "chat.replyTo": "返信先",
  "chat.cancelReply": "返信をキャンセル",
  "chat.pin": "ピン留め",
  "chat.unpin": "ピン留め解除",

  "common.required": "必須",
  "common.optional": "任意",
  "common.cancel": "キャンセル",
  "common.delete": "削除",
  "common.edit": "編集",
  "common.save": "保存",
  "common.close": "閉じる",
  "common.confirm": "確認",
  "common.loading": "読み込み中...",
  "common.error": "エラー",
  "common.success": "成功",
  "common.searchEverything": "すべて検索...",
  "common.language": "言語",

  "common.pending": "保留中",
  "common.approved": "承認済み",
  "common.rejected": "却下",
  "common.active": "アクティブ",
  "common.name": "名前",
  "common.status": "ステータス",
  "common.date": "日付",
  "common.priority": "優先度",
  "common.actions": "アクション",
  "common.description": "説明",
  "common.title": "タイトル",
  "common.open": "開く",
  "dashboard.timeOffWeek": "今週の休暇",
  "dashboard.openIdeas": "未完了のアイデア",
  "dashboard.todaysSchedule": "今日のスケジュール",
  "dashboard.activity": "アクティビティ",
  "chat.channels": "チャンネル",
  "chat.directMessages": "ダイレクトメッセージ",
  "chat.replyingTo": "返信先",
  "docs.sendForSignature": "署名を依頼",
  "docs.documentPreview": "ドキュメントプレビュー",
  "docs.signed": "署名済み",
  "docs.electronicallySign": "電子署名",
  "docs.sendReminder": "まだ署名していない人にリマインダーを送信",
  "docs.revokeRequest": "リクエストを取消する",
  "docs.deleteDocument": "ドキュメントを削除",
  "calendar.vacation": "休暇",
  "calendar.remote": "リモート",
  "calendar.sick": "病欠",
  "calendar.meeting": "会議",
  "calendar.pending": "保留中",
  "calendar.start": "開始",
  "calendar.end": "終了",
  "calendar.prevMonth": "前月",
  "calendar.nextMonth": "翼月",
  "approvals.pending": "保留中",
  "approvals.approved": "承認済み",
  "approvals.rejected": "却下",
  "approvals.reviewed": "確認済み",
  "org.profile": "プロフィール",
  "org.about": "概要",
  "org.location": "場所",
  "org.prevCompanies": "過去の会社",
  "org.equityVested": "丈与済みエクイティ",
  "org.manager": "上司",
  "org.team": "チーム",
  "org.saved": "保存済み",
  "roleDash.directReports": "直属の部下",
  "roleDash.approvalsToReview": "確認が必要な承認",
  "roleDash.upcomingEvents": "今後のエベント",
  "roleDash.leadership": "リーダーシップ",
  "roleDash.approve": "承認",
  "roleDash.reject": "却下",
  "settings.activeSessions": "アクティブなセッション",
  "settings.currentDevice": "このデバイス",
  "settings.currentDeviceDesc": "現在のブラウザセッション",
  "settings.updated": "更新済み",
  "settings.approvalRequests": "承認リクエスト",
  "settings.approvalRequestsDesc": "誰かが署名を必要とする場合",
  "settings.morningReminder": "朝のスタンドアップリマインダー",
  "settings.morningReminderDesc": "毎朝9時のプロンプト",
  "settings.eodReminder": "終了時リマインダー",
  "settings.eodReminderDesc": "毎日17時のプロンプト",
  "settings.newIdeas": "新しいアイデア",
  "settings.newIdeasDesc": "ヴォールトからの高シグナルアイデア",
  "cmd.approveReject": "承認 / 却下",
  "cmd.orgChart": "組織図",
  "cmd.githubActivity": "GitHubアクティビティ",
  "cmd.notifications": "通知",
  "cmd.equity": "エクイティとキャップテーブル",
  "cmd.devSettings": "開発者設定",
  "ai.tokens": "トーキン",
  "ai.cost": "コスト",
  "ai.avgLatency": "平均レテンシ",
  "ai.errors": "エラー",
  "ai.requests": "リクエスト",
  "ai.tokensPerHour": "1時間あたりトーキン - 過去24時間",
  "ai.costByProvider": "プロバイダ別コスト",
  "ai.teamConsumption": "チーム消費量 - 今日",
  "ai.recentCalls": "最近の呼び出し",
  "equity.totalShares": "総株式数",
  "equity.vested": "丈上済み",
  "equity.unvested": "未丈上",
  "equity.editGrant": "グラントを編集",
  "equity.deleteGrant": "グラントを削除",
  "issues.issue": "問題",
  "issues.track": "トラック",
  "issues.assignee": "担当者",
  "crm.company": "会社",
  "crm.rating": "評価",
  "crm.feedback": "フィードバック",
  "crm.added": "追加日",
  "crm.addFeedback": "フィードバックを追加",
  "crm.notes": "メモ",
  "crm.category": "カテゴリ",
  "recordings.processing": "処理中",
  "recordings.deleteRecording": "録画を削除",
  "ideas.addIdea": "アイデアを追加",
  "docs.date": "日付",
  "briefing.refresh": "ブリーフィングを更新",
};

const fr: TranslationKeys = {
  "sidebar.home": "Accueil",
  "sidebar.ceoDashboard": "Tableau de bord CEO",
  "sidebar.orgChart": "Organigramme",
  "sidebar.teams": "Equipes",
  "sidebar.chat": "Chat",
  "sidebar.documents": "Documents",
  "sidebar.calendar": "Calendrier",
  "sidebar.tasks": "Taches",
  "sidebar.approvals": "Approbations",
  "sidebar.notion": "Notion",
  "sidebar.insights": "Analyses",
  "sidebar.ideas": "Idees",
  "sidebar.reports": "Rapports",
  "sidebar.issues": "Problemes",
  "sidebar.financeGrowth": "Finance & Croissance",
  "sidebar.equity": "Capital",
  "sidebar.crm": "CRM",
  "sidebar.socialPlanner": "Planificateur Social",
  "sidebar.developer": "Developpement",
  "sidebar.github": "GitHub",
  "sidebar.promptVault": "Prompt Vault",
  "sidebar.skillsCreator": "Skills Creator",
  "sidebar.recordings": "Enregistrements",
  "sidebar.developers": "Developpeurs",
  "sidebar.settings": "Parametres",
  "sidebar.pinned": "Epingles",
  "sidebar.growTeam": "Developpez votre equipe",
  "sidebar.growTeamDesc": "Invitez vos collegues a Celeste HQ et commencez a collaborer.",
  "sidebar.onboarding": "Integration",
  "sidebar.standups": "Standups",
  "sidebar.realtimeAiUsage": "Utilisation IA en temps reel",

  "header.search": "Rechercher...",
  "header.notifications": "Notifications",
  "header.new": "nouvelles",
  "header.markAllRead": "Tout marquer comme lu",
  "header.nothingHere": "Rien ici.",
  "header.profile": "Profil",
  "header.settings": "Parametres",
  "header.feedback": "Retour",
  "header.darkMode": "Mode sombre",
  "header.lightMode": "Mode clair",
  "header.signOut": "Deconnexion",

  "dashboard.goodMorning": "Bonjour",
  "dashboard.goodAfternoon": "Bon apres-midi",
  "dashboard.goodEvening": "Bonsoir",
  "dashboard.briefing": "Votre briefing du jour",
  "dashboard.pendingApprovals": "Approbations en attente",
  "dashboard.calendar": "Calendrier",
  "dashboard.recentDocs": "Documents recents",
  "dashboard.ideas": "Idees",
  "dashboard.notifications": "Notifications",
  "dashboard.noEvents": "Pas d'evenements aujourd'hui.",
  "dashboard.viewAll": "Voir tout",
  "dashboard.todaySchedule": "Planning du jour",
  "dashboard.noApprovals": "Aucune approbation en attente.",
  "dashboard.allCaughtUp": "Tout est a jour!",
  "dashboard.quickActions": "Actions rapides",
  "dashboard.startStandup": "Lancer le standup",
  "dashboard.newDocument": "Nouveau document",
  "dashboard.reportIssue": "Signaler un probleme",

  "settings.title": "Parametres",
  "settings.description": "Gerez votre compte et vos preferences.",
  "settings.profile": "Profil",
  "settings.security": "Securite",
  "settings.notifications": "Notifications",
  "settings.fullName": "Nom complet",
  "settings.email": "Email",
  "settings.bio": "Bio",
  "settings.location": "Localisation",
  "settings.phone": "Telephone",
  "settings.companyHistory": "Historique de l'entreprise",
  "settings.saveChanges": "Enregistrer",
  "settings.saving": "Enregistrement...",
  "settings.saved": "Enregistre!",
  "settings.changePassword": "Changer le mot de passe",
  "settings.currentPassword": "Mot de passe actuel",
  "settings.newPassword": "Nouveau mot de passe",
  "settings.confirmPassword": "Confirmer le mot de passe",
  "settings.updatePassword": "Mettre a jour le mot de passe",

  "onboarding.welcome": "Bienvenue sur Celeste HQ",
  "onboarding.welcomeWithName": "Bienvenue sur Celeste HQ ({name})",
  "onboarding.setPassword": "Definissez votre mot de passe",
  "onboarding.tellUs": "Parlez-nous de vous",
  "onboarding.yourRole": "Votre role",
  "onboarding.whatsYourRole": "Quel est votre role?",
  "onboarding.teamAwaits": "Votre equipe vous attend",
  "onboarding.setGoals": "Definissez vos objectifs",
  "onboarding.howWeWork": "Comment nous travaillons",
  "onboarding.toolsAccess": "Outils et acces",
  "onboarding.yourTechStack": "Votre stack technique",
  "onboarding.workStyle": "Style de travail",
  "onboarding.oneLastThing": "Une derniere chose",
  "onboarding.next": "Suivant",
  "onboarding.back": "Retour",
  "onboarding.skip": "Passer",
  "onboarding.createAccount": "Creer un compte",
  "onboarding.continue": "Continuer",
  "onboarding.signFinish": "Signer et terminer",
  "onboarding.saving": "Enregistrement...",
  "onboarding.fullName": "Nom complet",
  "onboarding.firstNameLastName": "Prenom et nom",
  "onboarding.email": "Email",
  "onboarding.emailInviteNote": "C'est l'adresse email avec laquelle vous etes invite.",
  "onboarding.password": "Mot de passe",
  "onboarding.atLeast8Chars": "Au moins 8 caracteres",
  "onboarding.confirmPassword": "Confirmer le mot de passe",
  "onboarding.repeatPassword": "Repetez votre mot de passe",
  "onboarding.passwordsNoMatch": "Les mots de passe ne correspondent pas",
  "onboarding.profilePhoto": "Photo de profil",
  "onboarding.choosePhoto": "Choisissez une photo pour votre profil.",
  "onboarding.department": "Departement",
  "onboarding.role": "Role",
  "onboarding.location": "Localisation",
  "onboarding.cityCountry": "Ville, Pays",
  "onboarding.phone": "Telephone",
  "onboarding.shortBio": "Courte biographie",
  "onboarding.whatDoYouDo": "Que faites-vous?",
  "onboarding.weekGoals": "Objectifs de la premiere semaine",
  "onboarding.thirtyDayGoals": "Objectifs des 30 premiers jours",
  "onboarding.ninetyDayGoals": "Objectifs des 90 premiers jours",
  "onboarding.keyPeople": "Personnes cles a rencontrer",
  "onboarding.projectsInterest": "Projets d'interet",
  "onboarding.selectDept": "Selectionnez un departement pour continuer",
  "onboarding.selectAtLeastOneTool": "Selectionnez au moins un outil",
  "onboarding.atLeastOneGoal": "Au moins un objectif est requis",
  "onboarding.alreadySigned": "Deja signe",
  "onboarding.clickContinue": "Cliquez sur Continuer pour terminer.",
  "onboarding.typeLegalName": "Tapez votre nom legal complet",
  "onboarding.agreeToAgreement": "J'ai lu et j'accepte l'accord.",
  "onboarding.coreFocusHours": "Heures de concentration principales",
  "onboarding.preferredComm": "Communication preferee",
  "onboarding.notificationsToggle": "Notifications",
  "onboarding.notifDesc": "Approbations, mentions, mises a jour de taches.",
  "onboarding.primaryLanguage": "Langage principal",
  "onboarding.frameworksTools": "Frameworks et outils",
  "onboarding.preferredAiModel": "Modele IA prefere",

  "onboarding.orgChartDesc": "Voyez la structure complete de l'equipe, qui rend compte a qui, et envoyez des messages directement.",
  "onboarding.calendarDesc": "Visualisez et creez des evenements, planifiez des reunions et voyez la disponibilite de l'equipe.",
  "onboarding.chatDesc": "Messages directs et communication d'equipe par canaux en temps reel.",
  "onboarding.approvalsDesc": "Examinez et approuvez les demandes de l'equipe — documents, depenses et plus.",
  "onboarding.documentsDesc": "Partagez, signez et gerez les documents de l'entreprise au meme endroit.",
  "onboarding.aiAssistantDesc": "Posez n'importe quelle question a Celeste sur l'espace de travail — calendrier, approbations, equipe et plus.",
  "onboarding.quickActionsDesc": "Appuyez sur Cmd+K n'importe ou pour rechercher, naviguer ou executer des commandes instantanement.",

  "onboarding.team1": "Chaque personne a un role dans l'organigramme — voyez qui rend compte a qui",
  "onboarding.team2": "Votre manager direct est assigne par le CEO ou le chef de departement",
  "onboarding.team3": "Envoyez un message directement depuis le profil dans l'organigramme",
  "onboarding.team4": "Rejoignez #general, #engineering et le canal de votre departement",

  "onboarding.culture1": "Lancez vite, iterez plus vite — termine est mieux que parfait",
  "onboarding.culture2": "Transparence par defaut — partagez le contexte, pas les conclusions",
  "onboarding.culture3": "Assumez votre travail — prenez l'initiative, soyez responsable",
  "onboarding.culture4": "Async d'abord: ecrivez avant de planifier une reunion",
  "onboarding.culture5": "Framework DACI: Driver, Approver, Contributors, Informed",

  "chat.search": "Rechercher des conversations...",
  "chat.newMessage": "Nouveau message",
  "chat.typeMessage": "Tapez un message...",
  "chat.noMessages": "Pas encore de messages. Dites bonjour!",
  "chat.replyTo": "Repondre a",
  "chat.cancelReply": "Annuler la reponse",
  "chat.pin": "Epingler le message",
  "chat.unpin": "Desepingler le message",

  "common.required": "obligatoire",
  "common.optional": "optionnel",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.save": "Enregistrer",
  "common.close": "Fermer",
  "common.confirm": "Confirmer",
  "common.loading": "Chargement...",
  "common.error": "Erreur",
  "common.success": "Succes",
  "common.searchEverything": "Rechercher...",
  "common.language": "Langue",

  "common.pending": "En attente",
  "common.approved": "Approuve",
  "common.rejected": "Rejete",
  "common.active": "Actif",
  "common.name": "Nom",
  "common.status": "Statut",
  "common.date": "Date",
  "common.priority": "Priorite",
  "common.actions": "Actions",
  "common.description": "Description",
  "common.title": "Titre",
  "common.open": "Ouvrir",
  "dashboard.timeOffWeek": "Conges cette semaine",
  "dashboard.openIdeas": "Idees ouvertes",
  "dashboard.todaysSchedule": "Planning du jour",
  "dashboard.activity": "Activite",
  "chat.channels": "Canaux",
  "chat.directMessages": "Messages directs",
  "chat.replyingTo": "Repondre a",
  "docs.sendForSignature": "Envoyer pour signature",
  "docs.documentPreview": "Apercu du document",
  "docs.signed": "Signe",
  "docs.electronicallySign": "Signer electroniquement",
  "docs.sendReminder": "Envoyer un rappel a ceux qui n'ont pas encore signe",
  "docs.revokeRequest": "Revoquer la demande",
  "docs.deleteDocument": "Supprimer le document",
  "calendar.vacation": "Vacances",
  "calendar.remote": "A distance",
  "calendar.sick": "Maladie",
  "calendar.meeting": "Reunion",
  "calendar.pending": "En attente",
  "calendar.start": "Debut",
  "calendar.end": "Fin",
  "calendar.prevMonth": "Mois precedent",
  "calendar.nextMonth": "Mois suivant",
  "approvals.pending": "En attente",
  "approvals.approved": "Approuve",
  "approvals.rejected": "Rejete",
  "approvals.reviewed": "Examine",
  "org.profile": "Profil",
  "org.about": "A propos",
  "org.location": "Localisation",
  "org.prevCompanies": "Entreprises precedentes",
  "org.equityVested": "Capital acquis",
  "org.manager": "Manager",
  "org.team": "Equipe",
  "org.saved": "Enregistre",
  "roleDash.directReports": "Subordonnes directs",
  "roleDash.approvalsToReview": "Approbations a examiner",
  "roleDash.upcomingEvents": "Evenements a venir",
  "roleDash.leadership": "Leadership",
  "roleDash.approve": "Approuver",
  "roleDash.reject": "Rejeter",
  "settings.activeSessions": "Sessions actives",
  "settings.currentDevice": "Cet appareil",
  "settings.currentDeviceDesc": "Session navigateur actuelle",
  "settings.updated": "Mis a jour",
  "settings.approvalRequests": "Demandes d'approbation",
  "settings.approvalRequestsDesc": "Quand quelqu'un a besoin de votre signature",
  "settings.morningReminder": "Rappels standup matinal",
  "settings.morningReminderDesc": "Invite quotidienne a 9h",
  "settings.eodReminder": "Rappels de fin de journee",
  "settings.eodReminderDesc": "Invite quotidienne a 17h",
  "settings.newIdeas": "Nouvelles idees",
  "settings.newIdeasDesc": "Idees a fort signal du vault",
  "cmd.approveReject": "Approuver / Rejeter",
  "cmd.orgChart": "Organigramme",
  "cmd.githubActivity": "Activite GitHub",
  "cmd.notifications": "Notifications",
  "cmd.equity": "Capital et Cap Table",
  "cmd.devSettings": "Parametres Developpeur",
  "ai.tokens": "Tokens",
  "ai.cost": "Cout",
  "ai.avgLatency": "Latence moyenne",
  "ai.errors": "Erreurs",
  "ai.requests": "Requetes",
  "ai.tokensPerHour": "Tokens par heure - dernieres 24h",
  "ai.costByProvider": "Cout par fournisseur",
  "ai.teamConsumption": "Consommation equipe - aujourd'hui",
  "ai.recentCalls": "Appels recents",
  "equity.totalShares": "Actions totales",
  "equity.vested": "Acquises",
  "equity.unvested": "Non acquises",
  "equity.editGrant": "Modifier la concession",
  "equity.deleteGrant": "Supprimer la concession",
  "issues.issue": "Probleme",
  "issues.track": "Suivi",
  "issues.assignee": "Assigne",
  "crm.company": "Entreprise",
  "crm.rating": "Note",
  "crm.feedback": "Retour",
  "crm.added": "Ajoute",
  "crm.addFeedback": "Ajouter un retour",
  "crm.notes": "Notes",
  "crm.category": "Categorie",
  "recordings.processing": "En cours",
  "recordings.deleteRecording": "Supprimer l'enregistrement",
  "ideas.addIdea": "Ajouter une idee",
  "docs.date": "Date",
  "briefing.refresh": "Actualiser le briefing",
};

const de: TranslationKeys = {
  "sidebar.home": "Startseite",
  "sidebar.ceoDashboard": "CEO-Dashboard",
  "sidebar.orgChart": "Organigramm",
  "sidebar.teams": "Teams",
  "sidebar.chat": "Chat",
  "sidebar.documents": "Dokumente",
  "sidebar.calendar": "Kalender",
  "sidebar.tasks": "Aufgaben",
  "sidebar.approvals": "Freigaben",
  "sidebar.notion": "Notion",
  "sidebar.insights": "Einblicke",
  "sidebar.ideas": "Ideen",
  "sidebar.reports": "Berichte",
  "sidebar.issues": "Probleme",
  "sidebar.financeGrowth": "Finanzen & Wachstum",
  "sidebar.equity": "Beteiligung",
  "sidebar.crm": "CRM",
  "sidebar.socialPlanner": "Social Planner",
  "sidebar.developer": "Entwicklung",
  "sidebar.github": "GitHub",
  "sidebar.promptVault": "Prompt Vault",
  "sidebar.skillsCreator": "Skills Creator",
  "sidebar.recordings": "Aufnahmen",
  "sidebar.developers": "Entwickler",
  "sidebar.settings": "Einstellungen",
  "sidebar.pinned": "Angeheftet",
  "sidebar.growTeam": "Wachse mit deinem Team",
  "sidebar.growTeamDesc": "Lade Kollegen zu Celeste HQ ein und starte die Zusammenarbeit.",
  "sidebar.onboarding": "Einarbeitung",
  "sidebar.standups": "Standups",
  "sidebar.realtimeAiUsage": "Echtzeit-AI-Nutzung",

  "header.search": "Alles durchsuchen...",
  "header.notifications": "Benachrichtigungen",
  "header.new": "neue",
  "header.markAllRead": "Alle als gelesen markieren",
  "header.nothingHere": "Hier ist nichts.",
  "header.profile": "Profil",
  "header.settings": "Einstellungen",
  "header.feedback": "Feedback",
  "header.darkMode": "Dunkelmodus",
  "header.lightMode": "Hellmodus",
  "header.signOut": "Abmelden",

  "dashboard.goodMorning": "Guten Morgen",
  "dashboard.goodAfternoon": "Guten Tag",
  "dashboard.goodEvening": "Guten Abend",
  "dashboard.briefing": "Dein taglicher Briefing",
  "dashboard.pendingApprovals": "Ausstehende Freigaben",
  "dashboard.calendar": "Kalender",
  "dashboard.recentDocs": "Aktuelle Dokumente",
  "dashboard.ideas": "Ideen",
  "dashboard.notifications": "Benachrichtigungen",
  "dashboard.noEvents": "Heute keine Termine.",
  "dashboard.viewAll": "Alle anzeigen",
  "dashboard.todaySchedule": "Tagesplan",
  "dashboard.noApprovals": "Keine ausstehenden Freigaben.",
  "dashboard.allCaughtUp": "Alles aktuell!",
  "dashboard.quickActions": "Schnellaktionen",
  "dashboard.startStandup": "Standup starten",
  "dashboard.newDocument": "Neues Dokument",
  "dashboard.reportIssue": "Problem melden",

  "settings.title": "Einstellungen",
  "settings.description": "Verwalte dein Konto und deine Einstellungen.",
  "settings.profile": "Profil",
  "settings.security": "Sicherheit",
  "settings.notifications": "Benachrichtigungen",
  "settings.fullName": "Vollstandiger Name",
  "settings.email": "E-Mail",
  "settings.bio": "Bio",
  "settings.location": "Standort",
  "settings.phone": "Telefon",
  "settings.companyHistory": "Unternehmenshistorie",
  "settings.saveChanges": "Anderungen speichern",
  "settings.saving": "Speichern...",
  "settings.saved": "Gespeichert!",
  "settings.changePassword": "Passwort andern",
  "settings.currentPassword": "Aktuelles Passwort",
  "settings.newPassword": "Neues Passwort",
  "settings.confirmPassword": "Passwort bestatigen",
  "settings.updatePassword": "Passwort aktualisieren",

  "onboarding.welcome": "Willkommen bei Celeste HQ",
  "onboarding.welcomeWithName": "Willkommen bei Celeste HQ ({name})",
  "onboarding.setPassword": "Passwort festlegen",
  "onboarding.tellUs": "Erzahl uns von dir",
  "onboarding.yourRole": "Deine Rolle",
  "onboarding.whatsYourRole": "Wie lautet deine Rolle?",
  "onboarding.teamAwaits": "Dein Team erwartet dich",
  "onboarding.setGoals": "Ziele festlegen",
  "onboarding.howWeWork": "Wie wir arbeiten",
  "onboarding.toolsAccess": "Tools & Zugang",
  "onboarding.yourTechStack": "Dein Tech-Stack",
  "onboarding.workStyle": "Arbeitsstil",
  "onboarding.oneLastThing": "Eine letzte Sache",
  "onboarding.next": "Weiter",
  "onboarding.back": "Zuruck",
  "onboarding.skip": "Uberspringen",
  "onboarding.createAccount": "Konto erstellen",
  "onboarding.continue": "Fortfahren",
  "onboarding.signFinish": "Unterschreiben & beenden",
  "onboarding.saving": "Speichern...",
  "onboarding.fullName": "Vollstandiger Name",
  "onboarding.firstNameLastName": "Vor- und Nachname",
  "onboarding.email": "E-Mail",
  "onboarding.emailInviteNote": "Dies ist die E-Mail, mit der du eingeladen wurdest.",
  "onboarding.password": "Passwort",
  "onboarding.atLeast8Chars": "Mindestens 8 Zeichen",
  "onboarding.confirmPassword": "Passwort bestatigen",
  "onboarding.repeatPassword": "Passwort wiederholen",
  "onboarding.passwordsNoMatch": "Passworte stimmen nicht uberein",
  "onboarding.profilePhoto": "Profilbild",
  "onboarding.choosePhoto": "Wahle ein Foto fur dein Profil.",
  "onboarding.department": "Abteilung",
  "onboarding.role": "Rolle",
  "onboarding.location": "Standort",
  "onboarding.cityCountry": "Stadt, Land",
  "onboarding.phone": "Telefon",
  "onboarding.shortBio": "Kurze Biografie",
  "onboarding.whatDoYouDo": "Was machst du?",
  "onboarding.weekGoals": "Ziele fur die erste Woche",
  "onboarding.thirtyDayGoals": "Ziele fur die ersten 30 Tage",
  "onboarding.ninetyDayGoals": "Ziele fur die ersten 90 Tage",
  "onboarding.keyPeople": "Wichtige Personen zum Kennenlernen",
  "onboarding.projectsInterest": "Interessante Projekte",
  "onboarding.selectDept": "Wahle eine Abteilung zum Fortfahren",
  "onboarding.selectAtLeastOneTool": "Wahle mindestens ein Tool",
  "onboarding.atLeastOneGoal": "Mindestens ein Ziel ist erforderlich",
  "onboarding.alreadySigned": "Bereits unterschrieben",
  "onboarding.clickContinue": "Klicke auf Fortfahren zum Beenden.",
  "onboarding.typeLegalName": "Gib deinen vollstandigen Rechtsnamen ein",
  "onboarding.agreeToAgreement": "Ich habe die Vereinbarung gelesen und akzeptiere sie.",
  "onboarding.coreFocusHours": "Hauptfokuszeiten",
  "onboarding.preferredComm": "Bevorzugte Kommunikation",
  "onboarding.notificationsToggle": "Benachrichtigungen",
  "onboarding.notifDesc": "Freigaben, Erwahnungen, Aufgabenaktualisierungen.",
  "onboarding.primaryLanguage": "Hauptsprache",
  "onboarding.frameworksTools": "Frameworks & Tools",
  "onboarding.preferredAiModel": "Bevorzugtes KI-Modell",

  "onboarding.orgChartDesc": "Sieh die gesamte Teamstruktur, wer wem berichtet, und sende Nachrichten direkt an jeden.",
  "onboarding.calendarDesc": "Erstelle und sieh Termine, plane Besprechungen und sieh die Teamverfugbarkeit.",
  "onboarding.chatDesc": "Direktnachrichten und kanalbasierte Teamkommunikation in Echtzeit.",
  "onboarding.approvalsDesc": "Uberprufe und genehmige Anfragen des Teams — Dokumente, Ausgaben und mehr.",
  "onboarding.documentsDesc": "Teile, unterzeichne und verwalte Unternehmensdokumente an einem Ort.",
  "onboarding.aiAssistantDesc": "Frag Celeste nach allem zum Workspace — Kalender, Freigaben, Team und mehr.",
  "onboarding.quickActionsDesc": "Drucke uberall Cmd+K zum Suchen, Navigieren oder Ausfuhlen von Befehlen.",

  "onboarding.team1": "Jeder hat eine Rolle im Organigramm — sieh, wer wem berichtet",
  "onboarding.team2": "Dein direkter Vorgesetzter wird vom CEO oder Abteilungsleiter zugewiesen",
  "onboarding.team3": "Sende Nachrichten direkt vom Profil im Organigramm",
  "onboarding.team4": "Tritt #general, #engineering und deinem Abteilungskanal bei",

  "onboarding.culture1": "Schnell ausliefern, schneller iterieren — fertig ist besser als perfekt",
  "onboarding.culture2": "Standard: Transparenz — teile Kontext, nicht Schlussfolgerungen",
  "onboarding.culture3": "Ubernehme Verantwortung — ergreife Initiative, sei rechenschaftspflichtig",
  "onboarding.culture4": "Async zuerst: Schreib es auf, bevor du ein Meeting planst",
  "onboarding.culture5": "DACI-Rahmenwerk: Driver, Approver, Contributors, Informed",

  "chat.search": "Unterhaltungen durchsuchen...",
  "chat.newMessage": "Neue Nachricht",
  "chat.typeMessage": "Nachricht eingeben...",
  "chat.noMessages": "Noch keine Nachrichten. Sag hallo!",
  "chat.replyTo": "Antworten an",
  "chat.cancelReply": "Antwort abbrechen",
  "chat.pin": "Nachricht anheften",
  "chat.unpin": "Anheftung entfernen",

  "common.required": "erforderlich",
  "common.optional": "optional",
  "common.cancel": "Abbrechen",
  "common.delete": "Loschen",
  "common.edit": "Bearbeiten",
  "common.save": "Speichern",
  "common.close": "Schliessen",
  "common.confirm": "Bestatigen",
  "common.loading": "Laden...",
  "common.error": "Fehler",
  "common.success": "Erfolg",
  "common.searchEverything": "Alles durchsuchen...",
  "common.language": "Sprache",

  "common.pending": "Ausstehend",
  "common.approved": "Genehmigt",
  "common.rejected": "Abgelehnt",
  "common.active": "Aktiv",
  "common.name": "Name",
  "common.status": "Status",
  "common.date": "Datum",
  "common.priority": "Prioritat",
  "common.actions": "Aktionen",
  "common.description": "Beschreibung",
  "common.title": "Titel",
  "common.open": "Offnen",
  "dashboard.timeOffWeek": "Abwesenheiten diese Woche",
  "dashboard.openIdeas": "Offene Ideen",
  "dashboard.todaysSchedule": "Tagesplan",
  "dashboard.activity": "Aktivitat",
  "chat.channels": "Kanale",
  "chat.directMessages": "Direktnachrichten",
  "chat.replyingTo": "Antworten an",
  "docs.sendForSignature": "Zur Unterschrift senden",
  "docs.documentPreview": "Dokumentenvorschau",
  "docs.signed": "Unterschrieben",
  "docs.electronicallySign": "Elektronisch unterschreiben",
  "docs.sendReminder": "Allen, die noch nicht unterschrieben haben, eine Erinnerung senden",
  "docs.revokeRequest": "Anfrage widerrufen",
  "docs.deleteDocument": "Dokument loschen",
  "calendar.vacation": "Urlaub",
  "calendar.remote": "Remote",
  "calendar.sick": "Krankheit",
  "calendar.meeting": "Besprechung",
  "calendar.pending": "Ausstehend",
  "calendar.start": "Start",
  "calendar.end": "Ende",
  "calendar.prevMonth": "Vorheriger Monat",
  "calendar.nextMonth": "Nachster Monat",
  "approvals.pending": "Ausstehend",
  "approvals.approved": "Genehmigt",
  "approvals.rejected": "Abgelehnt",
  "approvals.reviewed": "Uberpruft",
  "org.profile": "Profil",
  "org.about": "Uber",
  "org.location": "Standort",
  "org.prevCompanies": "Vorherige Unternehmen",
  "org.equityVested": "Erworbene Beteiligung",
  "org.manager": "Vorgesetzter",
  "org.team": "Team",
  "org.saved": "Gespeichert",
  "roleDash.directReports": "Direkte Berichte",
  "roleDash.approvalsToReview": "Zu uberprufende Freigaben",
  "roleDash.upcomingEvents": "Kommende Veranstaltungen",
  "roleDash.leadership": "Fuhrung",
  "roleDash.approve": "Genehmigen",
  "roleDash.reject": "Ablehnen",
  "settings.activeSessions": "Aktive Sitzungen",
  "settings.currentDevice": "Dieses Gerat",
  "settings.currentDeviceDesc": "Aktuelle Browsersitzung",
  "settings.updated": "Aktualisiert",
  "settings.approvalRequests": "Freigabeanfragen",
  "settings.approvalRequestsDesc": "Wenn jemand deine Unterschrift benotigt",
  "settings.morningReminder": "Morgendliche Standup-Erinnerungen",
  "settings.morningReminderDesc": "Taglicher Prompt um 9 Uhr",
  "settings.eodReminder": "Feierabend-Erinnerungen",
  "settings.eodReminderDesc": "Taglicher Prompt um 17 Uhr",
  "settings.newIdeas": "Neue Ideen",
  "settings.newIdeasDesc": "Hochsignale Ideen aus dem Vault",
  "cmd.approveReject": "Genehmigen / Ablehnen",
  "cmd.orgChart": "Organigramm",
  "cmd.githubActivity": "GitHub-Aktivitat",
  "cmd.notifications": "Benachrichtigungen",
  "cmd.equity": "Beteiligung & Cap Table",
  "cmd.devSettings": "Entwicklereinstellungen",
  "ai.tokens": "Token",
  "ai.cost": "Kosten",
  "ai.avgLatency": "Durchschn. Latenz",
  "ai.errors": "Fehler",
  "ai.requests": "Anfragen",
  "ai.tokensPerHour": "Token pro Stunde - letzte 24h",
  "ai.costByProvider": "Kosten nach Anbieter",
  "ai.teamConsumption": "Teamverbrauch - heute",
  "ai.recentCalls": "Letzte Aufrufe",
  "equity.totalShares": "Gesamtaktien",
  "equity.vested": "Erworben",
  "equity.unvested": "Nicht erworben",
  "equity.editGrant": "Zuteilung bearbeiten",
  "equity.deleteGrant": "Zuteilung loschen",
  "issues.issue": "Problem",
  "issues.track": "Verfolgung",
  "issues.assignee": "Zugewiesener",
  "crm.company": "Unternehmen",
  "crm.rating": "Bewertung",
  "crm.feedback": "Feedback",
  "crm.added": "Hinzugefugt",
  "crm.addFeedback": "Feedback hinzufugen",
  "crm.notes": "Notizen",
  "crm.category": "Kategorie",
  "recordings.processing": "Verarbeitung",
  "recordings.deleteRecording": "Aufnahme loschen",
  "ideas.addIdea": "Idee hinzufugen",
  "docs.date": "Datum",
  "briefing.refresh": "Briefing aktualisieren",
};

export const translations: Record<Locale, TranslationKeys> = {
  en,
  it,
  es,
  ja,
  fr,
  de,
};
