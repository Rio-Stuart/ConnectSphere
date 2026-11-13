# REST API Reference & SQL Query Mapping

ConnectSphere exposes a comprehensive RESTful JSON API. Every operational endpoint executes parameterized SQL queries against the underlying relational database and returns a standardized JSON envelope containing both the requested data and the telemetry for the SQL statement executed.

---

## Standard Response Format

All successful responses follow this unified envelope:

```json
{
  "data": { ... } | [ ... ],
  "query": "SELECT ... FROM ... WHERE ... = ?",
  "params": [ 1, "example" ],
  "message": "Optional human-readable status message"
}
```

Errors return standard HTTP status codes along with a JSON error payload:
```json
{
  "error": "Descriptive error message",
  "sqlError": "Database driver error string (if applicable)"
}
```

---

## 1. Authentication & User Management

### 1.1 List All Users
- **Endpoint**: `GET /api/users`
- **Description**: Returns all registered users with their account metadata and admin privilege status.
- **Underlying SQL Query**:
  ```sql
  SELECT user_id, username, email, bio, avatar, created_at,
         (LOWER(username) = 'admin' OR is_admin IS TRUE) AS is_admin
  FROM Users
  ORDER BY created_at DESC;
  ```
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "user_id": 1,
        "username": "aarav_tech",
        "email": "aarav@example.com",
        "bio": "Full-stack developer & open-source enthusiast.",
        "avatar": "👨‍💻",
        "created_at": "2026-11-13 10:00:00",
        "is_admin": false
      }
    ],
    "query": "SELECT user_id, username, email...",
    "params": []
  }
  ```

---

### 1.2 Get User Profile by ID
- **Endpoint**: `GET /api/users/:id`
- **Query Parameters**: `viewer_id` *(optional, integer)* — The user viewing the profile, used to compute `is_following`.
- **Description**: Fetches detailed profile statistics using correlated scalar subqueries for follower count, following count, post count, and relationship status.
- **Underlying SQL Query**:
  ```sql
  SELECT u.user_id, u.username, u.email, u.bio, u.avatar, u.created_at,
         (LOWER(u.username) = 'admin' OR u.is_admin IS TRUE) AS is_admin,
         (SELECT COUNT(*) FROM Followers WHERE following_id = u.user_id) AS follower_count,
         (SELECT COUNT(*) FROM Followers WHERE follower_id  = u.user_id) AS following_count,
         (SELECT COUNT(*) FROM Posts     WHERE user_id      = u.user_id) AS post_count,
         (SELECT COUNT(*) FROM Followers WHERE follower_id = ? AND following_id = u.user_id) > 0 AS is_following
  FROM Users u
  WHERE u.user_id = ?;
  ```
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "user_id": 1,
      "username": "aarav_tech",
      "email": "aarav@example.com",
      "bio": "Full-stack developer & open-source enthusiast.",
      "avatar": "👨‍💻",
      "created_at": "2026-11-13 10:00:00",
      "is_admin": false,
      "follower_count": 5,
      "following_count": 2,
      "post_count": 8,
      "is_following": false
    },
    "query": "SELECT u.user_id...",
    "params": [0, 1]
  }
  ```

---

### 1.3 Register New User
- **Endpoint**: `POST /api/users`
- **Request Body**:
  ```json
  {
    "username": "priya_dev",
    "email": "priya.dev@example.com",
    "bio": "Cloud architect & data enthusiast",
    "avatar": "👩‍💻"
  }
  ```
- **Underlying SQL Query**:
  ```sql
  INSERT INTO Users (username, email, bio, avatar) VALUES (?, ?, ?, ?);
  ```
- **Response `201 Created`**:
  ```json
  {
    "data": {
      "user_id": 6,
      "username": "priya_dev",
      "email": "priya.dev@example.com",
      "bio": "Cloud architect & data enthusiast",
      "avatar": "👩‍💻"
    },
    "query": "INSERT INTO Users (username, email, bio, avatar) VALUES (?, ?, ?, ?);",
    "params": ["priya_dev", "priya.dev@example.com", "Cloud architect & data enthusiast", "👩‍💻"]
  }
  ```
- **Error `409 Conflict`**: Returned when `username` or `email` already exists, triggering a `UNIQUE` constraint violation.

---

### 1.4 User Authentication (Login)
- **Endpoint**: `POST /api/login`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin"
  }
  ```
- **Authentication Rules**:
  - `admin` account requires password `admin`. Grants DBA administrative privileges.
  - Regular demo accounts require password `dbms`.
- **Underlying SQL Query**:
  ```sql
  SELECT user_id, username, email, bio, avatar, created_at, is_admin
  FROM Users
  WHERE LOWER(username) = LOWER(?);
  ```
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "user_id": 5,
      "username": "admin",
      "email": "admin@connectsphere.dbms",
      "bio": "ConnectSphere Database Administrator & Chief Architect 🛡️",
      "avatar": "🛡️",
      "created_at": "2026-11-13 10:00:00",
      "is_admin": true
    },
    "message": "Admin authentication successful — DBA privileges granted",
    "query": "SELECT user_id, username...",
    "params": ["admin"]
  }
  ```

