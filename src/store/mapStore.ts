import { create } from "zustand";
import type { Fragment, Milestone, Narrative, Note, MilestoneSuggestion } from "@/lib/schema";

export type DrawerMode = "detail" | "intelligence" | "notes" | null;

export interface MapSummary {
  id: string;
  name: string;
  editable: boolean;
  ownerLabel: string | null;
  kind: "database" | "snapshot";
}

interface MapState {
  zoomScale: number;
  activeNarrativeId: string | null;
  hidePersonalMilestones: boolean;
  drawerMode: DrawerMode;
  selectedMilestoneId: string | null;
  selectedSuggestionId: string | null;
  selectedNoteId: string | null;
  selectedFragmentId: string | null;
  videoModalOpen: boolean;
  videoModalUrl: string | null;
  videoModalFragments: Fragment[];
  narratives: Narrative[];
  milestones: Milestone[];
  milestoneSuggestions: MilestoneSuggestion[];
  fragments: Fragment[];
  notes: Note[];
  activeMapId: string;
  activeMapName: string;
  readOnly: boolean;
  availableMaps: MapSummary[];
  setZoomScale: (scale: number) => void;
  setActiveNarrativeId: (id: string | null) => void;
  toggleHidePersonalMilestones: () => void;
  setDrawerMode: (mode: DrawerMode) => void;
  setSelectedMilestoneId: (id: string | null) => void;
  setSelectedSuggestionId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  setSelectedFragmentId: (id: string | null) => void;
  setNotes: (notes: Note[]) => void;
  openVideoModal: (url: string, fragments: Fragment[]) => void;
  closeVideoModal: () => void;
  setData: (data: {
    narratives: Narrative[];
    milestones: Milestone[];
    milestoneSuggestions?: MilestoneSuggestion[];
    fragments: Fragment[];
    notes?: Note[];
  }) => void;
  setMapContext: (ctx: {
    activeMapId: string;
    activeMapName: string;
    readOnly: boolean;
    availableMaps: MapSummary[];
  }) => void;
}

export const useMapStore = create<MapState>((set) => ({
  zoomScale: 50,
  activeNarrativeId: null,
  hidePersonalMilestones: false,
  drawerMode: null,
  selectedMilestoneId: null,
  selectedSuggestionId: null,
  selectedNoteId: null,
  selectedFragmentId: null,
  videoModalOpen: false,
  videoModalUrl: null,
  videoModalFragments: [],
  narratives: [],
  milestones: [],
  milestoneSuggestions: [],
  fragments: [],
  notes: [],
  activeMapId: "my-map",
  activeMapName: "My Map",
  readOnly: false,
  availableMaps: [],
  setZoomScale: (scale) => set({ zoomScale: scale }),
  setActiveNarrativeId: (id) =>
    set((s) => ({
      activeNarrativeId: s.activeNarrativeId === id ? null : id,
    })),
  toggleHidePersonalMilestones: () =>
    set((s) => {
      const hidePersonalMilestones = !s.hidePersonalMilestones;
      const selected = s.milestones.find((m) => m.id === s.selectedMilestoneId);
      const selectedNote = s.notes.find((n) => n.id === s.selectedNoteId);
      const clearPersonalSelection =
        hidePersonalMilestones && selected?.isPersonal;
      const clearPersonalNoteSelection =
        hidePersonalMilestones && selectedNote?.isPersonal;

      return {
        hidePersonalMilestones,
        ...(clearPersonalSelection
          ? {
              selectedMilestoneId: null,
              drawerMode: s.drawerMode === "detail" ? null : s.drawerMode,
            }
          : {}),
        ...(clearPersonalNoteSelection
          ? {
              selectedNoteId: null,
              drawerMode: s.drawerMode === "notes" ? null : s.drawerMode,
            }
          : {}),
      };
    }),
  setDrawerMode: (mode) => set({ drawerMode: mode }),
  setSelectedMilestoneId: (id) =>
    set({ selectedMilestoneId: id, selectedSuggestionId: null }),
  setSelectedSuggestionId: (id) =>
    set({ selectedSuggestionId: id, selectedMilestoneId: null }),
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setSelectedFragmentId: (id) => set({ selectedFragmentId: id }),
  setNotes: (notes) => set({ notes }),
  openVideoModal: (url, fragments) =>
    set({
      videoModalOpen: true,
      videoModalUrl: url,
      videoModalFragments: fragments,
    }),
  closeVideoModal: () =>
    set({
      videoModalOpen: false,
      videoModalUrl: null,
      videoModalFragments: [],
    }),
  setData: (data) =>
    set((s) => ({
      narratives: data.narratives,
      milestones: data.milestones,
      milestoneSuggestions: data.milestoneSuggestions ?? [],
      fragments: data.fragments,
      notes: data.notes ?? s.notes,
      videoModalFragments:
        s.videoModalOpen && s.videoModalUrl
          ? data.fragments.filter((f) => f.sourceUrl === s.videoModalUrl)
          : s.videoModalFragments,
    })),
  setMapContext: (ctx) =>
    set({
      activeMapId: ctx.activeMapId,
      activeMapName: ctx.activeMapName,
      readOnly: ctx.readOnly,
      availableMaps: ctx.availableMaps,
    }),
}));
