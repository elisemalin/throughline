'use client';

// Tracks the open/closed state of global UI shells (a single application
// drawer, the global "add application" modal, etc.). Routing itself uses
// Next's pathname — this store only holds state that lives across route
// transitions or that is opened from multiple routes.

import { create } from 'zustand';

export type NavigationModalKey =
  | 'application-create'
  | 'skills-import'
  | 'discovery-add-company'
  | null;

export type NavigationState = {
  activeModal: NavigationModalKey;
  detailApplicationId: string | null;
  openModal: (key: NonNullable<NavigationModalKey>) => void;
  closeModal: () => void;
  openApplicationDetail: (id: string) => void;
  closeApplicationDetail: () => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModal: null,
  detailApplicationId: null,
  openModal: (key) => set({ activeModal: key }),
  closeModal: () => set({ activeModal: null }),
  openApplicationDetail: (id) => set({ detailApplicationId: id }),
  closeApplicationDetail: () => set({ detailApplicationId: null }),
}));
