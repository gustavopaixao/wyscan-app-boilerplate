/**
 * Typed bridge to `config/googleOAuthConfig.js`.
 *
 * That file is CommonJS on purpose: `app.config.ts` needs it at build time
 * under plain Node, and the bundle needs it at runtime. Re-exporting here keeps
 * the scheme-derivation logic in ONE place — duplicating it would let the
 * redirect URI registered in the native manifests drift from the one the app
 * actually requests, which fails only at runtime with an opaque OAuth error.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";
// biome-ignore lint/style/useNodejsImportProtocol: relative CommonJS interop, not a Node builtin.
const googleOAuthConfig = require("../../config/googleOAuthConfig.js") as {
	googleReversedClientScheme(clientId?: string): string | undefined;
	googleNativeRedirectUri(clientId?: string): string | undefined;
	googleUrlSchemesFromClientIds(ios?: string, android?: string): string[];
};

export const { googleReversedClientScheme, googleNativeRedirectUri, googleUrlSchemesFromClientIds } =
	googleOAuthConfig;

type Extra = {
	googleWebClientId?: string;
	googleIosClientId?: string;
	googleAndroidClientId?: string;
};

function extra(): Extra {
	return (Constants.expoConfig?.extra as Extra | undefined) ?? {};
}

export const googleWebClientId = extra().googleWebClientId ?? "";
export const googleIosClientId = extra().googleIosClientId ?? "";
export const googleAndroidClientId = extra().googleAndroidClientId ?? "";

/** The client id whose reversed scheme the OS will route back to us. */
export function googlePlatformClientId(): string {
	return Platform.OS === "ios" ? googleIosClientId : googleAndroidClientId;
}

/**
 * Google is offered only when the platform's own client id is configured: the
 * web client id alone cannot produce a native redirect URI.
 */
export const isGoogleEnabled = googlePlatformClientId().length > 0;
