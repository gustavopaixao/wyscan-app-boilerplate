/**
 * Token storage, backed by the device keychain / keystore.
 *
 * Deliberately does NOT go through `__NPM_SCOPE__/core-react-native`: that
 * package is dropped entirely in `standalone` and `registry` shared-package
 * modes, and auth has to work in all three. `expo-secure-store` is a direct
 * dependency of this app, so this file behaves identically everywhere.
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "__PROJECT_SLUG__.accessToken";
const REFRESH_KEY = "__PROJECT_SLUG__.refreshToken";

/**
 * `AFTER_FIRST_UNLOCK` rather than the stricter `WHEN_UNLOCKED`: background
 * refresh and push handling run while the device is locked, and they need the
 * token. The item is still unreadable until the first unlock after a reboot.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
	keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export type StoredTokens = {
	accessToken: string | null;
	refreshToken: string | null;
};

export async function getTokens(): Promise<StoredTokens> {
	const [accessToken, refreshToken] = await Promise.all([
		SecureStore.getItemAsync(ACCESS_KEY, OPTIONS),
		SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
	]);
	return { accessToken, refreshToken };
}

export async function setTokens(tokens: {
	accessToken: string;
	refreshToken?: string;
}): Promise<void> {
	await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken, OPTIONS);
	if (tokens.refreshToken) {
		await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken, OPTIONS);
	}
}

export async function clearTokens(): Promise<void> {
	await Promise.all([
		SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS),
		SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS),
	]);
}

/**
 * API base URL from `app.config.ts` (`extra.apiUrl`), which reads
 * EXPO_PUBLIC_API_URL. Trailing slash stripped so callers can concatenate paths
 * without producing a double slash.
 */
export function getApiBaseUrl(): string {
	const configured = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
	return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}
