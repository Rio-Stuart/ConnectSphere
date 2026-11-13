-- ConnectSphere Database Schema
-- DBMS Class Project — Social Media Platform (MySQL 8.0)
-- ============================================================

CREATE DATABASE IF NOT EXISTS connectsphere CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE connectsphere;

-- Drop tables in reverse foreign-key dependency order
DROP TABLE IF EXISTS Followers;
DROP TABLE IF EXISTS Likes;
DROP TABLE IF EXISTS Comments;
DROP TABLE IF EXISTS Posts;
DROP TABLE IF EXISTS Users;

-- ============================================================
-- TABLE: Users
-- ============================================================
CREATE TABLE Users (
    user_id    INT            PRIMARY KEY AUTO_INCREMENT,
    username   VARCHAR(50)    UNIQUE NOT NULL,
    email      VARCHAR(100)   UNIQUE NOT NULL,
    bio        TEXT,
    avatar     VARCHAR(255)   DEFAULT '👤',
    is_admin   BOOLEAN        DEFAULT FALSE,
    created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: Posts
-- ============================================================
CREATE TABLE Posts (
    post_id    INT            PRIMARY KEY AUTO_INCREMENT,
    user_id    INT            NOT NULL,
    content    TEXT           NOT NULL,
    media_url  TEXT           DEFAULT NULL,
    file_name  VARCHAR(255)   DEFAULT NULL,
    file_type  VARCHAR(100)   DEFAULT NULL,
    created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_posts_user (user_id),
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: Comments
-- ============================================================
CREATE TABLE Comments (
    comment_id   INT          PRIMARY KEY AUTO_INCREMENT,
    post_id      INT          NOT NULL,
    user_id      INT          NOT NULL,
    comment_text TEXT         NOT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comments_post (post_id),
    INDEX idx_comments_user (user_id),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: Likes
-- ============================================================
CREATE TABLE Likes (
    like_id  INT              PRIMARY KEY AUTO_INCREMENT,
    post_id  INT              NOT NULL,
    user_id  INT              NOT NULL,
    liked_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_likes_post_user (post_id, user_id),
    INDEX idx_likes_post (post_id),
    INDEX idx_likes_user (user_id),
    CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: Followers
-- ============================================================
CREATE TABLE Followers (
    id           INT          PRIMARY KEY AUTO_INCREMENT,
    follower_id  INT          NOT NULL,
    following_id INT          NOT NULL,
    followed_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_follower_pair (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id),
    INDEX idx_followers_follower (follower_id),
    INDEX idx_followers_following (following_id),
    CONSTRAINT fk_followers_follower  FOREIGN KEY (follower_id)  REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_followers_following FOREIGN KEY (following_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users (including admin and regular demo users)
INSERT INTO Users (user_id, username, email, bio, avatar, is_admin) VALUES
(1, 'aarav_tech',     'aarav@example.com',         'Full-stack developer & open-source enthusiast. Building the future one commit at a time.',         '👨‍💻', FALSE),
(2, 'priya_travels',  'priya@example.com',         'Travel blogger exploring the world one city at a time. Currently in Bali!',                       '🌍', FALSE),
(3, 'rohan_fitness',  'rohan@example.com',         'Fitness coach & nutrition expert. Helping you become the best version of yourself.',              '💪', FALSE),
(4, 'neha_art',       'neha@example.com',          'Digital artist & illustrator. Turning imagination into pixels.',                                  '🎨', FALSE),
(5, 'admin',          'admin@connectsphere.dbms',  'ConnectSphere Database Administrator & Chief Architect 🛡️',                                      '🛡️', TRUE);

-- Posts
INSERT INTO Posts (post_id, user_id, content, media_url, file_name, file_type) VALUES
(1, 1, 'Just deployed my new full-stack project using React and Node.js! The feeling of seeing your code live is unmatched. 🚀 #coding #webdev #javascript', NULL, NULL, NULL),
(2, 2, 'Sunset at Tanah Lot temple in Bali was absolutely breathtaking! 🌅 Sometimes the best moments are the ones you don\'t plan for. #travel #bali #sunset', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80', 'bali_temple.jpg', 'image/jpeg'),
(3, 3, 'Morning workout done! 💪 Remember: consistency beats intensity. Show up every day, even when you don\'t feel like it. #fitness #motivation #gym', NULL, NULL, NULL),
(4, 4, 'Just finished this digital portrait commission! So happy with how the colors turned out. 🎨 Art is not what you see, but what you make others see. #art #digital #illustration', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80', 'artwork_palette.jpg', 'image/jpeg');

-- Comments
INSERT INTO Comments (comment_id, post_id, user_id, comment_text) VALUES
(1, 1, 2, 'This is amazing! What tech stack did you use? 🤩'),
(2, 1, 3, 'Great work! Would love to collaborate sometime.'),
(3, 2, 4, 'Bali is on my bucket list! The colors in this must be incredible 🎨');

-- Likes
INSERT INTO Likes (post_id, user_id) VALUES
(1, 2),
(1, 3),
(1, 4),
(2, 1),
(2, 4),
(3, 1);

-- Followers (follower_id follows following_id)
INSERT INTO Followers (follower_id, following_id) VALUES
(1, 2),
(1, 3),
(2, 1),
(3, 4);
