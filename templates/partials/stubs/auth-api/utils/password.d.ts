// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api password surface.

export declare function hashPassword(password: string): Promise<string>;
export declare function comparePassword(password: string, hash: string): Promise<boolean>;
export declare function validatePasswordStrength(password: string): {
  isValid: boolean;
  error?: string;
};
export declare function requireStrongPassword(password: string): void;
