export function useLoadOrderLabEnabled() {
  return import.meta.env.VITE_ENABLE_LOAD_ORDER_LAB === 'true';
}
