/**
 * Centralised auth configuration.
 *
 * Every JWT / session setting lives here so it can be tuned in one place.
 * Values are read from environment variables with sensible development defaults.
 */

export const authConfig = {
  /** Secret used to sign access tokens. MUST be overridden in production. */
  jwtSecret: process.env.JWT_SECRET ?? 'local-dev-jwt-secret-change-in-production',

  /** Secret used to sign refresh tokens (separate from access). */
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? 'local-dev-refresh-secret-change-in-production',

  /** How long an access token is valid, e.g. "1h", "30m". */
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY ?? '1h',

  /** How long a refresh token is valid, e.g. "7d", "30d". */
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY ?? '7d',

  /** bcrypt salt rounds for password hashing. */
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),

  /** Cookie name for the access token. */
  accessCookieName: 'cb_access_token',

  /** Cookie name for the refresh token. */
  refreshCookieName: 'cb_refresh_token',

  /** Initial super-admin password used by the seed script. */
  superAdminInitialPassword: process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@123',
};
