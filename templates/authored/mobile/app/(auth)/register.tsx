import { Redirect } from "expo-router";

/**
 * Register is the same screen as sign-in, in its other mode. Kept as a route so
 * deep links and `router.push("/(auth)/register")` still resolve.
 */
export default function RegisterScreen() {
	return <Redirect href="/(auth)/login?mode=register" />;
}
