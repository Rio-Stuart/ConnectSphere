-- 20261113100000_create_connectsphere_schema.sql
-- Netlify Database (PostgreSQL) Initial Schema for ConnectSphere
-- ============================================================

-- Drop tables in reverse foreign-key dependency order if re-applying
DROP TABLE IF EXISTS "followers" CASCADE;
DROP TABLE IF EXISTS "likes" CASCADE;
DROP TABLE IF EXISTS "comments" CASCADE;
DROP TABLE IF EXISTS "posts" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE "users" (
    "user_id"    SERIAL PRIMARY KEY,
    "username"   VARCHAR(50) UNIQUE NOT NULL,
    "email"      VARCHAR(100) UNIQUE NOT NULL,
    "bio"        TEXT,
    "avatar"     VARCHAR(255) DEFAULT '👤',
    "is_admin"   BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: posts
-- ============================================================
CREATE TABLE "posts" (
    "post_id"    SERIAL PRIMARY KEY,
    "user_id"    INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
    "content"    TEXT NOT NULL,
    "media_url"  TEXT DEFAULT NULL,
    "file_name"  VARCHAR(255) DEFAULT NULL,
    "file_type"  VARCHAR(100) DEFAULT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_posts_user" ON "posts"("user_id");

-- ============================================================
-- TABLE: comments
-- ============================================================
CREATE TABLE "comments" (
    "comment_id"   SERIAL PRIMARY KEY,
    "post_id"      INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
    "user_id"      INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
    "comment_text" TEXT NOT NULL,
    "created_at"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_comments_post" ON "comments"("post_id");
CREATE INDEX "idx_comments_user" ON "comments"("user_id");

-- ============================================================
-- TABLE: likes
-- ============================================================
CREATE TABLE "likes" (
    "like_id"  SERIAL PRIMARY KEY,
    "post_id"  INTEGER NOT NULL REFERENCES "posts"("post_id") ON DELETE CASCADE,
    "user_id"  INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
    "liked_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_likes_post_user" UNIQUE ("post_id", "user_id")
);

CREATE INDEX "idx_likes_post" ON "likes"("post_id");
CREATE INDEX "idx_likes_user" ON "likes"("user_id");

-- ============================================================
-- TABLE: followers
-- ============================================================
CREATE TABLE "followers" (
    "id"           SERIAL PRIMARY KEY,
    "follower_id"  INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
    "following_id" INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
    "followed_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_follower_pair" UNIQUE ("follower_id", "following_id"),
    CONSTRAINT "chk_no_self_follow" CHECK ("follower_id" <> "following_id")
);

CREATE INDEX "idx_followers_follower" ON "followers"("follower_id");
CREATE INDEX "idx_followers_following" ON "followers"("following_id");
