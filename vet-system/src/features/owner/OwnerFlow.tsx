import { useEffect, useMemo, useReducer, useState } from 'react';
import { OwnerShell } from '../../components/owner/OwnerShell';
import { getOwnerInventory, getOwnerNotificationCount, getOwnerServices } from '../auth/api';
import { getProduct, getService, PRODUCTS, SERVICES } from './data';
import { cartCount, createInitialState, ownerReducer } from './ownerReducer';
import { ComingSoon } from './screens/ComingSoon';
import { OwnerHome } from './screens/OwnerHome';
import { OwnerServices } from './screens/OwnerServices';
import { OwnerShop } from './screens/OwnerShop';
import { ProductDetails } from './screens/ProductDetails';
import { ServiceDetails } from './screens/ServiceDetails';
import { AppointmentBooking, OwnerAppointments } from './screens/AppointmentScreens';
import { OwnerCart, OwnerOrders } from './screens/OwnerCommerceScreens';
import { OwnerHelp, OwnerNotifications, OwnerProfileScreen } from './screens/OwnerAccountScreens';
import { OwnerMessages, OwnerMedicalRecords } from './screens/OwnerHealthScreens';
import { OwnerPetProfile } from './screens/OwnerPetProfile';
import type { NavKey, OwnerNav, OwnerScreen } from './types';
import type { CartLine } from './types';
import s from './screens/Screens.module.css';

interface OwnerFlowProps {
  initialScreen?: OwnerScreen;
  ownerId: string;
  ownerName: string;
  onOwnerNameUpdated: (name: string) => void;
  /** Called when the owner signs out. */
  onSignOut: () => void;
}

const ACTIVE_NAV: Record<OwnerScreen, NavKey | null> = {
  'owner-home': 'home',
  'owner-services': 'actions',
  'service-details': 'actions',
  'appointment-booking': 'actions',
  'owner-appointments': 'schedule',
  'owner-pet-profile': null,
  'owner-records': null,
  'owner-messages': null,
  'owner-cart': null,
  'owner-orders': 'shop',
  'owner-profile': null,
  'owner-notifications': null,
  'owner-help': null,
  'owner-shop': 'shop',
  'product-details': 'shop',
  'coming-soon': null,
};

const CART_STORAGE_PREFIX = 'mfc-owner-cart:';

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const line = value as Record<string, unknown>;
  if (typeof line.productId !== 'string') return false;
  const product = PRODUCTS.find((item) => item.id === line.productId);
  return Boolean(
    product
    && typeof line.sizeIndex === 'number'
    && Number.isInteger(line.sizeIndex)
    && line.sizeIndex >= 0
    && line.sizeIndex < product.sizes.length
    && typeof line.qty === 'number'
    && Number.isInteger(line.qty)
    && line.qty >= 1
    && line.qty <= 20,
  );
}

function readStoredCart(value: string | null): CartLine[] {
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isCartLine);
}

