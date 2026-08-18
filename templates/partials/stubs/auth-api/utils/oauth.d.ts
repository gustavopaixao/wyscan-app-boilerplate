// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api OAuth surface.

export interface OAuthUserInfo {
  providerId: string;
  email: string;
  displayName: string;
}

export declare function verifyGoogleToken(idToken: string): Promise<OAuthUserInfo>;
export declare function verifyAppleToken(idToken: string): Promise<OAuthUserInfo>;
export declare function verifyFacebookToken(accessToken: string): Promise<OAuthUserInfo>;
