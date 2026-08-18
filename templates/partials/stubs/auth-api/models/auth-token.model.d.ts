// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api model surface.

import type { Document, Model, Types } from "mongoose";

export declare const TokenType: {
  readonly REFRESH: "refresh";
  readonly VERIFICATION: "verification";
  readonly PASSWORD_RESET: "passwordReset";
  readonly ACCOUNT_DELETION: "accountDeletion";
};
export type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType];

export interface IAuthToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: TokenTypeValue;
  /** bcrypt hash of the value handed to the client — never the value itself. */
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export declare const AuthToken: Model<IAuthToken>;
