-- 20261113100001_seed_initial_data.sql
-- Initial Seed Data for ConnectSphere on Netlify Database
-- ============================================================

-- Users
INSERT INTO "users" ("user_id", "username", "email", "bio", "avatar", "is_admin") VALUES
(1, 'aarav_tech',    'aarav@example.com',        'Full-stack developer & open-source enthusiast. Building the future one commit at a time.',        '👨‍💻', FALSE),
(2, 'priya_travels', 'priya@example.com',        'Travel blogger exploring the world one city at a time. Currently in Bali!',                      '🌍', FALSE),
(3, 'rohan_fitness', 'rohan@example.com',        'Fitness coach & nutrition expert. Helping you become the best version of yourself.',             '💪', FALSE),
(4, 'neha_art',      'neha@example.com',         'Digital artist & illustrator. Turning imagination into pixels.',                                 '🎨', FALSE),
(5, 'admin',         'admin@connectsphere.dbms', 'ConnectSphere Database Administrator & Chief Architect 🛡️',                                     '🛡️', TRUE)
ON CONFLICT ("username") DO NOTHING;

-- Reset sequence for users
SELECT setval(pg_get_serial_sequence('"users"', 'user_id'), COALESCE(MAX("user_id"), 1)) FROM "users";

-- Posts
INSERT INTO "posts" ("post_id", "user_id", "content", "media_url", "file_name", "file_type") VALUES
(1, 1, 'Just deployed my new full-stack project using React and Node.js! The feeling of seeing your code live is unmatched. 🚀 #coding #webdev #javascript', NULL, NULL, NULL),
(2, 2, 'Sunset at Tanah Lot temple in Bali was absolutely breathtaking! 🌅 Sometimes the best moments are the ones you don''t plan for. #travel #bali #sunset', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80', 'bali_temple.jpg', 'image/jpeg'),
(3, 3, 'Morning workout done! 💪 Remember: consistency beats intensity. Show up every day, even when you don''t feel like it. #fitness #motivation #gym', NULL, NULL, NULL),
(4, 4, 'Just finished this digital portrait commission! So happy with how the colors turned out. 🎨 Art is not what you see, but what you make others see. #art #digital #illustration', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80', 'artwork_palette.jpg', 'image/jpeg')
ON CONFLICT ("post_id") DO NOTHING;

-- Reset sequence for posts
SELECT setval(pg_get_serial_sequence('"posts"', 'post_id'), COALESCE(MAX("post_id"), 1)) FROM "posts";

-- Comments
INSERT INTO "comments" ("comment_id", "post_id", "user_id", "comment_text") VALUES
(1, 1, 2, 'This is amazing! What tech stack did you use? 🤩'),
(2, 1, 3, 'Great work! Would love to collaborate sometime.'),
(3, 2, 4, 'Bali is on my bucket list! The colors in this must be incredible 🎨')
ON CONFLICT ("comment_id") DO NOTHING;

-- Reset sequence for comments
SELECT setval(pg_get_serial_sequence('"comments"', 'comment_id'), COALESCE(MAX("comment_id"), 1)) FROM "comments";

-- Likes
INSERT INTO "likes" ("post_id", "user_id") VALUES
(1, 2),
(1, 3),
(1, 4),
(2, 1),
(2, 4),
(3, 1)
ON CONFLICT ("post_id", "user_id") DO NOTHING;

-- Followers
INSERT INTO "followers" ("follower_id", "following_id") VALUES
(1, 2),
(1, 3),
(2, 1),
(3, 4)
ON CONFLICT ("follower_id", "following_id") DO NOTHING;
