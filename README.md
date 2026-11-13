# ConnectSphere — Social Media Platform & Real-Time SQL Engine

> A full-stack social media web platform and interactive DBMS educational laboratory. Every single action taken on the website (creating posts, publishing comments, liking, following users, deleting posts) executes real SQL queries and displays the exact query, execution parameters, and database feedback live on the screen.

---

## 🚀 Features

- **Social Media Core**:
  - Live timeline feed (All / Following / My Posts filters).
  - Clean authentication system with role-based perspectives (Regular Users vs. DBA Administrator).
  - Rich post composer with file and image attachments (photos, PDFs, documents, code snippets).
  - Full interactive user profiles with relational counters (Posts, Followers, Following).
  - Interactive like and threaded comment drawers.
  - Light and Dark mode theme support.
  
- **DBMS Educational Engine**:
  - **Live SQL Query Logger**: Real-time terminal showing every `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `JOIN` query executed by the database engine.
  - **Live Database Table Explorer**: Browse all 5 relational tables (`Users`, `Posts`, `Comments`, `Likes`, `Followers`) with Primary Key (`PK`) and Foreign Key (`FK`) annotations.
  - **5 Executable Analytical Queries**:
    - **Q1**: Newsfeed generation with multi-table `JOIN`
    - **Q2**: Top liked posts via `LEFT JOIN` and `GROUP BY`
    - **Q3**: Most followed users via subquery aggregation
    - **Q4**: Threaded post comments join
    - **Q5**: User engagement metrics matrix
  - **ON DELETE CASCADE**: Deleting a post cascades automatically to all its likes and comments.
  - **CHECK Constraints**: Prevents self-follows (`follower_id <> following_id`).
  - **UNIQUE Constraints**: Enforced on usernames, emails, and like/follow pairs.

---

## 🏗️ Architecture

- **Frontend**: Single Page Application (SPA) built with semantic HTML5, Tailwind CSS, Font Awesome, and vanilla JavaScript.
- **Backend**: Express.js REST API with serverless adapter support (`serverless-http`).
- **Database**:
  - **Netlify Database (PostgreSQL)**: Zero-config managed database with automated migrations under `netlify/database/migrations/`.
  - **MySQL 8.0**: Connection pooling via `mysql2/promise` with DDL schema and seed scripts under `database/`.

---

## 📦 Project Structure

```
DBMS/
├── netlify/
│   ├── database/migrations/  # Netlify Database automated migrations
│   │   ├── 20261113100000_create_connectsphere_schema.sql
│   │   └── 20261113100001_seed_initial_data.sql
│   └── functions/            # Netlify Serverless Function wrapper
│       └── api.js
├── database/                 # MySQL 8.0 schema & seed scripts
│   ├── schema.sql
│   └── seed.js
├── db/                       # Netlify Database connection manager
│   └── index.js
├── public/                   # Frontend assets
│   ├── index.html            # Main UI
│   ├── app.js                # Frontend logic & query logging
│   └── styles.css            # Styles, themes, and animations
├── netlify.toml              # Netlify build & redirect routing
├── server.js                 # Express server & API endpoints
├── package.json              # Project dependencies
└── README.md
```

---

## 🛠️ Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/Rio-Stuart/ConnectSphere.git
cd ConnectSphere
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
# Option A: Run standard Express server (default: port 3000)
npm start

# Option B: Run via Netlify CLI (mirrors cloud environment & database)
npx netlify dev
```

Visit **`http://localhost:3000`** in your browser.

---

## ☁️ Deploy to Netlify

This project includes first-class support for **Netlify** and **Netlify Database**:

1. Push your repository to GitHub.
2. In the [Netlify Dashboard](https://app.netlify.com), click **Add new site** ➔ **Import an existing project**.
3. Select your repository. Netlify will automatically detect `netlify.toml`, provision a managed PostgreSQL database, apply migrations, and deploy the application.

---

## 📄 License

MIT License. Designed and developed for DBMS academic demonstration and social media platform architecture.
