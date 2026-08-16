// STUB — replace with __NPM_SCOPE__/notify-api when you adopt the shared packages.
export declare function initializeFirebase(admin: unknown): void;
export declare function isFirebaseInitialized(): boolean;
export declare function sendPush(
  token: string,
  payload: unknown,
): Promise<{ success: boolean; reason?: string }>;
