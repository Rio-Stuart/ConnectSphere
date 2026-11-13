# Features & System Workflows

This document describes the key end-to-end user workflows, behavioral mechanics, and architectural interactions implemented in **ConnectSphere**.

---

## 1. Authentication & Perspective Switcher Workflow

ConnectSphere features a role-aware authentication system that dynamically shifts the interface between a streamlined **Social Media Consumer Perspective** and a high-powered **Database Administrator (DBA) Perspective**.

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> LoginScreen: User visits site
    LoginScreen --> Authenticating: Submit Username & Password
    
    state Authenticating {
        [*] --> VerifyCredentials
        VerifyCredentials --> CheckRole: Match user in database
        CheckRole --> AdminRole: username == 'admin' AND password == 'admin'
        CheckRole --> UserRole: regular user AND password == 'dbms'
        CheckRole --> AuthError: Password mismatch / User not found
    }

    AuthError --> LoginScreen: Show error toast & log SQL
    AdminRole --> AdminView: Set isAdmin = true
    UserRole --> UserView: Set isAdmin = false

    state AdminView {
        [*] --> SplitLayout
        SplitLayout --> LiveInspectorEnabled: Table explorer & Query console
        SplitLayout --> DDLControlsEnabled: INSERT User & DB Reset buttons
    }

    state UserView {
        [*] --> StreamlinedFeed
        StreamlinedFeed --> QueryConsoleCollapsible: Optional 'Show Queries' toggle
    }

    AdminView --> Unauthenticated: Click 'Switch Account' / Logout
    UserView --> Unauthenticated: Click 'Switch Account' / Logout
```

### 1.1 Credential Verification Rules
- **Administrator Account (`admin`)**:
  - Requires password: `admin`.
  - Exposes administrative controls: **INSERT User Modal**, **Layout Switcher** (Split, Feed Focus, Inspector Focus), and **Database Reset** button.
- **Demo User Accounts (`aarav_tech`, `priya_travels`, `rohan_fitness`, `neha_art`)**:
  - Require password: `dbms`.
  - Presents a clean social feed experience with an optional **Show Queries** toggle button.
- **Account Quick Selectors**:
  - The login screen includes interactive pills populated from the live `Users` table, allowing users to switch perspectives easily.

---

## 2. Post Creation & Media Attachment Workflow

Publishing a post handles text content, hashtags, and optional file attachments (photos, PDFs, documents, code snippets).

```mermaid
sequenceDiagram
    autonumber
    actor Author as User
    participant Browser as Browser Client (app.js)
    participant Server as Express Server (server.js)
    participant DiskDB as Storage & DB Engine

    Author->>Browser: Types post text & attaches an image
    Browser->>Browser: FileReader converts file to Base64 Data URI
    Browser->>Browser: Update live SQL preview box: INSERT INTO Posts (user_id, content) VALUES (1, '...')
    Author->>Browser: Clicks "Publish Post"
    
    alt File Attachment Present
        Browser->>Server: POST /api/upload { fileName, fileType, fileData }
        Server->>DiskDB: Save file to disk (or store Data URI in cloud)
        Server-->>Browser: { media_url: "/uploads/...", file_name, file_type }
    end

    Browser->>Server: POST /api/posts { user_id, content, media_url, ... }
    Server->>DiskDB: INSERT INTO Posts (user_id, content, media_url, ...) VALUES (?, ?, ...)
    DiskDB-->>Server: Result (insertId: 6)
    Server-->>Browser: HTTP 201 Created with { data, query, params }
    Browser->>Browser: Prepend new post to feed DOM
    Browser->>Browser: Broadcast SQL telemetry to live query logger terminal
```

### 2.1 Live SQL Composer Preview
As the user types into the post composer textarea, the frontend runs real-time string interpolation to preview the exact parameterized SQL statement that will be dispatched to the server:
```sql
INSERT INTO Posts (user_id, content, media_url, file_name, file_type) 
VALUES (1, 'What is happening in DBMS?', NULL, NULL, NULL);
```

---

## 3. Post Deletion & Cascading Elimination Workflow

When a post is deleted, referential integrity cascades take effect inside the RDBMS storage engine without requiring complex server-side manual delete chains:

```mermaid
flowchart TD
    User["User clicks 'Delete Post'"] --> Confirm["Browser displays confirmation dialog"]
    Confirm --> API["Client calls DELETE /api/posts/:id"]
    API --> Execute["Server executes: DELETE FROM Posts WHERE post_id = ?"]
    
    subgraph RDBMSEngine["RDBMS Storage Engine (InnoDB / PostgreSQL)"]
        DeletePost["Remove tuple from 'Posts' table"]
        CascadeLikes["ON DELETE CASCADE triggers on 'Likes' table: Removes all likes with post_id"]
        CascadeComments["ON DELETE CASCADE triggers on 'Comments' table: Removes all comments with post_id"]
        
        DeletePost --> CascadeLikes
        DeletePost --> CascadeComments
    end

    Execute --> RDBMSEngine
    RDBMSEngine --> Response["Server returns affected rows & logged SQL statement"]
    Response --> RemoveDOM["Browser smoothly removes post card from DOM"]
    Response --> Terminal["Live SQL Logger renders DELETE statement badge"]
