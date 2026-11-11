import { useEffect, useMemo, useReducer } from 'react';
import { OwnerShell } from '../../components/owner/OwnerShell';
import { getProduct, getService } from './data';
import { cartCount, createInitialState, ownerReducer } from './ownerReducer';
import { ComingSoon } from './screens/ComingSoon';
import { OwnerHome } from './screens/OwnerHome';
import { OwnerServices } from './screens/OwnerServices';
import { OwnerShop } from './screens/OwnerShop';
import { ProductDetails } from './screens/ProductDetails';
import { ServiceDetails } from './screens/ServiceDetails';
import type { NavKey, OwnerNav, OwnerScreen } from './types';
import s from './screens/Screens.module.css';

interface OwnerFlowProps {
  initialScreen?: OwnerScreen;
  /** Called when the owner signs out. */
  onSignOut: () => void;
}

const ACTIVE_NAV: Record<OwnerScreen, NavKey | null> = {
  'owner-home': 'home',
  'owner-services': 'actions',
  'service-details': 'actions',
  'owner-shop': 'shop',
  'product-details': 'shop',
  'coming-soon': null,
};

export function OwnerFlow({ initialScreen = 'owner-home', onSignOut }: OwnerFlowProps) {
  const [state, dispatch] = useReducer(ownerReducer, initialScreen, createInitialState);

  const nav = useMemo<OwnerNav>(
    () => ({
      home: () => dispatch({ type: 'GO_HOME' }),
      services: (chip) => dispatch({ type: 'GO_SERVICES', chip }),
      service: (id) => dispatch({ type: 'OPEN_SERVICE', id }),
      shop: (chip) => dispatch({ type: 'GO_SHOP', chip }),
      product: (id) => dispatch({ type: 'OPEN_PRODUCT', id }),
      soon: (label) => dispatch({ type: 'GO_SOON', label }),
    }),
    [],
  );

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
      cartCount={cartCount(state.cart)}
      query={state.screen === 'owner-shop' ? state.shopQuery : ''}
      onSearch={(query) => dispatch({ type: 'GO_SHOP', query })}
    >
      {state.screen === 'owner-home' && <OwnerHome nav={nav} />}
      {state.screen === 'owner-services' && (
        <OwnerServices nav={nav} chip={state.servicesChip} onChip={(chip) => dispatch({ type: 'SET_SERVICES_CHIP', chip })} />
      )}
      {state.screen === 'service-details' && <ServiceDetails nav={nav} service={getService(state.serviceId)} />}
      {state.screen === 'owner-shop' && (
        <OwnerShop
          nav={nav}
          chip={state.shopChip}
          query={state.shopQuery}
          sort={state.sort}
          sortOpen={state.sortOpen}
          cartCount={cartCount(state.cart)}
          onChip={(chip) => dispatch({ type: 'SET_SHOP_CHIP', chip })}
          onQuery={(query) => dispatch({ type: 'SET_QUERY', query })}
          onSort={(sort) => dispatch({ type: 'SET_SORT', sort })}
          onToggleSort={() => dispatch({ type: 'TOGGLE_SORT' })}
        />
      )}
      {state.screen === 'product-details' && (
        <ProductDetails
          nav={nav}
          product={product}
          sizeIndex={state.sizeIndex}
          qty={state.qty}
          tab={state.tab}
          thumb={state.thumb}
          onSize={(index) => dispatch({ type: 'SET_SIZE', index })}
          onQty={(delta) => dispatch({ type: 'STEP_QTY', delta })}
          onTab={(tab) => dispatch({ type: 'SET_TAB', tab })}
          onThumb={(index) => dispatch({ type: 'SET_THUMB', index })}
          onAdd={() => dispatch({ type: 'ADD_TO_CART', productId: product.id, sizeIndex: state.sizeIndex, qty: state.qty })}
        />
      )}
      {state.screen === 'coming-soon' && <ComingSoon nav={nav} label={state.soonLabel} cart={state.cart} onSignOut={onSignOut} />}

      {state.toast && (
        <div className={s.toast} role="status">
          {state.toast}
          <button type="button" onClick={() => nav.soon('Cart')}>View cart</button>
        </div>
      )}
    </OwnerShell>
  );
}
