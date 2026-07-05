import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetch } from "../utils/api";
import { GeneratedAd } from "../utils/mockGenerator";
import { CalendarEvent } from "../components/GoniflowCalendar";

export interface Project {
  id: string;
  name: string;
  link: string;
  description: string;
  logo_url: string;
  created_at?: string;
}

export interface SavedAd {
  id: string;
  project_id: string;
  platform: string;
  tone: string;
  headline?: string;
  text: string;
  cta?: string;
  image_url?: string;
  created_at?: string;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  savedAds: SavedAd[];
  isLoading: boolean;
  error: string | null;

  // Global editor states
  editorPrompt: string;
  setEditorPrompt: (val: string) => void;
  editorImagePrompt: string;
  setEditorImagePrompt: (val: string) => void;
  editorPlatform: string;
  setEditorPlatform: (val: string) => void;
  editorTone: string;
  setEditorTone: (val: string) => void;
  editorUploadedImage: string | null;
  setEditorUploadedImage: (val: string | null) => void;
  editorUploadedImageName: string | null;
  setEditorUploadedImageName: (val: string | null) => void;
  editorGeneratedAd: GeneratedAd | null;
  setEditorGeneratedAd: (ad: GeneratedAd | null) => void;
  scheduleTargetDate: string | null;
  setScheduleTargetDate: (date: string | null) => void;
  editingCalendarEvent: CalendarEvent | null;
  setEditingCalendarEvent: (event: CalendarEvent | null) => void;

  // Global notifications
  notification: { type: "success" | "error"; message: string } | null;
  setNotification: (val: { type: "success" | "error"; message: string } | null) => void;
  showNotification: (type: "success" | "error", message: string) => void;

  // Calendar State & CRUD (server-side)
  calendarEvents: CalendarEvent[];
  pendingCalendarEvent: Omit<CalendarEvent, "id" | "start"> | null;
  setPendingCalendarEvent: (val: Omit<CalendarEvent, "id" | "start"> | null) => void;
  fetchCalendarEvents: () => Promise<void>;
  addCalendarEvent: (ev: Omit<CalendarEvent, "id">) => Promise<void>;
  updateCalendarEvent: (id: string, changes: Partial<CalendarEvent>) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;

  // Project Modal State
  isProjectModalOpen: boolean;
  editingProject: Project | null;
  openCreateProjectModal: () => void;
  openEditProjectModal: (project: Project) => void;
  closeProjectModal: () => void;

  fetchProjects: () => Promise<void>;
  createProject: (project: Omit<Project, "id">) => Promise<void>;
  updateProject: (id: string, project: Omit<Project, "id">) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
  fetchSavedAds: (projectId: string) => Promise<void>;
  saveAd: (projectId: string, ad: Omit<SavedAd, "id" | "project_id">) => Promise<void>;
  deleteSavedAd: (projectId: string, adId: string) => Promise<void>;
}

