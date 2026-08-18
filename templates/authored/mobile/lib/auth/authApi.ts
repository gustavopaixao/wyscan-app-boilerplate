/**
 * HTTP client for the auth endpoints.
 *
 * Unlike the web apps, mobile holds the JWTs directly — there is no BFF to hide
 * them behind, and SecureStore is the platform's answer to that. So this client
 * owns the Authorization header and the refresh-on-401 retry.
 */
import { AuthError, NETWORK_STATUS } from "./authErrors";
import { clearTokens, getApiBaseUrl, getTokens, setTokens } from "./storage";

const REQUEST_TIMEOUT_MS = 15_000;

export type AuthUser = {
	id: string;
	email: string;
	displayName: string;
	role: "user" | "moderator" | "admin";
	photoUrl: string | null;
	preferredLanguage: string | null;
};

export type SessionResult =
	| { user: AuthUser; requiresVerification?: false }
	| { requiresVerification: true; userId: string; email: string };

type RequestOptions = {
	method?: string;
	body?: unknown;
	accessToken?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(`${getApiBaseUrl()}${path}`, {
			method: options.method ?? "GET",
			headers: {
				"Content-Type": "application/json",
				...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
			},
			body: options.body === undefined ? undefined : JSON.stringify(options.body),
			signal: controller.signal,
		});
	} catch {
		throw new AuthError("network", NETWORK_STATUS);
	} finally {
		clearTimeout(timeout);
	}

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new AuthError((data as { message?: string }).message ?? "", response.status);
	}
	return data as T;
}

/** Codes arrive from mail clients with stray spaces and hyphens. */
export function normalizeCode(raw: string): string {
	return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
}

/** Persist a session response and return the user. */
async function adopt(result: SessionResult): Promise<SessionResult> {
	if (!result.requiresVerification) {
		const tokens = result as unknown as { accessToken: string; refreshToken?: string };
		await setTokens(tokens);
	}
	return result;
}

/**
 * Spend the stored refresh token for a fresh pair.
 *
 * Single-flight: the app can fire several authenticated requests at once on
 * resume, and each would otherwise present the same refresh token. Since the
 * API ROTATES on every refresh, the second would be rejected as revoked and
 * would sign a perfectly good session out.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
	const { refreshToken } = await getTokens();
	if (!refreshToken) return null;

	try {
		const result = await request<{ accessToken: string; refreshToken: string }>(
			"/api/v1/auth/refresh",
			{ method: "POST", body: { refreshToken } },
		);
		await setTokens(result);
		return result.accessToken;
	} catch (error) {
		// A rejected refresh token is terminal — drop the session rather than
		// retrying forever. A network blip is not: keep the tokens.
		if (error instanceof AuthError && error.status !== NETWORK_STATUS) {
			await clearTokens();
		}
		return null;
	}
}

export function refreshAccessToken(): Promise<string | null> {
	if (!refreshInFlight) {
		refreshInFlight = doRefresh().finally(() => {
			refreshInFlight = null;
		});
	}
	return refreshInFlight;
}

/** Authenticated request with one transparent refresh-and-retry on 401. */
export async function authedRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { accessToken } = await getTokens();
	if (!accessToken) throw new AuthError("Not signed in", 401);

	try {
		return await request<T>(path, { ...options, accessToken });
	} catch (error) {
		if (!(error instanceof AuthError) || error.status !== 401) throw error;

		const refreshed = await refreshAccessToken();
		if (!refreshed) throw error;
		return request<T>(path, { ...options, accessToken: refreshed });
	}
}

export const authApi = {
	signIn: (email: string, password: string) =>
		request<SessionResult>("/api/v1/auth/login", {
			method: "POST",
			body: { email, password },
		}).then(adopt),

	register: (email: string, password: string, displayName: string) =>
		request<{ requiresVerification: true; userId: string; email: string }>(
			"/api/v1/auth/register",
			{ method: "POST", body: { email, password, displayName } },
		),

	verifyEmail: (email: string, code: string) =>
		request<SessionResult>("/api/v1/auth/verify-email", {
			method: "POST",
			body: { email, code: normalizeCode(code) },
		}).then(adopt),

	resendCode: (userId: string) =>
		request<{ message: string }>("/api/v1/auth/resend-code", {
			method: "POST",
			body: { userId },
		}),

	forgotPassword: (email: string) =>
		request<{ message: string }>("/api/v1/auth/forgot-password", {
			method: "POST",
			body: { email },
		}),

	resetPassword: (email: string, code: string, password: string) =>
		request<{ message: string }>("/api/v1/auth/reset-password", {
			method: "POST",
			body: { email, code: normalizeCode(code), password },
		}),

	signInWithGoogle: (idToken: string) =>
		request<SessionResult>("/api/v1/auth/google", {
			method: "POST",
			body: { idToken },
		}).then(adopt),

	signInWithApple: (idToken: string, displayName?: string) =>
		request<SessionResult>("/api/v1/auth/apple", {
			method: "POST",
			body: { idToken, displayName },
		}).then(adopt),

	/** Current user, or null when the session is gone. */
	me: async (): Promise<AuthUser | null> => {
		try {
			// The two auth-api implementations disagree on the envelope: the shared
			// package returns the user at the top level, the standalone stub nests
			// it under `user`. Assuming one shape signs the user out against the
			// other, so accept both.
			const result = await authedRequest<{ user?: AuthUser } & Partial<AuthUser>>(
				"/api/v1/me",
			);
			if (result.user) return result.user;
			return result.id ? (result as AuthUser) : null;
		} catch {
			return null;
		}
	},

	signOut: async (): Promise<void> => {
		const { refreshToken } = await getTokens();
		try {
			// Best effort: revoke server-side so the refresh token cannot be reused.
			await authedRequest("/api/v1/auth/logout", {
				method: "POST",
				body: { refreshToken },
			});
		} catch {
			// Sign out locally regardless — the user asked to leave.
		}
		await clearTokens();
	},
};
