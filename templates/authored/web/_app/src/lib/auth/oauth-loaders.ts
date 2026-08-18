/**
 * Loads the Google and Apple browser SDKs on demand.
 *
 * Both are injected on first use rather than in the document head: they are
 * third-party scripts on the critical path, and most visits never touch OAuth.
 * Each loader is memoised so several buttons share one script tag.
 */
import {
  appleClientId,
  appleRedirectUri,
  googleClientId,
} from "./oauth-config";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: "popup" | "redirect";
          }): void;
          prompt(): void;
          renderButton(
            parent: HTMLElement,
            options: Record<string, unknown>,
          ): void;
        };
      };
    };
    AppleID?: {
      auth: {
        init(config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }): void;
        signIn(): Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const loaded = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

  loaded.set(src, promise);
  return promise;
}

/**
 * Google Identity Services hands back a credential (an ID token) through a
 * callback rather than a promise, so it is bridged into one here.
 */
export async function requestGoogleIdToken(): Promise<string> {
  await loadScript("https://accounts.google.com/gsi/client");
  const google = window.google;
  if (!google) throw new Error("Google Identity Services unavailable");

  return new Promise<string>((resolve, reject) => {
    google.accounts.id.initialize({
      client_id: googleClientId,
      ux_mode: "popup",
      callback: (response) => {
        if (response.credential) resolve(response.credential);
        else reject(new Error("No credential returned"));
      },
    });
    google.accounts.id.prompt();
  });
}

export async function requestAppleIdToken(): Promise<{
  idToken: string;
  displayName?: string;
}> {
  await loadScript(
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
  );
  const AppleID = window.AppleID;
  if (!AppleID) throw new Error("Apple Sign In unavailable");

  AppleID.auth.init({
    clientId: appleClientId,
    scope: "name email",
    redirectURI: appleRedirectUri,
    usePopup: true,
  });

  const result = await AppleID.auth.signIn();
  // Apple returns the name ONLY on the first authorization, so forward it now
  // or it is lost for good.
  const name = result.user?.name;
  const displayName =
    [name?.firstName, name?.lastName].filter(Boolean).join(" ") || undefined;

  return { idToken: result.authorization.id_token, displayName };
}
