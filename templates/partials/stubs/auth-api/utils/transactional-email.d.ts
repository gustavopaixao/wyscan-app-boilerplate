// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api transactional-email surface.

export type PasswordResetEmailInput = { to: string; code: string; displayName: string };
export type VerificationEmailInput = { to: string; code: string; displayName: string };

export type SendPasswordResetEmailFn = (
  to: string,
  code: string,
  displayName: string,
) => Promise<boolean>;

export type SendVerificationEmailFn = (
  to: string,
  code: string,
  displayName: string,
) => Promise<boolean>;

export type TransactionalEmailSenders = {
  sendPasswordResetEmail?: SendPasswordResetEmailFn;
  sendVerificationEmail?: SendVerificationEmailFn;
};

export declare function registerTransactionalEmailSenders(
  senders: TransactionalEmailSenders,
): void;
export declare function getSendVerificationEmail(): Promise<SendVerificationEmailFn>;
export declare function getSendPasswordResetEmail(): Promise<SendPasswordResetEmailFn>;
