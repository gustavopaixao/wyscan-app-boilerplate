/**
 * Admin shell UI state.
 *
 * Two independent notions of "sidebar visible", which is why there are two
 * flags rather than one:
 *
 *   sidebarOpen       the mobile drawer (below `lg`). Ephemeral — it must NOT
 *                     be persisted, or a reload would restore a drawer the user
 *                     never opened, over content they were reading.
 *   sidebarCollapsed  the desktop icon rail (at `lg` and up). Persisted: it is
 *                     a deliberate preference about how you like to work.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UIState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  /** Per-group expansion, keyed by `NavGroup.id`. */
  sidebarGroups: Record<string, boolean>;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarGroupExpanded: (groupId: string, expanded: boolean) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      sidebarGroups: {},
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSidebarCollapsed: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarGroupExpanded: (groupId, expanded) =>
        set((s) => ({
          sidebarGroups: { ...s.sidebarGroups, [groupId]: expanded },
        })),
    }),
    {
      // Project-scoped so two generated consoles on one host do not share state.
      name: "__PROJECT_SLUG__-admin-ui",
      storage: createJSONStorage(() => localStorage),
      // `sidebarOpen` is deliberately excluded — see the note above.
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        sidebarGroups: s.sidebarGroups,
      }),
    },
  ),
);
