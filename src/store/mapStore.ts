import { create } from "zustand";
import type { Fragment, Milestone, Narrative } from "@/lib/schema";

export type DrawerMode = "detail" | "intelligence" | null;

interface MapState {
  zoomScale: number;
  activeNarrativeId: string | null;
  drawerMode: DrawerMode;
  selectedMilestoneId: string | null;
  selectedFragmentId: string | null;
  videoModalOpen: boolean;
  videoModalUrl: string | null;
  videoModalFragments: Fragment[];
  narratives: Narrative[];
  milestones: Milestone[];
  fragments: Fragment[];
  setZoomScale: (scale: number) => void;
  setActiveNarrativeId: (id: string | null) => void;
  setDrawerMode: (mode: DrawerMode) => void;
  setSelectedMilestoneId: (id: string | null) => void;
  setSelectedFragmentId: (id: string | null) => void;
  openVideoModal: (url: string, fragments: Fragment[]) => void;
  closeVideoModal: () => void;
  setData: (data: {
    narratives: Narrative[];
    milestones: Milestone[];
    fragments: Fragment[];
  }) => void;
}

export const useMapStore = create<MapState>((set) => ({
  zoomScale: 50,
  activeNarrativeId: null,
  drawerMode: null,
  selectedMilestoneId: null,
  selectedFragmentId: null,
  videoModalOpen: false,
  videoModalUrl: null,
  videoModalFragments: [],
  narratives: [],
  milestones: [],
  fragments: [],
  setZoomScale: (scale) => set({ zoomScale: scale }),
  setActiveNarrativeId: (id) =>
    set((s) => ({
      activeNarrativeId: s.activeNarrativeId === id ? null : id,
    })),
  setDrawerMode: (mode) => set({ drawerMode: mode }),
  setSelectedMilestoneId: (id) => set({ selectedMilestoneId: id }),
  setSelectedFragmentId: (id) => set({ selectedFragmentId: id }),
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
      fragments: data.fragments,
      videoModalFragments:
        s.videoModalOpen && s.videoModalUrl
          ? data.fragments.filter((f) => f.sourceUrl === s.videoModalUrl)
          : s.videoModalFragments,
    })),
}));
