import { create } from "zustand";
import type {
  Fragment,
  Narrative,
  Note,
  MilestoneSuggestion,
  MilestoneWithNarratives,
} from "@/lib/schema";

export type DrawerMode = "detail" | "intelligence" | "notes" | "comments" | null;
export type NarrativeFocusMode = "fade" | "hide";

export interface MapSummary {
  id: string;
  name: string;
  editable: boolean;
  ownerLabel: string | null;
  kind: "database" | "snapshot";
  visibility?: "private" | "public";
  shareSlug?: string;
}

interface MapState {
  zoomScale: number;
  activeNarrativeId: string | null;
  hidePersonalMilestones: boolean;
  narrativeFocusMode: NarrativeFocusMode;
  drawerMode: DrawerMode;
  selectedMilestoneId: string | null;
  selectedSuggestionId: string | null;
  selectedNoteId: string | null;
  selectedFragmentId: string | null;
  videoModalOpen: boolean;
  videoModalUrl: string | null;
  videoModalFragments: Fragment[];
  narratives: Narrative[];
  milestones: MilestoneWithNarratives[];
  milestoneSuggestions: MilestoneSuggestion[];
  fragments: Fragment[];
  notes: Note[];
  activeMapId: string;
  activeMapName: string;
  readOnly: boolean;
  shareSlug: string | null;
  visibility: "private" | "public";
  availableMaps: MapSummary[];
  viewerLoggedIn: boolean;
  setZoomScale: (scale: number) => void;
  setActiveNarrativeId: (id: string | null) => void;
  toggleHidePersonalMilestones: () => void;
  setNarrativeFocusMode: (mode: NarrativeFocusMode) => void;
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
    milestones: MilestoneWithNarratives[];
    milestoneSuggestions?: MilestoneSuggestion[];
    fragments: Fragment[];
    notes?: Note[];
  }) => void;
  setMapContext: (ctx: {
    activeMapId: string;
    activeMapName: string;
    readOnly: boolean;
    shareSlug?: string | null;
    visibility?: "private" | "public";
    availableMaps: MapSummary[];
    viewerLoggedIn?: boolean;
  }) => void;
}

export const useMapStore = create<MapState>((set) => ({
  zoomScale: 50,
  activeNarrativeId: null,
  hidePersonalMilestones: false,
  narrativeFocusMode: "fade",
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
  activeMapId: "",
  activeMapName: "My Map",
  readOnly: false,
  shareSlug: null,
  visibility: "private",
  availableMaps: [],
  viewerLoggedIn: false,
  setZoomScale: (scale) => set({ zoomScale: scale }),
  setActiveNarrativeId: (id) =>
    set((s) => ({
      activeNarrativeId: s.activeNarrativeId === id ? null : id,
    })),
  setNarrativeFocusMode: (mode) => set({ narrativeFocusMode: mode }),
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
      shareSlug: ctx.shareSlug ?? null,
      visibility: ctx.visibility ?? "private",
      availableMaps: ctx.availableMaps,
      viewerLoggedIn: ctx.viewerLoggedIn ?? false,
    }),
}));
