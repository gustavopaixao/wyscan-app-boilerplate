// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
export declare function stripHtmlTags(value: unknown): string;
export declare function hasNoHtmlTags(value: string): boolean;
export declare function isValidEmail(email: string): boolean;
export declare function isValidObjectId(value: string): boolean;
export declare function validatePasswordStrength(password: string): {
  isValid: boolean;
  error?: string;
};
