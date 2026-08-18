/**
 * Auth state for the whole app.
 *
 * Mounted at the very top of `app/_layout.tsx`, above navigation, so the route
 * groups can gate on it. Plain React context — the state is one user object and
 * a ready flag, which needs no store library.
 */
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { type AuthUser, authApi, type SessionResult } from "./authApi";
import { getTokens } from "./storage";

type AuthContextValue = {
	user: AuthUser | null;
	/** False until the stored session has been checked once. */
	ready: boolean;
	signIn: (email: string, password: string) => Promise<SessionResult>;
	register: (
		email: string,
		password: string,
		displayName: string,
	) => Promise<{ userId: string; email: string }>;
	verifyEmail: (email: string, code: string) => Promise<SessionResult>;
	resendCode: (userId: string) => Promise<void>;
	forgotPassword: (email: string) => Promise<void>;
	resetPassword: (email: string, code: string, password: string) => Promise<void>;
	signInWithGoogle: (idToken: string) => Promise<SessionResult>;
	signInWithApple: (idToken: string, displayName?: string) => Promise<SessionResult>;
	signOut: () => Promise<void>;
	refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [ready, setReady] = useState(false);

	// Guards against overlapping verifies: mount and a foreground transition can
	// land in the same tick, and each would spend the refresh token separately.
	const verifyInFlight = useRef<Promise<void> | null>(null);

	const verifySession = useCallback(async () => {
		if (verifyInFlight.current) return verifyInFlight.current;

		const run = (async () => {
			const { accessToken, refreshToken } = await getTokens();
			// Nothing stored: skip the round trip entirely. This is the cold-start
			// path for every new install.
			if (!accessToken && !refreshToken) {
				setUser(null);
				setReady(true);
				return;
			}

			setUser(await authApi.me());
			setReady(true);
		})();

		verifyInFlight.current = run;
		try {
			await run;
		} finally {
			verifyInFlight.current = null;
		}
	}, []);

	useEffect(() => {
		void verifySession();

		// Re-check on foreground: the session may have expired while backgrounded,
		// or been revoked from another device.
		const onChange = (state: AppStateStatus) => {
			if (state === "active") void verifySession();
		};
		const subscription = AppState.addEventListener("change", onChange);
		return () => subscription.remove();
	}, [verifySession]);

	const adopt = useCallback((result: SessionResult) => {
		if (!result.requiresVerification) setUser(result.user);
		return result;
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			ready,
			signIn: (email, password) => authApi.signIn(email, password).then(adopt),
			register: (email, password, displayName) =>
				authApi.register(email, password, displayName),
			verifyEmail: (email, code) => authApi.verifyEmail(email, code).then(adopt),
			resendCode: async (userId) => {
				await authApi.resendCode(userId);
			},
			forgotPassword: async (email) => {
				await authApi.forgotPassword(email);
			},
			resetPassword: async (email, code, password) => {
				await authApi.resetPassword(email, code, password);
			},
			signInWithGoogle: (idToken) => authApi.signInWithGoogle(idToken).then(adopt),
			signInWithApple: (idToken, displayName) =>
				authApi.signInWithApple(idToken, displayName).then(adopt),
			signOut: async () => {
				await authApi.signOut();
				setUser(null);
			},
			refreshUser: async () => {
				setUser(await authApi.me());
			},
		}),
		[user, ready, adopt],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used inside <AuthProvider> (mounted in app/_layout.tsx)");
	}
	return context;
}
