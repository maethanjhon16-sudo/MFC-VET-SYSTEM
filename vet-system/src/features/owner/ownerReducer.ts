import { getProduct } from './data';
import type { SortKey } from './data';
import type { CartLine, OwnerScreen, ProductCategory, ServiceCategory } from './types';

export type ProductTab = 'description' | 'ingredients' | 'reviews';

export interface OwnerState {
  screen: OwnerScreen;
  /** Label of the frame (outside this Figma section) shown on the "coming soon" page. */
  soonLabel: string;
  serviceId: string;
  petId: string;
  bookingPetId: string;
  productId: string;
  servicesChip: ServiceCategory | 'all';
  shopChip: ProductCategory | 'all';
  shopQuery: string;
  sort: SortKey;
  sortOpen: boolean;
  cart: CartLine[];
  /** Product Details page controls */
  sizeIndex: number;
  qty: number;
  tab: ProductTab;
  thumb: number;
  toast: string | null;
}

export type OwnerAction =
  | { type: 'GO_HOME' }
  | { type: 'GO_SERVICES'; chip?: ServiceCategory | 'all' }
  | { type: 'OPEN_SERVICE'; id: string }
  | { type: 'GO_SHOP'; chip?: ProductCategory | 'all'; query?: string }
  | { type: 'OPEN_PRODUCT'; id: string }
  | { type: 'GO_BOOKING'; serviceId?: string; petId?: string }
  | { type: 'GO_APPOINTMENTS' }
  | { type: 'GO_PET_PROFILE'; id: string }
  | { type: 'GO_RECORDS'; petId?: string }
  | { type: 'GO_MESSAGES' }
  | { type: 'GO_CART' }
  | { type: 'GO_ORDERS' }
  | { type: 'GO_PROFILE' }
  | { type: 'GO_NOTIFICATIONS' }
  | { type: 'GO_HELP' }
  | { type: 'GO_SOON'; label: string }
  | { type: 'SET_SERVICES_CHIP'; chip: ServiceCategory | 'all' }
  | { type: 'SET_SHOP_CHIP'; chip: ProductCategory | 'all' }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_SORT'; sort: SortKey }
  | { type: 'TOGGLE_SORT' }
  | { type: 'SET_SIZE'; index: number }
  | { type: 'STEP_QTY'; delta: number }
  | { type: 'SET_TAB'; tab: ProductTab }
  | { type: 'SET_THUMB'; index: number }
  | { type: 'ADD_TO_CART'; productId: string; sizeIndex: number; qty: number }
  | { type: 'RESTORE_CART'; cart: CartLine[] }
  | { type: 'SET_CART_QTY'; productId: string; sizeIndex: number; qty: number }
  | { type: 'REMOVE_CART_LINE'; productId: string; sizeIndex: number }
  | { type: 'CLEAR_CART' }
  | { type: 'DISMISS_TOAST' };

export function createInitialState(screen: OwnerScreen = 'owner-home'): OwnerState {
  return {
    screen,
    soonLabel: '',
    serviceId: 'consultation',
    petId: '',
    bookingPetId: '',
    productId: 'dog-food',
    servicesChip: 'all',
    shopChip: 'all',
    shopQuery: '',
    sort: 'Popular',
    sortOpen: false,
    cart: [],
    sizeIndex: 1,
    qty: 1,
    tab: 'description',
    thumb: 0,
    toast: null,
  };
}

export function ownerReducer(state: OwnerState, action: OwnerAction): OwnerState {
  switch (action.type) {
    case 'GO_HOME':
      return { ...state, screen: 'owner-home', sortOpen: false };
    case 'GO_SERVICES':
      return { ...state, screen: 'owner-services', servicesChip: action.chip ?? 'all' };
    case 'OPEN_SERVICE':
      return { ...state, screen: 'service-details', serviceId: action.id };
    case 'GO_SHOP':
      return {
        ...state,
        screen: 'owner-shop',
        shopChip: action.chip ?? 'all',
        shopQuery: action.query ?? '',
        sortOpen: false,
      };
    case 'OPEN_PRODUCT':
      return {
        ...state,
        screen: 'product-details',
        productId: action.id,
        sizeIndex: getProduct(action.id).defaultSize,
        qty: 1,
        tab: 'description',
        thumb: 0,
      };
    case 'GO_BOOKING':
      return {
        ...state,
        screen: 'appointment-booking',
        serviceId: action.serviceId ?? state.serviceId,
        bookingPetId: action.petId ?? '',
      };
    case 'GO_APPOINTMENTS':
      return { ...state, screen: 'owner-appointments' };
    case 'GO_PET_PROFILE':
      return { ...state, screen: 'owner-pet-profile', petId: action.id };
    case 'GO_RECORDS':
      return { ...state, screen: 'owner-records', petId: action.petId ?? '' };
    case 'GO_MESSAGES':
      return { ...state, screen: 'owner-messages' };
    case 'GO_CART':
      return { ...state, screen: 'owner-cart' };
    case 'GO_ORDERS':
      return { ...state, screen: 'owner-orders' };
    case 'GO_PROFILE':
      return { ...state, screen: 'owner-profile' };
    case 'GO_NOTIFICATIONS':
      return { ...state, screen: 'owner-notifications' };
    case 'GO_HELP':
      return { ...state, screen: 'owner-help' };
    case 'GO_SOON':
      return { ...state, screen: 'coming-soon', soonLabel: action.label };
    case 'SET_SERVICES_CHIP':
      return { ...state, servicesChip: action.chip };
    case 'SET_SHOP_CHIP':
      return { ...state, shopChip: action.chip };
    case 'SET_QUERY':
      return { ...state, shopQuery: action.query };
    case 'SET_SORT':
      return { ...state, sort: action.sort, sortOpen: false };
    case 'TOGGLE_SORT':
      return { ...state, sortOpen: !state.sortOpen };
    case 'SET_SIZE':
      return { ...state, sizeIndex: action.index };
    case 'STEP_QTY':
      return { ...state, qty: Math.min(20, Math.max(1, state.qty + action.delta)) };
    case 'SET_TAB':
      return { ...state, tab: action.tab };
    case 'SET_THUMB':
      return { ...state, thumb: action.index };
    case 'ADD_TO_CART': {
      const existing = state.cart.find((l) => l.productId === action.productId && l.sizeIndex === action.sizeIndex);
      const cart = existing
        ? state.cart.map((l) => (l === existing ? { ...l, qty: Math.min(20, l.qty + action.qty) } : l))
        : [...state.cart, { productId: action.productId, sizeIndex: action.sizeIndex, qty: action.qty }];
      return { ...state, cart, toast: `${getProduct(action.productId).name} added to your cart` };
    }
    case 'RESTORE_CART':
      return { ...state, cart: action.cart };
    case 'SET_CART_QTY':
      return {
        ...state,
        cart: state.cart.map((line) => (
          line.productId === action.productId && line.sizeIndex === action.sizeIndex
            ? { ...line, qty: Math.min(20, Math.max(1, action.qty)) }
            : line
        )),
      };
    case 'REMOVE_CART_LINE':
      return {
        ...state,
        cart: state.cart.filter((line) => line.productId !== action.productId || line.sizeIndex !== action.sizeIndex),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'DISMISS_TOAST':
      return { ...state, toast: null };
    default:
      return state;
  }
}

export const cartCount = (cart: CartLine[]) => cart.reduce((n, l) => n + l.qty, 0);
