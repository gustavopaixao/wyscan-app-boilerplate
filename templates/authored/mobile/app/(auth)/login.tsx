import { useLocalSearchParams } from "expo-router";
import { LoginView } from "@/components/auth/LoginView";

/** `?mode=register` opens the same screen on its register side. */
export default function LoginScreen() {
	const { mode } = useLocalSearchParams<{ mode?: string }>();
	return <LoginView initialMode={mode === "register" ? "register" : "login"} />;
}
