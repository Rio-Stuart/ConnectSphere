# generate_documents.py — Generates DOCX and PDF Project Report matching Chandigarh University format
import os
import pypdf
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx2pdf import convert

def set_cell_background(cell, hex_color):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_page_number_to_section(section):
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    fldSimple = OxmlElement('w:fldSimple')
    fldSimple.set(qn('w:instr'), 'PAGE')
    run._r.append(fldSimple)

def build_report(page_map=None):
    if page_map is None:
        page_map = {
            1: "3", 2: "3", 3: "4", 4: "4", 5: "5",
            6: "6", 7: "7", 8: "8", 9: "9", 10: "10",
            11: "14", 12: "15", 13: "17", 14: "17", 15: "18"
        }

    doc = Document()
    
    # Page setup - 1 inch margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        add_page_number_to_section(section)

    # Set default font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(11.5)
    font.color.rgb = RGBColor(0x11, 0x18, 0x27)
    style.paragraph_format.line_spacing = 1.2
    style.paragraph_format.space_after = Pt(6)

    # =========================================================================
    # FRONT COVER PAGE (Matching CU PDF Format)
    # =========================================================================
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(4)
    r1 = p1.add_run("CHANDIGARH UNIVERSITY\n")
    r1.bold = True
    r1.font.size = Pt(17)
    r1.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    r2 = p1.add_run("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING\n\n")
    r2.bold = True
    r2.font.size = Pt(13)
    r2.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    r3 = p1.add_run("PROJECT REPORT ON\n")
    r3.bold = True
    r3.font.size = Pt(12)
    r3.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    r4 = p1.add_run("CONNECTSPHERE: A RELATIONAL SOCIAL MEDIA PLATFORM\nWITH REAL-TIME SQL ENGINE")
    r4.bold = True
    r4.font.size = Pt(15)
    r4.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)

    # CU Logo
    logo_path = os.path.abspath('report_assets/cu_logo_clean.png')
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(14)
        p_logo.paragraph_format.space_after = Pt(14)
        p_logo.add_run().add_picture(logo_path, width=Inches(1.8))

    # Academic info
    p_info = doc.add_paragraph()
    p_info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_info.paragraph_format.space_before = Pt(6)
    p_info.paragraph_format.space_after = Pt(18)
    
    r_info = p_info.add_run(
        "SECTION: 25BCS802-A\n"
        "SUBJECT: Database and Management System\n"
        "SUBJECT CODE: 25CST-201\n"
        "ACADEMIC SESSION: 2026–2027"
    )
    r_info.font.size = Pt(11)
    r_info.bold = True
    r_info.font.color.rgb = RGBColor(0x1e, 0x29, 0x3b)

    # Submission info
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(6)
    p_sub.paragraph_format.space_after = Pt(2)
    r_to_hdr = p_sub.add_run("SUBMITTED TO:\n")
    r_to_hdr.bold = True
    r_to_hdr.font.size = Pt(11)
    r_to = p_sub.add_run("Mr. Gaurav\nDepartment of Computer Science and Engineering\n\n")
    r_to.font.size = Pt(11)

    r_by_hdr = p_sub.add_run("SUBMITTED BY:\n")
    r_by_hdr.bold = True
    r_by_hdr.font.size = Pt(11)

    r_by = p_sub.add_run(
        "SUBHAM PANIGRAHI — UID: 25BCS12639\n"
        "JAGRUTHI JULAPELLI — UID: 25BCS10824\n"
        "BHAVISHYA PAL — UID: 25BCS12751"
    )
    r_by.font.size = Pt(10.5)
    r_by.bold = True
    r_by.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)

    # =========================================================================
    # INSERT INDEX / TABLE OF CONTENTS PAGE RIGHT AFTER FRONT PAGE
    # =========================================================================
    doc.add_page_break()

    p_idx_title = doc.add_paragraph()
    p_idx_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_idx_title.paragraph_format.space_before = Pt(12)
    p_idx_title.paragraph_format.space_after = Pt(16)
    r_idx_title = p_idx_title.add_run("PROJECT INDEX / TABLE OF CONTENTS")
    r_idx_title.bold = True
    r_idx_title.font.size = Pt(15)
    r_idx_title.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)

    index_table = doc.add_table(rows=1, cols=3)
    index_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    idx_hdr = index_table.rows[0].cells
    idx_headers = ["Index No.", "Project Topic / Description", "Page No."]
    col_widths = [Inches(1.0), Inches(4.5), Inches(1.0)]

    for i, h in enumerate(idx_headers):
        idx_hdr[i].text = h
        idx_hdr[i].width = col_widths[i]
        p = idx_hdr[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i != 1 else WD_ALIGN_PARAGRAPH.LEFT
        p.runs[0].bold = True
        p.runs[0].font.size = Pt(10.5)
        p.runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_background(idx_hdr[i], "1E293B")
        set_cell_margins(idx_hdr[i], 120, 120, 150, 150)

    index_topics = [
        ("1", "Abstract", page_map.get(1, "3")),
        ("2", "Introduction", page_map.get(2, "3")),
        ("3", "Problem Statement and Objectives", page_map.get(3, "4")),
        ("4", "Scope of the Project", page_map.get(4, "4")),
        ("5", "Requirement Analysis", page_map.get(5, "5")),
        ("6", "Entity-Relationship (ER) Diagram", page_map.get(6, "6")),
        ("7", "Relational Schema / Database Design", page_map.get(7, "7")),
        ("8", "Normalization (1NF, 2NF, 3NF & BCNF)", page_map.get(8, "8")),
        ("9", "SQL Implementation (DDL, DML, DQL, TCL, DCL)", page_map.get(9, "9")),
        ("10", "Minimum 15–20 SQL Queries with Explanations and Outputs", page_map.get(10, "10")),
        ("11", "Constraints, Joins, Subqueries and Aggregate Functions", page_map.get(11, "14")),
        ("12", "Screenshots of Execution", page_map.get(12, "15")),
        ("13", "Conclusion", page_map.get(13, "17")),
        ("14", "Future Scope", page_map.get(14, "17")),
        ("15", "References & Research Sources", page_map.get(15, "18"))
    ]

    for row_idx, (num, topic, page) in enumerate(index_topics):
        row = index_table.add_row()
        bg = "F8FAFC" if row_idx % 2 == 0 else "FFFFFF"
        for i, val in enumerate([num, topic, str(page)]):
            c = row.cells[i]
            c.width = col_widths[i]
            c.text = val
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i != 1 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.runs[0]
            r.font.size = Pt(10)
            if i == 0 or i == 2:
                r.bold = True
            set_cell_background(c, bg)
            set_cell_margins(c, 90, 90, 130, 130)

    # PAGE BREAK BEFORE SECTION 1
    doc.add_page_break()

    # Helper functions for document body
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(13.5)
        run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)
        return p

    def add_p(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.2
        run = p.add_run(text)
        run.font.size = Pt(11)
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        r_bold = p.add_run(bold_prefix)
        r_bold.bold = True
        r_bold.font.size = Pt(11)
        r_text = p.add_run(text)
        r_text.font.size = Pt(11)
        return p

    def add_code(sql_text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.left_indent = Inches(0.2)
        p.paragraph_format.line_spacing = 1.05
        run = p.add_run(sql_text.strip())
        run.font.name = 'Consolas'
        run.font.size = Pt(9.2)
        run.font.color.rgb = RGBColor(0x0f, 0x29, 0x42)
        return p

    def add_figure(img_filename, caption_text, width_in=5.8):
        full_path = os.path.abspath(f'report_assets/{img_filename}')
        if os.path.exists(full_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(10)
            p_img.paragraph_format.space_after = Pt(2)
            p_img.add_run().add_picture(full_path, width=Inches(width_in))
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(10)
            r = p_cap.add_run(caption_text)
            r.bold = True
            r.italic = True
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    # =========================================================================
    # 1. ABSTRACT (Starts properly from Point 1)
    # =========================================================================
    add_h1("1. Abstract")
    add_p(
        "In modern computer science education, relational database management concepts such as normalization, "
        "referential integrity, relational algebra, and ACID transaction guarantees are frequently studied strictly "
        "through abstract terminal commands. ConnectSphere bridges this divide by delivering a production-grade relational "
        "social media platform with an embedded, real-time SQL execution engine. Engineered using MySQL 8.0 and PostgreSQL "
        "with an Express.js / Node.js architecture, the application enforces rigorous relational modeling across users, "
        "multimedia posts, threaded comments, likes, and a bidirectional social follower network."
    )
    add_p(
        "Every interactive event on the platform—whether user authentication, publishing multimedia posts, or curating "
        "custom timelines—triggers dynamic SQL operations that are captured, logged, and broadcast in real-time to an "
        "administrative database console. The platform implements database-level integrity constraints including CHECK "
        "(follower_id <> following_id), composite UNIQUE constraints to prevent duplicate likes, and ON DELETE CASCADE "
        "rules to guarantee structural purity without orphaned records. This project report details the problem domain, "
        "functional requirements, mathematical normalization proofs (1NF, 2NF, 3NF, BCNF), entity-relationship modeling, "
        "complete executable DDL/DML scripts, and 20 verified DBMS analytical queries."
    )

    # =========================================================================
    # 2. INTRODUCTION
    # =========================================================================
    add_h1("2. Introduction")
    add_p(
        "Relational Database Management Systems (RDBMS), founded upon E.F. Codd’s relational model (1970), organize "
        "unstructured data into mathematically sound relations (tables) governed by strict domain constraints, primary keys, "
        "and declarative query semantics (SQL). Modern web platforms handle billions of interconnected records: user credentials, "
        "multimedia feeds, and directed follower networks. Understanding how relational systems maintain referential consistency "
        "under high concurrency, prevent orphaned records through cascade operations, and optimize complex multi-table joins is a "
        "vital competency for computer science engineers."
    )
    add_p(
        "ConnectSphere is built to serve two essential roles: (1) A consumer-facing social media platform where users can "
        "register accounts, explore profiles, post text and media updates, like posts, participate in comment threads, and curate "
        "their feed; and (2) An educational real-time DBMS laboratory where users and administrators can inspect the exact SQL "
        "queries executed behind every web transaction, review foreign key dependency graphs, examine transactional states, and "
        "execute analytical DBMS queries directly against live database clusters."
    )

    # =========================================================================
    # 3. PROBLEM STATEMENT AND OBJECTIVES
    # =========================================================================
    add_h1("3. Problem Statement and Objectives")
    add_h2("3.1 Problem Statement")
    add_p(
        "Traditional DBMS laboratory curricula typically rely on static command-line interactions utilizing toy schemas "
        "(such as Employee-Department or Sailors-Boats). Consequently, students often struggle to conceptualize: (a) how web "
        "interfaces translate graphical user actions into atomic SQL statements; (b) why schema normalization is critical to "
        "prevent insertion, update, and deletion anomalies; (c) how cascading foreign keys protect structural database integrity; "
        "and (d) how complex relational operations (Correlated Subqueries, Left Outer Joins, Self Joins) operate in high-frequency "
        "production environments."
    )
    add_h2("3.2 Objectives of ConnectSphere")
    add_bullet("1. Relational Schema Rigor: ", "Design and implement a normalized database schema in Third Normal Form (3NF) encompassing Users, Posts, Comments, Likes, and Followers.")
    add_bullet("2. Constraint Enforcement: ", "Guarantee structural integrity using Primary Keys, Foreign Keys with ON DELETE CASCADE, Candidate Unique Keys, and Domain Check Constraints.")
    add_bullet("3. Dual Database Support: ", "Deliver an execution layer compatible with both local enterprise MySQL 8.0 (InnoDB) and cloud-managed PostgreSQL instances.")
    add_bullet("4. Live Query Telemetry: ", "Capture, log, and display the underlying DDL, DML, and DQL statements generated by application workflows in real-time.")
    add_bullet("5. Role-Based Privilege Segregation: ", "Segregate standard user social media experiences from Database Administrator (DBA) inspection modes.")
    add_bullet("6. Execution Guarantee: ", "Ensure all code and database scripts are 100% executable on client and evaluation machines without third-party dependencies.")

    # =========================================================================
    # 4. SCOPE OF THE PROJECT
    # =========================================================================
    add_h1("4. Scope of the Project")
    add_p(
        "The scope of ConnectSphere covers end-to-end relational database modeling, application development, and API integration. "
        "It includes full CRUD capabilities for users, posts, media files, comments, likes, and follower relationships. Referential "
        "integrity is strictly guaranteed at the database level using ON DELETE CASCADE. Analytical capabilities encompass newsfeed joins, "
        "influencer ranking leaderboards, engagement summary matrices, and second-degree follower recommendations. The system is engineered "
        "to run seamlessly both on personal PCs (via MySQL 8.0) and on cloud serverless infrastructure (via Netlify Managed PostgreSQL)."
    )

    # =========================================================================
    # 5. REQUIREMENT ANALYSIS
    # =========================================================================
    add_h1("5. Requirement Analysis")
    add_h2("5.1 Functional Requirements")
    add_bullet("FR1 (User Identity Management): ", "System registers unique users with username, email, avatar, and bio, rejecting duplicate handles via unique constraint checks.")
    add_bullet("FR2 (Authentication & Roles): ", "Role separation supporting standard demo accounts (password 'dbms') and DBA administrators (username 'admin', password 'admin').")
    add_bullet("FR3 (Post & Multimedia Publishing): ", "Authorized users can publish text posts and attach image or binary documents.")
    add_bullet("FR4 (Social Engagement - Likes): ", "Users can toggle likes on posts, with database-level prevention of duplicate likes.")
    add_bullet("FR5 (Threaded Discussions - Comments): ", "Users can write timestamped comments under any post.")
    add_bullet("FR6 (Relational Network - Followers): ", "Bidirectional follow/unfollow capability with database-level prohibition of self-following.")
    add_bullet("FR7 (Timeline Feeds): ", "Users can filter timelines by 'For You' (global), 'Following' (network-only), and 'My Posts' (author archive).")
    add_bullet("FR8 (DBA Management Console): ", "Administrative view featuring real-time query logs, execution durations, raw table inspection, and database reset tools.")

    add_h2("5.2 Non-Functional Requirements")
    add_bullet("Performance: ", "Sub-50ms execution times for indexed read operations across all relations.")
    add_bullet("Data Integrity: ", "Zero orphaned foreign records following entity deletions via ON DELETE CASCADE.")
    add_bullet("Portability: ", "Executable across Windows, macOS, Linux, and cloud environments.")
    add_bullet("Usability: ", "Clean dual-theme interface supporting Modern Dark and Clean Light modes.")

    add_h2("5.3 Hardware & Software Specifications")
    add_bullet("Database Engine: ", "MySQL Server 8.0 (InnoDB Storage Engine) / PostgreSQL 16+")
    add_bullet("Application Framework: ", "Node.js v18.0.0+ / Express.js 4.21.0")
    add_bullet("Database Drivers: ", "mysql2/promise (connection pooling), pg (PostgreSQL), @netlify/database")
    add_bullet("Frontend Stack: ", "Semantic HTML5, CSS3 Custom Properties, Vanilla ES6+ JavaScript (zero build step)")

    # =========================================================================
    # 6. ENTITY-RELATIONSHIP (ER) DIAGRAM
    # =========================================================================
    add_h1("6. Entity-Relationship (ER) Diagram")
    add_h2("6.1 Entities and Attributes")
    add_p(
        "The conceptual design of ConnectSphere comprises five core relational entities: Users, Posts, Comments, Likes, and Followers. "
        "Primary keys are designated by [PK], candidate unique keys by [UK], and foreign keys by [FK]."
    )
    add_bullet("USERS: ", "user_id [PK], username [UK], email [UK], bio, avatar, is_admin, created_at")
    add_bullet("POSTS: ", "post_id [PK], user_id [FK], content, media_url, file_name, file_type, created_at")
    add_bullet("COMMENTS: ", "comment_id [PK], post_id [FK], user_id [FK], comment_text, created_at")
    add_bullet("LIKES: ", "like_id [PK], post_id [FK], user_id [FK], liked_at, UNIQUE(post_id, user_id)")
    add_bullet("FOLLOWERS: ", "id [PK], follower_id [FK], following_id [FK], followed_at, CHECK(follower_id <> following_id)")

    add_h2("6.2 Cardinality & Participation Constraints")
    add_bullet("USERS to POSTS (1:N): ", "One user can author zero or many posts; each post belongs to exactly one user.")
    add_bullet("POSTS to COMMENTS (1:N): ", "A post can receive zero or many comments; each comment belongs to exactly one post.")
    add_bullet("USERS to COMMENTS (1:N): ", "A user can write zero or many comments; each comment is authored by exactly one user.")
    add_bullet("POSTS to LIKES (1:N): ", "A post can receive zero or many likes.")
    add_bullet("USERS to LIKES (1:N): ", "A user can grant zero or many likes.")
    add_bullet("USERS to FOLLOWERS (M:N Recursive): ", "A user can follow many other users and be followed by many other users.")

    add_figure('er_diagram_clean.png', 'Figure 1: Relational Entity-Relationship Diagram (3NF Schema)', width_in=5.8)

    # =========================================================================
    # 7. RELATIONAL SCHEMA / DATABASE DESIGN
    # =========================================================================
    add_h1("7. Relational Schema / Database Design")
    add_h2("7.1 Schema Notations")
    add_p("The relational database schema is formally defined as:")
    add_p(
        "• Users (user_id [PK], username [UK], email [UK], bio, avatar, is_admin, created_at)\n"
        "• Posts (post_id [PK], user_id [FK -> Users], content, media_url, file_name, file_type, created_at)\n"
        "• Comments (comment_id [PK], post_id [FK -> Posts], user_id [FK -> Users], comment_text, created_at)\n"
        "• Likes (like_id [PK], post_id [FK -> Posts], user_id [FK -> Users], liked_at) [Candidate: (post_id, user_id)]\n"
        "• Followers (id [PK], follower_id [FK -> Users], following_id [FK -> Users], followed_at) [Candidate: (follower_id, following_id)]"
    )

    add_h2("7.2 Detailed Table Specifications")
    add_p("Table 1 summarizes the technical attributes, data types, and integrity constraints across all five relations:")

    table_spec = doc.add_table(rows=1, cols=4)
    table_spec.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table_spec.rows[0].cells
    headers = ["Table Name", "Attribute", "Data Type", "Constraints / Description"]
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].paragraphs[0].runs[0].bold = True
        hdr_cells[i].paragraphs[0].runs[0].font.size = Pt(10)
        set_cell_background(hdr_cells[i], "1E293B")
        hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_margins(hdr_cells[i], 120, 120, 150, 150)

    spec_data = [
        ("Users", "user_id", "INT / SERIAL", "PRIMARY KEY AUTO_INCREMENT"),
        ("Users", "username", "VARCHAR(50)", "NOT NULL, UNIQUE candidate key"),
        ("Users", "email", "VARCHAR(100)", "NOT NULL, UNIQUE candidate key"),
        ("Users", "is_admin", "BOOLEAN", "DEFAULT FALSE (DBA role flag)"),
        ("Posts", "post_id", "INT / SERIAL", "PRIMARY KEY AUTO_INCREMENT"),
        ("Posts", "user_id", "INT", "NOT NULL, FK -> Users ON DELETE CASCADE"),
        ("Posts", "content", "TEXT", "NOT NULL body text of post"),
        ("Posts", "media_url", "TEXT", "Optional image attachment path / URL"),
        ("Comments", "comment_id", "INT / SERIAL", "PRIMARY KEY AUTO_INCREMENT"),
        ("Comments", "post_id", "INT", "NOT NULL, FK -> Posts ON DELETE CASCADE"),
        ("Comments", "user_id", "INT", "NOT NULL, FK -> Users ON DELETE CASCADE"),
        ("Likes", "like_id", "INT / SERIAL", "PRIMARY KEY AUTO_INCREMENT"),
        ("Likes", "post_id, user_id", "INT, INT", "FKs with UNIQUE(post_id, user_id)"),
        ("Followers", "follower_id", "INT", "FK -> Users, CHECK(follower <> following)"),
        ("Followers", "following_id", "INT", "FK -> Users, UNIQUE(follower, following)")
    ]

    for row_idx, (tbl, attr, dtype, desc) in enumerate(spec_data):
        row = table_spec.add_row()
        bg = "F8FAFC" if row_idx % 2 == 0 else "FFFFFF"
        for i, val in enumerate([tbl, attr, dtype, desc]):
            c = row.cells[i]
            c.text = val
            c.paragraphs[0].runs[0].font.size = Pt(9.5)
            set_cell_background(c, bg)
            set_cell_margins(c, 80, 80, 120, 120)

    # =========================================================================
    # 8. NORMALIZATION
    # =========================================================================
    add_h1("8. Normalization (1NF, 2NF, 3NF & BCNF)")
    add_p(
        "Normalization is the mathematical discipline of designing relational database schemas to eliminate data "
        "redundancy and prevent Insertion, Update, and Deletion anomalies. ConnectSphere was subjected to rigorous decomposition:"
    )
    add_h2("8.1 First Normal Form (1NF)")
    add_p(
        "A relation is in 1NF if and only if all attribute values are atomic and there are no repeating groups. In an "
        "unnormalized social schema, likes and comments might be stored as comma-delimited strings within the Posts row "
        "(e.g., likes: '1,2,5'). ConnectSphere decomposes all repeating collections into separate relational entities "
        "(Comments, Likes, Followers). Every attribute holds strictly atomic scalar values."
    )
    add_h2("8.2 Second Normal Form (2NF)")
    add_p(
        "A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key "
        "(no partial dependencies). In composite relations such as Likes and Followers, candidate keys are composite: "
        "(post_id, user_id) and (follower_id, following_id). Attributes such as liked_at and followed_at depend on the entire pair, "
        "not a single component. User profile fields (username, avatar) are maintained strictly in Users, eliminating partial dependencies."
    )
    add_h2("8.3 Third Normal Form (3NF)")
    add_p(
        "A relation is in 3NF if it is in 2NF and no non-prime attribute is transitively dependent on the primary key (no X -> Y -> Z). "
        "In Posts, we store user_id. We omit author_username and author_avatar, because storing username in Posts would introduce "
        "the transitive dependency: post_id -> user_id -> username. If an author updated their username, an unnormalized database "
        "would require updating millions of post rows (Update Anomaly). In ConnectSphere, username resides exclusively in Users, "
        "achieving strict 3NF compliance."
    )
    add_h2("8.4 Boyce-Codd Normal Form (BCNF)")
    add_p(
        "A relation is in BCNF if for every non-trivial functional dependency X -> Y, X is a superkey. In all five ConnectSphere "
        "relations, every determinant is a candidate superkey (user_id, post_id, comment_id, (post_id, user_id), (follower_id, following_id)). "
        "Hence, ConnectSphere is mathematically proven to be in BCNF."
    )

    # =========================================================================
    # 9. SQL IMPLEMENTATION (DDL, DML, DQL, TCL, DCL)
    # =========================================================================
    add_h1("9. SQL Implementation (DDL, DML, DQL, TCL, DCL)")
    add_h2("9.1 Data Definition Language (DDL)")
    add_p("The following DDL statements create the database schema with relational integrity and cascade rules:")
    add_code(
"""-- DDL: Base Table Creation
CREATE TABLE Users (
    user_id    INT            PRIMARY KEY AUTO_INCREMENT,
    username   VARCHAR(50)    UNIQUE NOT NULL,
    email      VARCHAR(100)   UNIQUE NOT NULL,
    bio        TEXT,
    avatar     VARCHAR(255)   DEFAULT '👤',
    is_admin   BOOLEAN        DEFAULT FALSE,
    created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Posts (
    post_id    INT            PRIMARY KEY AUTO_INCREMENT,
    user_id    INT            NOT NULL,
    content    TEXT           NOT NULL,
    media_url  TEXT           DEFAULT NULL,
    file_name  VARCHAR(255)   DEFAULT NULL,
    file_type  VARCHAR(100)   DEFAULT NULL,
    created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_posts_user (user_id),
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Comments (
    comment_id   INT          PRIMARY KEY AUTO_INCREMENT,
    post_id      INT          NOT NULL,
    user_id      INT          NOT NULL,
    comment_text TEXT         NOT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Likes (
    like_id  INT              PRIMARY KEY AUTO_INCREMENT,
    post_id  INT              NOT NULL,
    user_id  INT              NOT NULL,
    liked_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_likes_post_user (post_id, user_id),
    CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Followers (
    id           INT          PRIMARY KEY AUTO_INCREMENT,
    follower_id  INT          NOT NULL,
    following_id INT          NOT NULL,
    followed_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_follower_pair (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id),
    CONSTRAINT fk_followers_follower  FOREIGN KEY (follower_id)  REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_followers_following FOREIGN KEY (following_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"""
    )

    add_h2("9.2 Data Manipulation Language (DML)")
    add_p("Representative DML insert and delete statements utilized by the platform:")
    add_code(
"""-- DML: Insert User Tuple
INSERT INTO Users (username, email, bio, avatar, is_admin)
VALUES ('priya_travels', 'priya@example.com', 'Travel blogger in Bali!', '🌍', FALSE);

-- DML: Publishing a Multimedia Post
INSERT INTO Posts (user_id, content, media_url, file_name, file_type)
VALUES (2, 'Sunset at Tanah Lot temple in Bali! 🌅', 'https://images.unsplash.com/photo-1537996194471', 'bali.jpg', 'image/jpeg');

-- DML: Cascading Deletion
DELETE FROM Posts WHERE post_id = 4;"""
    )

    add_h2("9.3 Data Query Language (DQL)")
    add_p("Dynamic projection and selection with correlated subqueries:")
    add_code(
"""SELECT u.user_id, u.username, u.email,
       (SELECT COUNT(*) FROM Followers WHERE following_id = u.user_id) AS follower_count,
       (SELECT COUNT(*) FROM Posts     WHERE user_id      = u.user_id) AS post_count
FROM Users u WHERE u.user_id = 1;"""
    )

    add_h2("9.4 Transaction Control Language (TCL)")
    add_p("ACID transaction management for multi-statement atomic operations:")
    add_code(
"""START TRANSACTION;
INSERT INTO Followers (follower_id, following_id) VALUES (1, 3);
SAVEPOINT follow_created;
COMMIT;"""
    )

    add_h2("9.5 Data Control Language (DCL)")
    add_p("Security and privilege grant commands for least-privilege database access:")
    add_code(
"""CREATE USER 'connectsphere_app'@'localhost' IDENTIFIED BY 'dbms_secure_pass';
GRANT SELECT, INSERT, UPDATE, DELETE ON connectsphere.* TO 'connectsphere_app'@'localhost';
FLUSH PRIVILEGES;"""
    )

    # =========================================================================
    # 10. 20 SQL QUERIES WITH EXPLANATIONS AND OUTPUTS
    # =========================================================================
    add_h1("10. Minimum 15–20 SQL Queries with Explanations and Outputs")
    add_p("The following 20 SQL queries are implemented and executable in ConnectSphere:")

    queries = [
        ("Query 1: User Directory Projection",
         "SELECT user_id, username, email, bio, avatar, (LOWER(username) = 'admin' OR is_admin IS TRUE) AS is_admin\nFROM Users ORDER BY created_at DESC;",
         "Selection and projection of registered accounts with boolean admin status flag.",
         "Returns 5 rows (aarav_tech, priya_travels, rohan_fitness, neha_art, admin)."),

        ("Query 2: Correlated Profile Counters",
         "SELECT u.user_id, u.username, u.email,\n       (SELECT COUNT(*) FROM Followers WHERE following_id = u.user_id) AS follower_count,\n       (SELECT COUNT(*) FROM Followers WHERE follower_id = u.user_id) AS following_count,\n       (SELECT COUNT(*) FROM Posts WHERE user_id = u.user_id) AS post_count\nFROM Users u WHERE u.user_id = 1;",
         "Correlated subqueries dynamically computing relational counters for a profile view.",
         "Returns 1 row: [user_id: 1, username: aarav_tech, follower_count: 1, following_count: 2, post_count: 1]."),

        ("Query 3: Multi-Table Joined Newsfeed",
         "SELECT p.post_id, p.content, p.media_url, u.username, u.avatar,\n       (SELECT COUNT(*) FROM Likes WHERE post_id = p.post_id) AS like_count,\n       (SELECT COUNT(*) FROM Comments WHERE post_id = p.post_id) AS comment_count\nFROM Posts p JOIN Users u ON p.user_id = u.user_id\nORDER BY p.created_at DESC LIMIT 10;",
         "Multi-table INNER JOIN connecting posts with author credentials and real-time interaction counts.",
         "Returns timeline posts ordered chronologically with computed like and comment metrics."),

        ("Query 4: Viewer-Contextualized Feed (Liked and Following Booleans)",
         "SELECT p.post_id, p.content, u.username,\n       (SELECT COUNT(*) FROM Likes WHERE post_id = p.post_id AND user_id = 1) > 0 AS liked_by_user,\n       (SELECT COUNT(*) FROM Followers WHERE follower_id = 1 AND following_id = p.user_id) > 0 AS is_following\nFROM Posts p JOIN Users u ON p.user_id = u.user_id ORDER BY p.created_at DESC;",
         "Evaluates parameterized boolean expressions for viewer interaction states.",
         "Returns post rows with 1/0 flags for liked_by_user and is_following."),

        ("Query 5: Subquery Network Feed ('Following' Tab)",
         "SELECT p.post_id, p.content, u.username, p.created_at\nFROM Posts p JOIN Users u ON p.user_id = u.user_id\nWHERE p.user_id IN (SELECT following_id FROM Followers WHERE follower_id = 1)\nORDER BY p.created_at DESC;",
         "Subquery in WHERE clause with IN operator filtering posts strictly to followed creators.",
         "Returns 2 posts authored by priya_travels and rohan_fitness."),

        ("Query 6: Top Liked Posts Leaderboard (LEFT JOIN + GROUP BY)",
         "SELECT p.post_id, p.content, u.username, COUNT(l.like_id) AS total_likes\nFROM Posts p JOIN Users u ON p.user_id = u.user_id\nLEFT JOIN Likes l ON p.post_id = l.post_id\nGROUP BY p.post_id, p.content, u.username\nORDER BY total_likes DESC LIMIT 5;",
         "LEFT OUTER JOIN retaining posts with zero likes while aggregating total likes per post.",
         "Returns leaderboard of top posts sorted by total_likes descending."),

        ("Query 7: Most Followed Users (Influence Leaderboard)",
         "SELECT u.user_id, u.username, u.bio,\n       (SELECT COUNT(*) FROM Followers WHERE following_id = u.user_id) AS follower_count\nFROM Users u ORDER BY follower_count DESC LIMIT 5;",
         "Derived subquery aggregation ranking creators by community follower count.",
         "Returns top creators ranked by community influence."),

        ("Query 8: Threaded Comments Retrieval",
         "SELECT c.comment_id, c.comment_text, c.created_at, u.username, u.avatar\nFROM Comments c JOIN Users u ON c.user_id = u.user_id\nWHERE c.post_id = 1 ORDER BY c.created_at ASC;",
         "Two-table INNER JOIN retrieving comment threads chronologically.",
         "Returns all comments under post 1 with author details."),

        ("Query 9: User Engagement Summary Matrix",
         "SELECT u.user_id, u.username,\n       (SELECT COUNT(*) FROM Posts WHERE user_id = u.user_id) AS posts_count,\n       (SELECT COUNT(*) FROM Likes WHERE user_id = u.user_id) AS likes_given,\n       (SELECT COUNT(*) FROM Comments WHERE user_id = u.user_id) AS comments_made\nFROM Users u ORDER BY posts_count DESC;",
         "Analytical summary matrix aggregating posts created, likes given, and comments authored.",
         "Returns complete user activity distribution matrix."),

        ("Query 10: Like Existence Verification",
         "SELECT like_id FROM Likes WHERE post_id = 1 AND user_id = 2;",
         "Key existence check prior to executing like/unlike toggle.",
         "Returns like_id = 1 if user 2 has liked post 1."),

        ("Query 11: Idempotent Like Deletion (Unlike)",
         "DELETE FROM Likes WHERE post_id = 1 AND user_id = 2;",
         "Conditioned DML removal of like interaction.",
         "Query OK, 1 row affected."),

        ("Query 12: Mutual Follower Detection (Graph Self-Join)",
         "SELECT f1.follower_id AS user_a, f1.following_id AS user_b, u1.username AS user_a_name, u2.username AS user_b_name\nFROM Followers f1\nJOIN Followers f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id\nJOIN Users u1 ON f1.follower_id = u1.user_id\nJOIN Users u2 ON f1.following_id = u2.user_id\nWHERE f1.follower_id < f1.following_id;",
         "Relational Self-Join on Followers discovering bidirectional friendships.",
         "Identifies mutual friendship: [user_a: aarav_tech, user_b: priya_travels]."),

        ("Query 13: Posts with Zero Comments (Anti-Join Pattern)",
         "SELECT p.post_id, p.content, u.username\nFROM Posts p JOIN Users u ON p.user_id = u.user_id\nLEFT JOIN Comments c ON p.post_id = c.post_id\nWHERE c.comment_id IS NULL;",
         "LEFT OUTER JOIN with IS NULL filter identifying posts without community comments.",
         "Returns un-commented post by rohan_fitness."),

        ("Query 14: Authors with Above-Average Post Activity",
         "SELECT u.username, COUNT(p.post_id) AS total_posts\nFROM Users u JOIN Posts p ON u.user_id = p.user_id\nGROUP BY u.user_id, u.username\nHAVING COUNT(p.post_id) > (SELECT COUNT(*) * 1.0 / COUNT(DISTINCT user_id) FROM Posts);",
         "HAVING clause paired with nested aggregate subquery filtering high-volume creators.",
         "Returns creators exceeding platform average post volume (aarav_tech)."),

        ("Query 15: Cascade Deletion Verification",
         "DELETE FROM Users WHERE user_id = 4;\nSELECT COUNT(*) AS remaining_posts FROM Posts WHERE user_id = 4;",
         "Demonstrates ON DELETE CASCADE automatically deleting child rows in Posts.",
         "remaining_posts = 0."),

        ("Query 16: Check Constraint Violation (Self-Follow)",
         "INSERT INTO Followers (follower_id, following_id) VALUES (2, 2);",
         "Verifies database-level domain constraint CHECK (follower_id <> following_id).",
         "ERROR 3819 (HY000): Check constraint 'chk_no_self_follow' is violated."),

        ("Query 17: Unique Constraint Violation (Duplicate Like)",
         "INSERT INTO Likes (post_id, user_id) VALUES (1, 3);",
         "Composite candidate key constraint UNIQUE(post_id, user_id) preventing duplicate likes.",
         "ERROR 1062 (23000): Duplicate entry '1-3' for key 'Likes.uq_likes_post_user'."),

        ("Query 18: Multimedia Content Type Distribution",
         "SELECT COALESCE(file_type, 'Text Only') AS content_type, COUNT(*) AS total_posts\nFROM Posts GROUP BY file_type;",
         "GROUP BY and COALESCE categorizing post media types.",
         "Returns breakdown: 3 Text Only, 1 image/jpeg."),

        ("Query 19: Second-Degree Follower Recommendations ('People You May Know')",
         "SELECT DISTINCT f2.following_id AS recommended_user_id, u.username\nFROM Followers f1\nJOIN Followers f2 ON f1.following_id = f2.follower_id\nJOIN Users u ON f2.following_id = u.user_id\nWHERE f1.follower_id = 1 AND f2.following_id <> 1\n  AND f2.following_id NOT IN (SELECT following_id FROM Followers WHERE follower_id = 1);",
         "Graph traversal finding friends-of-friends excluding existing follower links.",
         "Recommends user neha_art to user 1."),

        ("Query 20: Database Schema Metadata Extraction",
         "SELECT table_name, engine, table_rows, data_length, index_length\nFROM information_schema.tables WHERE table_schema = 'connectsphere';",
         "System catalog metadata query extracting storage engine parameters and table row metrics.",
         "Returns engine type (InnoDB) and storage statistics for all five tables.")
    ]

    for title, sql, explanation, output in queries:
        add_h2(title)
        add_code(sql)
        add_bullet("Explanation: ", explanation)
        add_bullet("Output: ", output)

    # =========================================================================
    # 11. CONSTRAINTS, JOINS, SUBQUERIES AND AGGREGATE FUNCTIONS
    # =========================================================================
    add_h1("11. Constraints, Joins, Subqueries and Aggregate Functions")
    add_h2("11.1 Integrity Constraints Analysis")
    add_p(
        "ConnectSphere relies on database-level constraints to guarantee consistency: (a) PRIMARY KEY auto-increments "
        "enforce unique tuple identity; (b) FOREIGN KEY constraints with ON DELETE CASCADE ensure that when a user or post is "
        "deleted, all child comments, likes, and follower links are purged automatically; (c) CHECK constraints prevent invalid self-follows; "
        "and (d) Composite UNIQUE constraints prohibit redundant like interactions."
    )
    add_h2("11.2 Relational Join Operations")
    add_p(
        "The system utilizes INNER JOINs to link posts and comments with author details, LEFT OUTER JOINs to preserve posts "
        "with zero likes in leaderboard views, and SELF JOINs across the social graph to discover bidirectional friendships and recommendations."
    )
    add_h2("11.3 Correlated Subqueries & Nested Invocations")
    add_p(
        "Scalar correlated subqueries dynamically evaluate engagement counts for each post and user row without requiring denormalized "
        "counter columns in the storage tables."
    )
    add_h2("11.4 Aggregate Grouping Operations")
    add_p(
        "Using COUNT, MAX, COALESCE, and GROUP BY, high-volume interaction tuples are aggregated into real-time metrics, while HAVING "
        "clauses filter aggregated cohorts based on platform-wide averages."
    )

    # =========================================================================
    # 12. SCREENSHOTS OF EXECUTION
    # =========================================================================
    add_h1("12. Screenshots of Execution")
    add_p("The following screenshots illustrate the live application deployed at https://connectspheredbms.netlify.app:")
    
    add_figure('screenshot1_auth_clean.png', 'Figure 2: User Authentication View with Real-Time DQL Query Inspection Card')
    add_figure('screenshot2_feed_clean.png', 'Figure 3: Live Feed with SQL DML Execution Banner & Foreign Key Cascading Annotations')
    add_figure('screenshot3_profile_clean.png', 'Figure 4: User Profile View Displaying Correlated Subquery Aggregates (Followers & Posts)')
    add_figure('screenshot4_main_ui_clean.png', 'Figure 5: ConnectSphere Complete Application Interface with Test Account Switcher')

    # =========================================================================
    # 13. CONCLUSION
    # =========================================================================
    add_h1("13. Conclusion")
    add_p(
        "The ConnectSphere DBMS project demonstrates how foundational relational database principles can be seamlessly integrated "
        "into a modern web application. By enforcing strict 3NF normalization, foreign key cascade actions, domain constraints, "
        "and dual MySQL/PostgreSQL compatibility, the platform achieves 100% data integrity with zero orphaned records. Furthermore, "
        "by exposing the underlying SQL statements executed by every web transaction in real-time, the platform transforms a traditional "
        "black-box application into an interactive educational learning tool."
    )

    # =========================================================================
    # 14. FUTURE SCOPE
    # =========================================================================
    add_h1("14. Future Scope")
    add_bullet("1. Inverted Index Full-Text Search: ", "Implement MySQL FULLTEXT indexes and PostgreSQL tsvector/tsquery for high-speed content search.")
    add_bullet("2. Read/Write Connection Splitting: ", "Integrate database proxies to route timeline reads across read replicas while directing writes to a primary master.")
    add_bullet("3. Database Triggers & Stored Procedures: ", "Shift validation logic into server-side stored procedures (DELIMITER //) and triggers.")
    add_bullet("4. Real-Time Telemetry over WebSockets: ", "Stream live SQL query execution logs to external administrative monitors.")

    # =========================================================================
    # 15. REFERENCES & RESEARCH SOURCES
    # =========================================================================
    add_h1("15. References & Research Sources")
    add_p("1. Silberschatz, A., Korth, H. F., & Sudarshan, S. (2020). Database System Concepts (7th ed.). McGraw-Hill Education.")
    add_p("2. Elmasri, R., & Navathe, S. B. (2017). Fundamentals of Database Systems (7th ed.). Pearson.")
    add_p("3. Codd, E. F. (1970). A Relational Model of Data for Large Shared Data Banks. Communications of the ACM, 13(6), 377–387.")
    add_p("4. Date, C. J. (2003). An Introduction to Database Systems (8th ed.). Addison-Wesley.")
    add_p("5. MySQL 8.0 Reference Manual. (2026). InnoDB Storage Engine Architecture. Oracle Corporation.")
    add_p("6. PostgreSQL Global Development Group. (2026). PostgreSQL 16 Documentation: Concurrency Control and Indexes.")

    out_docx = 'ConnectSphere_DBMS_Project_Report.docx'
    doc.save(out_docx)
    print(f"DOCX report saved: {out_docx}")

    out_pdf = 'ConnectSphere_DBMS_Project_Report.pdf'
    print("Converting DOCX to PDF...")
    convert(out_docx, out_pdf)
    print(f"PDF report generated: {out_pdf}")

    # Determine exact page numbers of each section from the generated PDF
    try:
        reader = pypdf.PdfReader(out_pdf)
        print(f"Total pages in PDF: {len(reader.pages)}")
        sec_targets = {
            1: "1. Abstract",
            2: "2. Introduction",
            3: "3. Problem Statement and Objectives",
            4: "4. Scope of the Project",
            5: "5. Requirement Analysis",
            6: "6. Entity-Relationship (ER) Diagram",
            7: "7. Relational Schema / Database Design",
            8: "8. Normalization (1NF, 2NF, 3NF & BCNF)",
            9: "9. SQL Implementation (DDL, DML, DQL, TCL, DCL)",
            10: "10. Minimum 15–20 SQL Queries with Explanations and Outputs",
            11: "11. Constraints, Joins, Subqueries and Aggregate Functions",
            12: "12. Screenshots of Execution",
            13: "13. Conclusion",
            14: "14. Future Scope",
            15: "15. References & Research Sources"
        }
        detected_pages = {}
        for num, title in sec_targets.items():
            for idx, page in enumerate(reader.pages):
                text = page.extract_text()
                if title in text:
                    detected_pages[num] = str(idx + 1)
                    break
        print("Detected exact section pages:", detected_pages)
        return detected_pages
    except Exception as e:
        print("Could not parse page numbers:", e)
        return None

if __name__ == '__main__':
    # Pass 1: Build document and detect page numbers
    detected = build_report()
    if detected:
        # Pass 2: Re-build document with 100% exact page numbers in Table of Contents
        print("\nRe-building report with exact page numbers in Index table...")
        build_report(page_map=detected)
        print("Final DOCX and PDF generated with verified exact page numbers!")
