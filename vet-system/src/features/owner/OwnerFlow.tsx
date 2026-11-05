import { useCallback, useEffect, useReducer } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { createInitialOwnerState, ownerReducer } from './ownerReducer';
import { OwnerHome } from './screens/OwnerHome';
import { OWNER_SCREEN_LABEL, type OwnerScreen } from './types';
import placeholder from './screens/NotBuilt.module.css';

interface OwnerFlowProps {
  initialScreen?: OwnerScreen;
  /** Return to the Authentication flow. */
  onSignOut: () => void;
}

export function OwnerFlow({ initialScreen = 'owner-home', onSignOut }: OwnerFlowProps) {
  const [state, dispatch] = useReducer(ownerReducer, initialScreen, createInitialOwnerState);
  const go = useCallback((to: OwnerScreen) => dispatch({ type: 'NAVIGATE', to }), []);

  // Every screen starts at the top, like a real page navigation.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen]);

  return (
    <OwnerLayout screen={state.screen} go={go}>
      {(() => {
        switch (state.screen) {
          case 'owner-home':
            return <OwnerHome go={go} />;
          default:
            // Screens that exist in Figma but have not been built yet. The nav keeps working so the
            // flow can be clicked through while the remaining frames are added one by one.
            return (
              <div className={placeholder.box}>
                <h1>{OWNER_SCREEN_LABEL[state.screen]}</h1>
                <p>This screen comes in the next pass.</p>
                <button type="button" onClick={() => go('owner-home')}>
                  Back to Owner Home
                </button>
                <button type="button" onClick={onSignOut}>
                  Back to authentication
                </button>
              </div>
            );
        }
      })()}
    </OwnerLayout>
  );
}
