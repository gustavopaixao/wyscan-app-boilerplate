/**
 * Home, now behind the auth gate.
 *
 * `app/index.tsx` used to render this directly; it is the auth branch point
 * since auth landed, and this is where signed-in users arrive.
 */
import { WelcomeScreen } from "@/components/home/WelcomeScreen";

export default function Home() {
	return <WelcomeScreen />;
}
