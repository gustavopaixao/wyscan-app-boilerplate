// Local auth implementation (standalone mode). Barrel matching the shared
// __NPM_SCOPE__/auth-api `./models` export.

export type { IAuthToken, TokenTypeValue } from "./auth-token.model.js";
export { AuthToken, TokenType } from "./auth-token.model.js";
export type {
  IAvatar,
  IPublicUser,
  IUser,
  PreferredLanguageType,
  UserPresenceType,
  UserRoleType,
  UserStatusType,
} from "./user.model.js";
export {
  PreferredLanguage,
  User,
  UserPresence,
  UserRole,
  UserStatus,
} from "./user.model.js";
