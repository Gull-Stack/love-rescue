-- Add biometric counter field for WebAuthn replay attack prevention
ALTER TABLE "users" ADD COLUMN "biometric_counter" INTEGER NOT NULL DEFAULT 0;