```

---

## 4. Directed Social Graph & Feed Filtering Workflow

ConnectSphere models follower networks as a directed graph using the `Followers` table:

```mermaid
flowchart LR
    subgraph Graph["Directed Edge Model"]
        UserA["User 1 (@aarav_tech)"] -->|"Follows (Edge: 1 -> 2)"| UserB["User 2 (@priya_travels)"]
        UserC["User 3 (@rohan_fitness)"] -->|"Follows (Edge: 3 -> 2)"| UserB
    end
```

### 4.1 Self-Follow Prevention
When a follow action is initiated:
1. **Frontend Guard**: The UI disables the follow button on one's own profile card and hides self-follow actions.
2. **API Layer Check**: `server.js` verifies `if (Number(follower_id) === Number(following_id))` and returns `400 Bad Request`.
3. **Database Engine Constraint**: The table definition includes `CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)`. Even if an arbitrary request hits the database, the engine rejects the invalid tuple.

### 4.2 Feed Filtering Modes
The feed can be switched dynamically between three distinct views:

| Filter Mode | Client Filter | Underlying SQL `WHERE` Strategy |
| :--- | :--- | :--- |
| **For You (All)** | `filter=all` | No `WHERE` filter on author; returns all posts sorted by `created_at DESC`. |
| **Following** | `filter=following` | `WHERE p.user_id IN (SELECT following_id FROM Followers WHERE follower_id = ?)` |
| **My Posts** | `filter=my` | `WHERE p.user_id = ?` (Only posts written by the logged-in user). |

---

## 5. Real-Time SQL Query Telemetry Engine

One of the defining aspects of ConnectSphere is its real-time query interception and telemetry display.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client Application (app.js)
    participant Fetch as api() wrapper
    participant Server as Express Server (server.js)
    participant Engine as runQuery()
    participant Terminal as Live SQL Terminal

    Client->>Fetch: Initiates action (e.g. toggleLike)
    Fetch->>Server: HTTP Request
    Server->>Engine: runQuery(sql, params)
    Engine->>Engine: Record timestamp, query string, parameters & type
    Engine-->>Server: Result + query metadata
    Server-->>Fetch: JSON Envelope: { data: ..., query: "...", params: [...] }
    Fetch->>Terminal: logSql(json.query, json.params)
    Terminal->>Terminal: Create terminal card with syntax badge (SELECT/INSERT/etc.)
    Terminal->>Terminal: Prepend entry & update query counter badge
```

### 5.1 Query Type Detection & Color Badges
The frontend analyzes the query prefix to assign semantic color tags:
- **`SELECT`**: Blue badge (`badge-select`)
- **`INSERT`**: Emerald badge (`badge-insert`)
- **`UPDATE`**: Amber badge (`badge-update`)
- **`DELETE`**: Rose badge (`badge-delete`)
- **`DDL` (CREATE/DROP/ALTER)**: Purple badge

---

## 6. Live Relational Table Inspector & Sync

The database inspector on the right pane allows users to browse raw table data live:
- **Tabs**: `Users`, `Posts`, `Comments`, `Likes`, `Followers`.
- **Live Sync**: Whenever an action occurs (like, comment, post), the client updates the active table tab to reflect the latest state.
- **Key Badges**:
  - Primary Key columns are marked with `<span class="badge-pk">PK</span>`.
  - Foreign Key references are annotated with `<span class="badge-fk">FK</span>`.
- **Data Rendering**:
  - Cell truncation for long text content.
  - Formatted timestamps for readability.

---

## 7. UI Layout Modes & Responsive Design

ConnectSphere features a 3-way layout engine tailored for both social engagement and database demonstration:

```mermaid
flowchart TD
    subgraph LayoutSwitcher["Layout Controls"]
        Split["Split Mode (Default): 7 Cols Feed / 5 Cols Inspector"]
        FeedOnly["Feed Focus Mode: 12 Cols Feed / Inspector Hidden"]
        InspectorOnly["Inspector Focus Mode: 12 Cols Inspector / Feed Hidden"]
    end
```

- **Split View (`split`)**: Balanced dual-pane view showing the live social network on the left and the DBMS inspector / query console on the right.
- **Feed Focus (`feed`)**: Expands the social timeline to full width, ideal for standard user browsing.
- **Inspector Focus (`inspector`)**: Expands the live SQL logger and table viewer across the entire screen, ideal for technical presentations, query reviews, and DBMS lab benchmarks.
