import { useCallback, useReducer, type Reducer } from 'react';

type BooleanKeys<T> = { [K in keyof T]: T[K] extends boolean ? K : never }[keyof T];

export type FormAction<T> =
  | { [K in keyof T]: { type: 'SET_FIELD'; field: K; value: T[K] } }[keyof T]
  | { type: 'TOGGLE_FIELD'; field: BooleanKeys<T> };

export function formReducer<T extends object>(state: T, action: FormAction<T>): T {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'TOGGLE_FIELD':
      return { ...state, [action.field]: !state[action.field] };
    default:
      return state;
  }
}

/** Form state backed by useReducer. */
export function useForm<T extends object>(initial: T) {
  const [values, dispatch] = useReducer(formReducer as Reducer<T, FormAction<T>>, initial);

  const setField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) =>
      dispatch({ type: 'SET_FIELD', field, value } as FormAction<T>),
    [],
  );

  const toggleField = useCallback(
    (field: BooleanKeys<T>) => dispatch({ type: 'TOGGLE_FIELD', field }),
    [],
  );

  return { values, setField, toggleField };
}
