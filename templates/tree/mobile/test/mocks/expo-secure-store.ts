/** In-memory SecureStore stub for vitest (node env). */
export const AFTER_FIRST_UNLOCK = "AFTER_FIRST_UNLOCK";
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = "WHEN_PASSCODE_SET_THIS_DEVICE_ONLY";

const store = new Map<string, string>();
export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? (store.get(key) as string) : null;
}
export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}
export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}
