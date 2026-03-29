# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (usually localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
firebase deploy    # Deploy to Firebase Hosting
```

No linter or test runner is configured.

## Architecture

**Stack:** React 18 SPA + Firebase (Firestore + Auth + Storage) + Vite. No routing library — views are toggled via state in `App.jsx`. Styling is CSS-in-JS inline styles with CSS variables defined in `index.css` (light/dark themes). No Tailwind.

**State:** All task/user/tag state lives in `src/context/TaskContext.jsx`, consumed via `useTasks()`. A `CompanyContext.jsx` exists for multi-company support (work in progress). Firebase listeners (`onSnapshot`) run in `useEffect` inside `TaskContext`.

**Views (src/components/):**
- `BoardView.jsx` — main table view with filters, search, inline editing; contains a `TaskTable` sub-component that has its **own** `useTasks()` call
- `KanbanView.jsx` — drag-and-drop kanban; `KanbanCard` is a module-level component with its **own** `useTasks()` call
- `GanttView.jsx` — Gantt chart; `GanttBarTooltip` is a module-level component that **cannot** use hooks — assignee logic must be inline
- `DashboardView.jsx` — KPI cards + team performance table
- `TaskModal.jsx` — create/edit modal, shared across all views
- `SettingsModal.jsx` — user management, tags, CSV export, chart analytics

**Key patterns:**
- `getAssignees(task)` — normalizes old `assignee: string` (legacy) and new `assignees: string[]` (current) formats. Always use this instead of `task.assignee` directly.
- On save: both `assignees` array and `assignee` (first element) are written to Firestore for backward compatibility.
- Module-level components (`GanttBarTooltip`, etc.) cannot call `useTasks()` — use inline logic for assignee access.
- Sub-components that call `useTasks()` themselves (like `TaskTable`) must explicitly destructure every function they use.

**Firebase:** Config in `src/firebase.js`. Firestore collections: `tasks`, `users`, `tags`, `settings`. Firebase project: `avrupa-proje-istakip`.

## Version

Current version displayed in `BoardView.jsx` as `GÖREV PANELİ (V9.x.x)`. **Always update this string when bumping the version.**
