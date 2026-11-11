import { useCallback, useReducer } from 'react';

interface RequestState {
  pending: boolean;
  error: string | null;
}

type RequestAction =
  | { type: 'START' }
  | { type: 'FAIL'; message: string }
  | { type: 'CLEAR' };

function requestReducer(_state: RequestState, action: RequestAction): RequestState {
  switch (action.type) {
    case 'START':
      return { pending: true, error: null };
    case 'FAIL':
      return { pending: false, error: action.message };
    case 'CLEAR':
      return { pending: false, error: null };
    default:
      return _state;
  }
}

export function useRequestState() {
  const [state, dispatch] = useReducer(requestReducer, { pending: false, error: null });
  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const fail = useCallback((error: unknown) => {
    dispatch({
      type: 'FAIL',
      message: error instanceof Error ? error.message : 'The request could not be completed.',
    });
  }, []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  return { ...state, start, fail, clear };
}