---

## 2. Posts & Media Attachments

### 2.1 File & Media Upload
- **Endpoint**: `POST /api/upload`
- **Request Body**:
  ```json
  {
    "fileName": "system_diagram.png",
    "fileType": "image/png",
    "fileData": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "media_url": "/uploads/1700000000_system_diagram.png",
      "file_name": "system_diagram.png",
      "file_type": "image/png"
    },
    "message": "File uploaded successfully"
  }
  ```

---

### 2.2 Get Filtered Post Feed
- **Endpoint**: `GET /api/posts`
- **Query Parameters**:
  - `filter`: Feed filter: `'all'`, `'following'`, or `'my'`.
  - `user_id`: ID of active viewer (for computing `liked_by_user` and `is_following`).
  - `author_id`: *(Optional)* Filter posts by a specific user profile.
- **Underlying SQL Query**:
  ```sql
  SELECT p.*, u.username, u.avatar,
         (SELECT COUNT(*) FROM Likes    WHERE post_id = p.post_id)                         AS like_count,
         (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id)                         AS comment_count,
         (SELECT COUNT(*) FROM Likes    WHERE post_id = p.post_id AND user_id = ?) > 0     AS liked_by_user,
         (SELECT COUNT(*) FROM Likes    WHERE post_id = p.post_id AND user_id = ?) > 0     AS user_liked,
         (SELECT COUNT(*) FROM Followers WHERE follower_id = ? AND following_id = p.user_id) > 0 AS is_following
  FROM Posts p
  JOIN Users u ON p.user_id = u.user_id
  -- Dynamic filter clause:
  -- Following: WHERE p.user_id IN (SELECT following_id FROM Followers WHERE follower_id = ?)
  -- My Posts:  WHERE p.user_id = ?
  -- Author:    WHERE p.user_id = ?
  ORDER BY p.created_at DESC;
  ```

---

### 2.3 Publish New Post
- **Endpoint**: `POST /api/posts`
- **Request Body**:
  ```json
  {
    "user_id": 1,
    "content": "Exploring relational algebra and SQL optimization on ConnectSphere! #dbms",
    "media_url": "/uploads/1700000000_photo.jpg",
    "file_name": "photo.jpg",
    "file_type": "image/jpeg"
  }
  ```
- **Underlying SQL Query**:
  ```sql
  INSERT INTO Posts (user_id, content, media_url, file_name, file_type)
  VALUES (?, ?, ?, ?, ?);
  ```
- **Response `201 Created`**:
  ```json
  {
    "data": {
      "post_id": 5,
      "user_id": 1,
      "content": "Exploring relational algebra...",
      "media_url": "/uploads/1700000000_photo.jpg",
      "file_name": "photo.jpg",
      "file_type": "image/jpeg"
    },
    "query": "INSERT INTO Posts...",
    "params": [1, "Exploring...", "/uploads/...", "photo.jpg", "image/jpeg"]
  }
  ```

---

### 2.4 Delete Post (Cascading Deletion)
- **Endpoint**: `DELETE /api/posts/:id`
- **Description**: Deletes a post. Triggers database-level `ON DELETE CASCADE`, automatically removing all comments and likes attached to this post.
- **Underlying SQL Query**:
  ```sql
  DELETE FROM Posts WHERE post_id = ?;
  ```
- **Response `200 OK`**:
  ```json
  {
    "data": { "post_id": 5 },
    "message": "Post deleted (ON DELETE CASCADE triggered)",
    "query": "DELETE FROM Posts WHERE post_id = ?;",
    "params": [5]
  }
  ```

---

## 3. Social Interactions: Likes, Comments, Followers

### 3.1 Toggle Post Like
- **Endpoint**: `POST /api/posts/:id/like`
- **Request Body**: `{ "user_id": 1 }`
- **Behavior**: Checks if like exists. If present, executes `DELETE FROM Likes`; if not present, executes `INSERT INTO Likes`.
- **Underlying SQL Queries**:
  ```sql
  -- Step 1: Verification
  SELECT like_id FROM Likes WHERE post_id = ? AND user_id = ?;

  -- Step 2A (If exists):
  DELETE FROM Likes WHERE post_id = ? AND user_id = ?;

  -- Step 2B (If does not exist):
  INSERT INTO Likes (post_id, user_id) VALUES (?, ?);
  ```

---

### 3.2 List Comments on a Post
- **Endpoint**: `GET /api/posts/:id/comments`
- **Underlying SQL Query**:
  ```sql
  SELECT c.*, u.username, u.avatar
  FROM Comments c
  JOIN Users u ON c.user_id = u.user_id
  WHERE c.post_id = ?
  ORDER BY c.created_at ASC;
  ```

---