// Maps backend calendar_event row → frontend CalendarEvent shape
function mapEventFromServer(raw: Record<string, unknown>): CalendarEvent {
  const platform = raw.platform as string;
  return {
    id:         raw.id as string,
    title:      (raw.headline as string) || platform, // required by CalendarEvent
    platform,
    tone:       raw.tone as string,
    headline:   raw.headline as string | undefined,
    text:       raw.text as string | undefined,
    cta:        raw.cta as string | undefined,
    start:      raw.start_time as string, // backend: start_time → frontend: start
    allDay:     raw.all_day as boolean | undefined,
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProject: null,
      savedAds: [],
      isLoading: false,
      error: null,

      // Project modal state
      isProjectModalOpen: false,
      editingProject: null,
      openCreateProjectModal: () => set({ isProjectModalOpen: true, editingProject: null }),
      openEditProjectModal: (project) => set({ isProjectModalOpen: true, editingProject: project }),
      closeProjectModal: () => set({ isProjectModalOpen: false, editingProject: null }),

      // Initial editor states
      editorPrompt: "",
      setEditorPrompt: (val) => set({ editorPrompt: val }),
      editorImagePrompt: "",
      setEditorImagePrompt: (val) => set({ editorImagePrompt: val }),
      editorPlatform: "facebook",
      setEditorPlatform: (val) => set({ editorPlatform: val }),
      editorTone: "professional",
      setEditorTone: (val) => set({ editorTone: val }),
      editorUploadedImage: null,
      setEditorUploadedImage: (val) => set({ editorUploadedImage: val }),
      editorUploadedImageName: null,
      setEditorUploadedImageName: (val) => set({ editorUploadedImageName: val }),
      editorGeneratedAd: null,
      setEditorGeneratedAd: (ad) => set({ editorGeneratedAd: ad }),
      scheduleTargetDate: null,
      setScheduleTargetDate: (date) => set({ scheduleTargetDate: date }),
      editingCalendarEvent: null,
      setEditingCalendarEvent: (event) => set({ editingCalendarEvent: event }),

      notification: null,
      setNotification: (val) => set({ notification: val }),
      showNotification: (type, message) => set({ notification: { type, message } }),

      // ── Calendar — server-side ──────────────────────────────────────────
      calendarEvents: [],
      pendingCalendarEvent: null,
      setPendingCalendarEvent: (val) => set({ pendingCalendarEvent: val }),

      fetchCalendarEvents: async () => {
        try {
          const res = await apiFetch("/calendar");
          const events: CalendarEvent[] = (res.data || []).map(mapEventFromServer);
          set({ calendarEvents: events });
        } catch (err) {
          // If backend endpoint not yet deployed, show empty calendar (no crash)
          console.warn("fetchCalendarEvents failed:", (err as Error).message);
          set({ calendarEvents: [] });
        }
      },

      addCalendarEvent: async (ev) => {
        try {
          const body = {
            project_id:  get().activeProject?.id ?? null,
            platform:    ev.platform,
            tone:        ev.tone,
            headline:    ev.headline ?? "",
            text:        ev.text ?? "",
            cta:         ev.cta ?? "",
            start_time:  ev.start,   // frontend "start" → backend "start_time"
            all_day:     ev.allDay ?? false,
          };
          const res = await apiFetch("/calendar", {
            method: "POST",
            body: JSON.stringify(body),
          });
          const newEvent = mapEventFromServer(res.data);
          set({ calendarEvents: [...get().calendarEvents, newEvent] });
          get().showNotification("success", "პოსტი განრიგში დაემატა!");
        } catch (err) {
          get().showNotification("error", `განრიგში დამატება ვერ მოხდა: ${(err as Error).message}`);
        }
      },

      updateCalendarEvent: async (id, changes) => {
        try {
          const body: Record<string, unknown> = { ...changes };
          // Remap "start" → "start_time" for backend
          if ("start" in body) {
            body.start_time = body.start;
            delete body.start;
          }
          const res = await apiFetch(`/calendar/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
          const updated = mapEventFromServer(res.data);
          set({
            calendarEvents: get().calendarEvents.map((ev) =>
              ev.id === id ? updated : ev
            ),
          });
        } catch (err) {
          get().showNotification("error", `განახლება ვერ მოხდა: ${(err as Error).message}`);
        }
      },

      deleteCalendarEvent: async (id) => {
        try {
          await apiFetch(`/calendar/${id}`, { method: "DELETE" });
          set({
            calendarEvents: get().calendarEvents.filter((ev) => ev.id !== id),
          });
          get().showNotification("success", "ჩანაწერი წაიშალა!");
        } catch (err) {
          get().showNotification("error", `წაშლა ვერ მოხდა: ${(err as Error).message}`);
        }
      },

      // ── Projects ────────────────────────────────────────────────────────
      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiFetch("/projects");
          set({ projects: res.data || [], isLoading: false });
          if (res.data && res.data.length > 0) {
            if (!get().activeProject) {
              get().setActiveProject(res.data[0]);
            } else {
              get().fetchSavedAds(get().activeProject!.id);
            }
          }
        } catch (err) {
          console.warn("fetchProjects failed:", (err as Error).message);
          set({ projects: [], isLoading: false });
        }
      },

      createProject: async (projData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiFetch("/projects", {
            method: "POST",
            body: JSON.stringify(projData),
          });
          const updated = [res.data, ...get().projects];
          set({ projects: updated, activeProject: res.data, isLoading: false });
          get().fetchSavedAds(res.data.id);
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      updateProject: async (id, projData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiFetch(`/projects/${id}`, {
            method: "PUT",
            body: JSON.stringify(projData),
          });
          const updated = get().projects.map((p) => (p.id === id ? res.data : p));
          set({
            projects: updated,
            activeProject: get().activeProject?.id === id ? res.data : get().activeProject,
            isLoading: false,
          });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      deleteProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await apiFetch(`/projects/${id}`, { method: "DELETE" });
          const updated = get().projects.filter((p) => p.id !== id);
          set({
            projects: updated,
            activeProject: updated.length > 0 ? updated[0] : null,
            isLoading: false,
          });
          if (updated.length > 0) {
            get().fetchSavedAds(updated[0].id);
          } else {
            set({ savedAds: [] });
          }
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      setActiveProject: (project) => {
        set({ activeProject: project });
        if (project) {
          get().fetchSavedAds(project.id);
        } else {
          set({ savedAds: [] });
        }
      },

      // ── Saved Ads ───────────────────────────────────────────────────────
      fetchSavedAds: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiFetch(`/projects/${projectId}/ads`);
          set({ savedAds: res.data || [], isLoading: false });
        } catch (err) {
          console.warn("fetchSavedAds failed:", (err as Error).message);
          set({ savedAds: [], isLoading: false });
        }
      },

      saveAd: async (projectId, adData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiFetch(`/projects/${projectId}/ads`, {
            method: "POST",
            body: JSON.stringify(adData),
          });
          set({ savedAds: [res.data, ...get().savedAds], isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      deleteSavedAd: async (projectId, adId) => {
        set({ isLoading: true, error: null });
        try {
          await apiFetch(`/projects/${projectId}/ads/${adId}`, { method: "DELETE" });
          set({
            savedAds: get().savedAds.filter((ad) => ad.id !== adId),
            isLoading: false,
          });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },
    }),
    {
      name: "goniflow-project-storage",
      partialize: (state) => ({
        activeProject: state.activeProject,
      }),
    }
  )
);