export function OwnerFlow({ initialScreen = 'owner-home', ownerId, ownerName, onOwnerNameUpdated, onSignOut }: OwnerFlowProps) {
  const [state, dispatch] = useReducer(ownerReducer, initialScreen, createInitialState);
  const [cartReady, setCartReady] = useState(false);
  const [cartStorageError, setCartStorageError] = useState<string | null>(null);
  const [enabledServiceIds, setEnabledServiceIds] = useState<string[]>(() => SERVICES.map((service) => service.id));
  const [serviceSettingsError, setServiceSettingsError] = useState<string | null>(null);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [inventoryReady, setInventoryReady] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const nav = useMemo<OwnerNav>(
    () => ({
      home: () => dispatch({ type: 'GO_HOME' }),
      services: (chip) => dispatch({ type: 'GO_SERVICES', chip }),
      service: (id) => dispatch({ type: 'OPEN_SERVICE', id }),
      shop: (chip) => dispatch({ type: 'GO_SHOP', chip }),
      product: (id) => dispatch({ type: 'OPEN_PRODUCT', id }),
      book: (serviceId) => dispatch({ type: 'GO_BOOKING', serviceId }),
      appointments: () => dispatch({ type: 'GO_APPOINTMENTS' }),
      pet: (id) => dispatch({ type: 'GO_PET_PROFILE', id }),
      records: (petId) => dispatch({ type: 'GO_RECORDS', petId }),
      messages: () => dispatch({ type: 'GO_MESSAGES' }),
      cart: () => dispatch({ type: 'GO_CART' }),
      orders: () => dispatch({ type: 'GO_ORDERS' }),
      profile: () => dispatch({ type: 'GO_PROFILE' }),
      notifications: () => dispatch({ type: 'GO_NOTIFICATIONS' }),
      help: () => dispatch({ type: 'GO_HELP' }),
      soon: (label) => dispatch({ type: 'GO_SOON', label }),
    }),
    [],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`${CART_STORAGE_PREFIX}${ownerId}`);
      dispatch({ type: 'RESTORE_CART', cart: readStoredCart(saved) });
      setCartStorageError(null);
    } catch (error) {
      setCartStorageError(error instanceof Error ? error.message : 'Cart storage is unavailable in this browser.');
    } finally {
      setCartReady(true);
    }
  }, [ownerId]);

  useEffect(() => {
    if (!cartReady) return;
    try {
      const key = `${CART_STORAGE_PREFIX}${ownerId}`;
      if (state.cart.length) window.localStorage.setItem(key, JSON.stringify(state.cart));
      else window.localStorage.removeItem(key);
      setCartStorageError(null);
    } catch (error) {
      setCartStorageError(error instanceof Error ? error.message : 'Cart changes could not be saved in this browser.');
    }
  }, [cartReady, ownerId, state.cart]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { services } = await getOwnerServices();
        if (active) {
          setEnabledServiceIds(services.filter((service) => service.isEnabled).map((service) => service.serviceId));
          setServiceSettingsError(null);
        }
      } catch (error) {
        if (active) {
          setServiceSettingsError(error instanceof Error ? error.message : 'Could not load clinic service availability.');
        }
      }
    };
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void refresh();
    };
    void refresh();
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading) return;
      loading = true;
      try {
        const { unreadCount } = await getOwnerNotificationCount();
        if (active) {
          setNotificationCount(unreadCount);
          setNotificationError(null);
        }
      } catch (error) {
        if (active) setNotificationError(error instanceof Error ? error.message : 'Could not refresh notification count.');
      } finally {
        loading = false;
      }
    };
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void refresh();
    };
    void refresh();
    const timer = window.setInterval(refreshIfVisible, 15_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading) return;
      loading = true;
      try {
        const { inventory } = await getOwnerInventory();
        if (active) {
          setStockLevels(Object.fromEntries(inventory.map((item) => [item.productId, item.quantity])));
          setInventoryReady(true);
          setInventoryError(null);
        }
      } catch (error) {
        if (active) {
          setInventoryError(error instanceof Error ? error.message : 'Could not load current product stock.');
        }
      } finally {
        loading = false;
      }
    };
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) void refresh();
    };
    void refresh();
    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, []);

  // New page → start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen, state.serviceId, state.productId, state.soonLabel]);

  // Toast auto-dismiss.
  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: 'DISMISS_TOAST' }), 3200);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  const product = getProduct(state.productId);

  return (
    <OwnerShell
      active={ACTIVE_NAV[state.screen]}
      nav={nav}
      ownerName={ownerName}
      cartCount={cartCount(state.cart)}
      notificationCount={notificationCount}
      query={state.screen === 'owner-shop' ? state.shopQuery : ''}
      onSearch={(query) => dispatch({ type: 'GO_SHOP', query })}
      onSignOut={onSignOut}
    >
      {cartStorageError && <p className={s.pageError} role="alert">Your cart could not be saved on this device. {cartStorageError}</p>}
      {serviceSettingsError && <p className={s.pageError} role="alert">Could not refresh service availability. Booking requests are still checked by the clinic. {serviceSettingsError}</p>}
      {inventoryError && <p className={s.pageError} role="alert">Could not refresh product stock. {inventoryError}</p>}
      {notificationError && <p className={s.pageError} role="alert">Could not refresh notifications. {notificationError}</p>}
      {state.screen === 'owner-home' && <OwnerHome nav={nav} ownerName={ownerName} enabledServiceIds={enabledServiceIds} stockLevels={stockLevels} />}
      {state.screen === 'owner-services' && (
        <OwnerServices nav={nav} chip={state.servicesChip} enabledServiceIds={enabledServiceIds} onChip={(chip) => dispatch({ type: 'SET_SERVICES_CHIP', chip })} />
      )}
      {state.screen === 'service-details' && <ServiceDetails nav={nav} service={getService(state.serviceId)} isEnabled={enabledServiceIds.includes(state.serviceId)} />}
      {state.screen === 'appointment-booking' && (
        <AppointmentBooking
          serviceId={state.serviceId}
          initialPetId={state.bookingPetId}
          enabledServiceIds={enabledServiceIds}
          onCancel={nav.appointments}
          onBooked={nav.appointments}
          onManagePets={nav.home}
        />
      )}
      {state.screen === 'owner-appointments' && (
        <OwnerAppointments onBook={() => nav.book()} onCancel={() => nav.home()} />
      )}
      {state.screen === 'owner-pet-profile' && <OwnerPetProfile id={state.petId} nav={nav} />}
      {state.screen === 'owner-records' && <OwnerMedicalRecords key={state.petId} nav={nav} initialPetId={state.petId} />}
      {state.screen === 'owner-messages' && <OwnerMessages ownerId={ownerId} />}
      {state.screen === 'owner-cart' && (
        <OwnerCart
          cart={state.cart}
          onQuantity={(line, quantity) => dispatch({ type: 'SET_CART_QTY', productId: line.productId, sizeIndex: line.sizeIndex, qty: quantity })}
          onRemove={(line) => dispatch({ type: 'REMOVE_CART_LINE', productId: line.productId, sizeIndex: line.sizeIndex })}
          onClear={() => dispatch({ type: 'CLEAR_CART' })}
          onContinueShopping={() => nav.shop()}
          onOrderPlaced={nav.orders}
          stockLevels={stockLevels}
          inventoryReady={inventoryReady}
          inventoryError={inventoryError}
        />
      )}
      {state.screen === 'owner-orders' && <OwnerOrders nav={nav} />}
      {state.screen === 'owner-profile' && <OwnerProfileScreen onNameUpdated={onOwnerNameUpdated} />}
      {state.screen === 'owner-notifications' && <OwnerNotifications nav={nav} />}
      {state.screen === 'owner-help' && <OwnerHelp nav={nav} />}
      {state.screen === 'owner-shop' && (
        <OwnerShop
          nav={nav}
          chip={state.shopChip}
          query={state.shopQuery}
          sort={state.sort}
          sortOpen={state.sortOpen}
          cartCount={cartCount(state.cart)}
          stockLevels={stockLevels}
          onChip={(chip) => dispatch({ type: 'SET_SHOP_CHIP', chip })}
          onQuery={(query) => dispatch({ type: 'SET_QUERY', query })}
          onSort={(sort) => dispatch({ type: 'SET_SORT', sort })}
          onToggleSort={() => dispatch({ type: 'TOGGLE_SORT' })}
        />
      )}
      {state.screen === 'product-details' && (
        <ProductDetails
          key={state.productId}
          nav={nav}
          product={product}
          stockCount={stockLevels[product.id] ?? 0}
          inventoryReady={inventoryReady}
          stockLevels={stockLevels}
          maxQuantity={Math.max(0, (stockLevels[product.id] ?? 0) - state.cart
            .filter((line) => line.productId === product.id)
            .reduce((sum, line) => sum + line.qty, 0))}
          sizeIndex={state.sizeIndex}
          qty={state.qty}
          tab={state.tab}
          thumb={state.thumb}
          onSize={(index) => dispatch({ type: 'SET_SIZE', index })}
          onQty={(delta) => dispatch({ type: 'STEP_QTY', delta })}
          onTab={(tab) => dispatch({ type: 'SET_TAB', tab })}
          onThumb={(index) => dispatch({ type: 'SET_THUMB', index })}
          onAdd={() => dispatch({ type: 'ADD_TO_CART', productId: product.id, sizeIndex: state.sizeIndex, qty: state.qty })}
          onBuyNow={() => {
            dispatch({ type: 'ADD_TO_CART', productId: product.id, sizeIndex: state.sizeIndex, qty: state.qty });
            nav.cart();
          }}
        />
      )}
      {state.screen === 'coming-soon' && <ComingSoon nav={nav} label={state.soonLabel} cart={state.cart} onSignOut={onSignOut} />}

      {state.toast && (
        <div className={s.toast} role="status">
          {state.toast}
          <button type="button" onClick={nav.cart}>View cart</button>
        </div>
      )}
    </OwnerShell>
  );
}
