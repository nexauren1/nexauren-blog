PRAGMA foreign_keys = ON;

-- Nexauren Story public accounts use Firebase Authentication.
-- Firebase owns registration, login, Google sign-in, email verification,
-- password recovery, password changes and browser sessions.
-- This migration intentionally creates NO public-account password/session tables.
-- The editorial/admin authentication remains in D1 and is completely separate.
--
-- Future server-side profile/preferences tables may reference the Firebase UID.
-- Do not store Firebase service-account credentials or user passwords in D1.
