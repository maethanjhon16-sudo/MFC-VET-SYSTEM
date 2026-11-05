import type { OwnerScreen } from './types';

export interface OwnerState {
  screen: OwnerScreen;
}

export type OwnerAction = { type: 'NAVIGATE'; to: OwnerScreen };

export function createInitialOwnerState(screen: OwnerScreen = 'owner-home'): OwnerState {
  return { screen };
}

export function ownerReducer(state: OwnerState, action: OwnerAction): OwnerState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.to };
    default:
      return state;
  }
}
