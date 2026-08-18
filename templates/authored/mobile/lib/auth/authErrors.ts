import type { MessageKey } from "@/lib/i18n";

/**
 * Error type for every auth call, so screens can branch on `status` rather than
 * matching on message text.
 */
export class AuthError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "AuthError";
		this.status = status;
	}
}

/** No HTTP response at all — airplane mode, DNS failure, timeout. */
export const NETWORK_STATUS = 0;

export function isNetworkError(error: unknown): boolean {
	return error instanceof AuthError && error.status === NETWORK_STATUS;
}

/**
 * Translate an error into a message key from `locales/*.json`.
 *
 * The API's own message is preferred where it is specific (which password rule
 * failed, for instance) — a generic key would be less useful than the text the
 * server already wrote.
 *
 * `t` is typed against `MessageKey` rather than `string`: the app's translator
 * only accepts known keys, and a `(key: string) => string` parameter would not
 * accept it (parameters are contravariant).
 */
export function authErrorMessage(
	error: unknown,
	t: (key: MessageKey) => string,
): string {
	if (error instanceof AuthError) {
		if (error.status === NETWORK_STATUS) return t("auth_error_network");
		if (error.status === 401) return t("auth_error_invalid_credentials");
		if (error.message) return error.message;
	}
	return t("auth_error_generic");
}
