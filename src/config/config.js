require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3003,

  // Database configurations
  database: {
    // Direct database connection (for migrations, etc.)
    direct: {
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      database: process.env.PGDATABASE,
      username: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    },
    // PgBouncer connection (for application queries)
    pgbouncer: {
      host: process.env.PGBOUNCER_HOST,
      port: process.env.PGBOUNCER_PORT,
      database: process.env.PGDATABASE,
      username: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    },
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  },

  // Prometheus metrics configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED,
    port: process.env.METRICS_PORT,
    path: process.env.METRICS_PATH,
  },

  jwtSecret: process.env.JWT_SECRET,
  emailService: {
    provider: process.env.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  smsService: {
    apiKey: process.env.SMS_API_KEY,
    apiSecret: process.env.SMS_API_SECRET,
  },

  /** Paystack (organization registration). Public key is for client; secret is server-only. */
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    /**
     * Paystack redirect after payment for **new** organization signup (e.g. …/register).
     */
    registerCallbackUrl: process.env.PAYSTACK_REGISTER_CALLBACK_URL,
    /**
     * Optional: return URL after **subscription renewal** (existing hospital). If unset, the API
     * derives the app root from `registerCallbackUrl` (strips a trailing /register path).
     */
    subscriptionCallbackUrl: process.env.PAYSTACK_SUBSCRIPTION_CALLBACK_URL,
  },

  /** When true, POST /register-organization skips Paystack (local/dev only). */
  skipOrganizationRegistrationPayment: process.env.SKIP_ORGANIZATION_REGISTRATION_PAYMENT === "true",

  /** Trial length for new organizations (minutes). Default 10 for testing; set e.g. 10080 for 7 days. */
  organizationTrialMinutes: Math.max(1, parseInt(process.env.ORGANIZATION_TRIAL_MINUTES || "10", 10)),

  /**
   * Paid subscription length after Paystack (minutes). Default 10 for testing (matches trial).
   * Production: e.g. 43200 (= 30 days) or use renewal flows with days elsewhere.
   */
  organizationSubscriptionMinutes: Math.max(
    1,
    parseInt(process.env.ORGANIZATION_SUBSCRIPTION_MINUTES || process.env.ORGANIZATION_TRIAL_MINUTES || "10", 10)
  ),

  /** When true, subscription/trial checks are skipped on login, /me, and API auth (local/dev only). */
  disableSubscriptionEnforcement: process.env.DISABLE_SUBSCRIPTION_ENFORCEMENT === "true",
};
