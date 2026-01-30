/**
 * Jest test setup file.
 * Sets environment variables required by the application before any tests run.
 */

process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_PRICE_ID = 'price_test_standard';
process.env.STRIPE_PREMIUM_PRICE_ID = 'price_test_premium';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.THERAPIST_API_KEY = 'test-therapist-api-key';
process.env.WEBAUTHN_RP_NAME = 'Test App';
process.env.WEBAUTHN_RP_ID = 'localhost';
process.env.WEBAUTHN_ORIGIN = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/calendar/callback';