### 3.3 Add Comment
- **Endpoint**: `POST /api/posts/:id/comments`
- **Request Body**:
  ```json
  {
    "user_id": 2,
    "comment_text": "Great insights on database normalization!"
  }
  ```
- **Underlying SQL Query**:
  ```sql
  INSERT INTO Comments (post_id, user_id, comment_text) VALUES (?, ?, ?);
  ```

---

### 3.4 Toggle Follow / Unfollow
- **Endpoint**: `POST /api/followers`
- **Request Body**:
  ```json
  {
    "follower_id": 1,
    "following_id": 2
  }
  ```
- **Constraints Enforced**:
  - `follower_id !== following_id` (Returns `400 Bad Request` if self-follow is attempted).
  - Toggles between `DELETE FROM Followers` and `INSERT INTO Followers`.
- **Underlying SQL Query**:
  ```sql
  SELECT id FROM Followers WHERE follower_id = ? AND following_id = ?;
  ```

---

## 4. Analytical DBMS Queries (Lab Benchmarks)

ConnectSphere exposes five specialized analytical endpoints demonstrating advanced SQL operations:

### Q1: Newsfeed Generation (Multi-Table JOIN)
- **Endpoint**: `GET /api/analytics/newsfeed`
- **Concept**: `INNER JOIN` combining `Posts` and `Users` with correlated aggregate subqueries.
- **SQL Statement**:
  ```sql
  SELECT p.post_id, p.content, p.media_url, p.file_name, p.created_at,
         u.username, u.avatar,
         (SELECT COUNT(*) FROM Likes WHERE post_id = p.post_id) AS like_count,
         (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count
  FROM Posts p
  JOIN Users u ON p.user_id = u.user_id
  ORDER BY p.created_at DESC
  LIMIT 20;
  ```

---

### Q2: Top Liked Posts (`LEFT JOIN` + `GROUP BY`)
- **Endpoint**: `GET /api/analytics/top-liked`
- **Concept**: Groups posts and counts associated likes using a `LEFT JOIN` so posts with 0 likes are accurately represented.
- **SQL Statement**:
  ```sql
  SELECT p.post_id, p.content, u.username, COUNT(l.like_id) AS total_likes
  FROM Posts p
  JOIN Users u ON p.user_id = u.user_id
  LEFT JOIN Likes l ON p.post_id = l.post_id
  GROUP BY p.post_id, p.content, u.username
  ORDER BY total_likes DESC
  LIMIT 5;
  ```

---

### Q3: Most Followed Users (Leaderboard)
- **Endpoint**: `GET /api/analytics/most-followed`
- **Concept**: Correlated subquery computing the in-degree of edges in the directed social graph.
- **SQL Statement**:
  ```sql
  SELECT u.user_id, u.username, u.bio,
         (SELECT COUNT(*) FROM Followers WHERE following_id = u.user_id) AS follower_count
  FROM Users u
  ORDER BY follower_count DESC
  LIMIT 5;
  ```

---

### Q4: Threaded Post Comments (`JOIN` with User Metadata)
- **Endpoint**: `GET /api/analytics/post-comments/:postId`
- **Concept**: Resolves foreign keys to display user avatar and handle alongside comment body text.
- **SQL Statement**:
  ```sql
  SELECT c.comment_id, c.comment_text, c.created_at, u.username, u.avatar
  FROM Comments c
  JOIN Users u ON c.user_id = u.user_id
  WHERE c.post_id = ?
  ORDER BY c.created_at ASC;
  ```

---

### Q5: User Engagement Analytics Matrix
- **Endpoint**: `GET /api/analytics/engagement`
- **Concept**: Holistic user activity matrix computing published posts, likes distributed, and comments submitted.
- **SQL Statement**:
  ```sql
  SELECT u.user_id, u.username,
         (SELECT COUNT(*) FROM Posts WHERE user_id = u.user_id) AS posts_count,
         (SELECT COUNT(*) FROM Likes WHERE user_id = u.user_id) AS likes_given,
         (SELECT COUNT(*) FROM Comments WHERE user_id = u.user_id) AS comments_made
  FROM Users u
  ORDER BY posts_count DESC;
  ```

---

## 5. System Administration & Live Table Inspector

| Endpoint | Method | Description | Underlying SQL |
| :--- | :---: | :--- | :--- |
| `/api/tables/:tableName` | `GET` | Dumps raw contents of specified table (`users`, `posts`, `comments`, `likes`, `followers`) | `SELECT * FROM <TableName>;` |
| `/api/query-log` | `GET` | Fetches in-memory query history array | *(In-Memory buffer)* |
| `/api/query-log` | `DELETE` | Clears in-memory query history | *(Buffer reset)* |
| `/api/db-status` | `GET` | Verifies database connectivity and timestamp | `SELECT 1 as connected, CURRENT_TIMESTAMP as server_time;` |
| `/api/reset` | `POST` | Re-executes `schema.sql` to wipe and re-seed the entire database | Drops and recreates all tables, reapplying constraints and initial seeds |
