const express = require("express");
const cors    = require("cors");
require("dotenv").config();

// Import the database connection pool
const db = require("./db");

const app  = express();
const port = Number(process.env.PORT || 5000);

// ── Middleware ────────────────────────────────────────────────────────────────
// Allow requests from both Live Server and common dev-server origins
app.use(cors({
  origin: [
    "http://localhost:63342",
    "http://127.0.0.1:63342",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://localhost:8080",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json()); // Parse JSON request bodies

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Server is running");
});

// ── DB connectivity test ──────────────────────────────────────────────────────
// Testing DB connection
// method: GET
// URL: http://localhost:5000/test-db
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS test");
    res.json({ message: "Database connected successfully", result: rows });
  } catch (error) {
    res.status(500).json({ message: "Database connection failed", error: error.message });
  }
});

// ── Helper: generate a unique 5-digit login-log ID like L12345 ────────────────
function createLogId() {
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `L${randomPart}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION SERVICES
// ═════════════════════════════════════════════════════════════════════════════

// ── Test Case 1: Admin login with valid credentials ───────────────────────────
// method: POST
// URL: http://localhost:5000/api/admin/login
// body: raw JSON
// {
//   "username": "admin@smartkids.com",
//   "password": "admin1234"
// }
// expected: 200 OK  { "success": true, "admin": { ... } }

// ── Test Case 2: Admin login with wrong password ──────────────────────────────
// method: POST
// URL: http://localhost:5000/api/admin/login
// body: raw JSON
// {
//   "username": "admin@smartkids.com",
//   "password": "wrongpassword"
// }
// expected: 401 Unauthorized  { "success": false, "message": "Invalid username or password" }

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  // Validate that both fields are present
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  try {
    // Look up admin by email or adminID
    const [rows] = await db.query(
      `SELECT adminID, fname, lname, email, password, role
       FROM adminidinfo
       WHERE email = ? OR CAST(adminID AS CHAR) = ?`,
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const admin = rows[0];

    // Simple password comparison (plain text as per current schema)
    if (admin.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    // Write a login-log entry, retrying on duplicate ID collision
    let logSaved = false;
    let attempts = 0;

    while (!logSaved && attempts < 5) {
      const logId = createLogId();
      try {
        await db.query(
          `INSERT INTO adminlog (IDlist, role, adminID, curTime, password)
           VALUES (?, ?, ?, NOW(), ?)`,
          [logId, admin.role, admin.adminID, admin.password]
        );
        logSaved = true;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;
      }
      attempts += 1;
    }

    if (!logSaved) {
      return res.status(500).json({ success: false, message: "Login succeeded but log entry could not be created" });
    }

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      admin: {
        adminID:   admin.adminID,
        firstName: admin.fname,
        lastName:  admin.lname,
        email:     admin.email,
        role:      admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── Test Case 1: User login with valid credentials ────────────────────────────
// method: POST
// URL: http://localhost:5000/api/user/login
// body: raw JSON
// {
//   "username": "john_doe",
//   "password": "secret123"
// }
// expected: 200 OK  { "success": true, "user": { ... } }

// ── Test Case 2: User login with missing fields ───────────────────────────────
// method: POST
// URL: http://localhost:5000/api/user/login
// body: raw JSON
// {
//   "username": "john_doe",
//   "password": ""
// }
// expected: 400 Bad Request  { "success": false, "message": "Username and password are required" }

app.post("/api/user/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  try {
    // Allow login by username OR email
    const [rows] = await db.query(
      `SELECT username, fname, lname, email, password, stuDOB, stuAddress
       FROM userinfo
       WHERE username = ? OR email = ?`,
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    return res.status(200).json({
      success: true,
      message: "User login successful",
      user: {
        username:    user.username,
        firstName:   user.fname,
        lastName:    user.lname,
        email:       user.email,
        dateOfBirth: user.stuDOB,
        address:     user.stuAddress
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── Test Case 1: Register a new user with all valid fields ────────────────────
// method: POST
// URL: http://localhost:5000/api/user/register
// body: raw JSON
// {
//   "firstName": "Jane",
//   "lastName": "Doe",
//   "username": "jane_doe",
//   "dateOfBirth": "2000-05-15",
//   "email": "jane@example.com",
//   "address": "123 Main St",
//   "password": "pass1234",
//   "passwordConfirm": "pass1234"
// }
// expected: 201 Created  { "success": true, "user": { ... } }

// ── Test Case 2: Register with a duplicate username ───────────────────────────
// method: POST
// URL: http://localhost:5000/api/user/register
// body: raw JSON
// {
//   "firstName": "Jane",
//   "lastName": "Doe",
//   "username": "jane_doe",
//   "dateOfBirth": "2000-05-15",
//   "email": "jane2@example.com",
//   "address": "123 Main St",
//   "password": "pass1234",
//   "passwordConfirm": "pass1234"
// }
// expected: 400 Bad Request  { "success": false, "message": "Username or email already exists" }

app.post("/api/user/register", async (req, res) => {
  const { firstName, lastName, username, dateOfBirth, email, address, password, passwordConfirm } = req.body;

  // All fields are required for registration
  if (!firstName || !lastName || !username || !dateOfBirth || !email || !address || !password || !passwordConfirm) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  try {
    // Check for existing username or email before inserting
    const [existingUser] = await db.query(
      "SELECT username FROM userinfo WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: "Username or email already exists" });
    }

    await db.query(
      `INSERT INTO userinfo (username, fname, lname, stuDOB, email, stuAddress, password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, firstName, lastName, dateOfBirth, email, address, password]
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { username, firstName, lastName, email }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── Test Case 1: Update user profile (first name and email) ──────────────────
// method: PUT
// URL: http://localhost:5000/api/user/update
// body: raw JSON
// {
//   "username": "john_doe",
//   "firstName": "Johnny",
//   "email": "johnny@example.com"
// }
// expected: 200 OK  { "success": true, "message": "User profile updated successfully" }

// ── Test Case 2: Update with a username that does not exist ───────────────────
// method: PUT
// URL: http://localhost:5000/api/user/update
// body: raw JSON
// {
//   "username": "ghost_user",
//   "firstName": "Ghost"
// }
// expected: 404 Not Found  { "success": false, "message": "User not found" }

app.put("/api/user/update", async (req, res) => {
  const { username, firstName, lastName, dateOfBirth, email, address, password } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: "Username is required" });
  }

  try {
    // Confirm the user exists before attempting any update
    const [userExists] = await db.query(
      "SELECT username FROM userinfo WHERE username = ?",
      [username]
    );

    if (userExists.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Build a dynamic SET clause from whichever fields were provided
    const updates = [];
    const params  = [];

    if (firstName)   { updates.push("fname = ?");       params.push(firstName); }
    if (lastName)    { updates.push("lname = ?");       params.push(lastName); }
    if (dateOfBirth) { updates.push("stuDOB = ?");      params.push(dateOfBirth); }
    if (email)       { updates.push("email = ?");       params.push(email); }
    if (address)     { updates.push("stuAddress = ?");  params.push(address); }
    if (password)    { updates.push("password = ?");    params.push(password); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    params.push(username);
    await db.query(`UPDATE userinfo SET ${updates.join(", ")} WHERE username = ?`, params);

    return res.status(200).json({ success: true, message: "User profile updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// COURSE SEARCH SERVICE
// ═════════════════════════════════════════════════════════════════════════════

// ── Test Case 1: Search courses by keyword ────────────────────────────────────
// method: GET
// URL: http://localhost:5000/api/courses/search?q=math
// expected: 200 OK  { "success": true, "total": N, "courses": [ ... ] }

// ── Test Case 2: Search with combined criteria (category + rating + price) ────
// method: GET
// URL: http://localhost:5000/api/courses/search?category=Mathematics&rating=4&price=paid
// expected: 200 OK  { "success": true, "total": N, "courses": [ ... ] }

// ── Test Case 3: No-criteria search (returns all courses) ─────────────────────
// method: GET
// URL: http://localhost:5000/api/courses/search
// expected: 200 OK  { "success": true, "total": N, "courses": [ ... ] }

app.get("/api/courses/search", async (req, res) => {
  // Supported criteria: q (keyword), category, rating (minimum), price (free|paid|all)
  const { q = "", category = "", rating = "", price = "all" } = req.query;

  const conditions = [];
  const params     = [];

  if (q.trim()) {
    conditions.push("(nameCourse LIKE ? OR description LIKE ?)");
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }
  if (category.trim()) {
    conditions.push("subjectCategory = ?");
    params.push(category.trim());
  }
  if (rating !== "" && !isNaN(Number(rating))) {
    conditions.push("rating >= ?");
    params.push(Number(rating));
  }
  if (price === "free") {
    conditions.push("price = 0");
  } else if (price === "paid") {
    conditions.push("price > 0");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [rows] = await db.query(
      `SELECT idCourse, nameCourse, instructorName, price, releaseDate,
              rating, description, chapterCovered, subjectCategory, imageOfSubject, perfectFor
       FROM onlinecourse
       ${where}
       ORDER BY rating DESC`,
      params
    );
    res.json({ success: true, total: rows.length, courses: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── Test Case 1: Fetch all distinct categories ────────────────────────────────
// method: GET
// URL: http://localhost:5000/api/courses/categories
// expected: 200 OK  { "success": true, "categories": ["Mathematics", "Physics", ...] }

// ── Test Case 2: Verify categories list is not empty ─────────────────────────
// method: GET
// URL: http://localhost:5000/api/courses/categories
// expected: 200 OK  { "success": true, "categories": [ <at least one entry> ] }

app.get("/api/courses/categories", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DISTINCT subjectCategory FROM onlinecourse ORDER BY subjectCategory"
    );
    res.json({ success: true, categories: rows.map(r => r.subjectCategory) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN COURSE MANAGEMENT SERVICES
// ═════════════════════════════════════════════════════════════════════════════

// Helper: auto-generate next sequential course ID (e.g. C00011)
async function generateCourseId() {
  const [rows] = await db.query(
    "SELECT idCourse FROM onlinecourse ORDER BY idCourse DESC LIMIT 1"
  );
  if (rows.length === 0) return "C00001";
  const last = rows[0].idCourse;
  const num  = parseInt(last.replace(/\D/g, ""), 10);
  return "C" + String(num + 1).padStart(5, "0");
}

// ── Test Case 1: Get all courses for the admin panel ─────────────────────────
// method: GET
// URL: http://localhost:5000/api/admin/courses
// expected: 200 OK  { "success": true, "total": N, "courses": [ ... ] }

// ── Test Case 2: Verify the response includes required fields ─────────────────
// method: GET
// URL: http://localhost:5000/api/admin/courses
// expected: each course object has idCourse, nameCourse, instructorName, price, rating

app.get("/api/admin/courses", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT idCourse, nameCourse, instructorName, price, releaseDate,
              rating, description, chapterCovered, imageOfSubject,
              subjectCategory, perfectFor
       FROM onlinecourse
       ORDER BY idCourse ASC`
    );
    res.json({ success: true, total: rows.length, courses: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── INSERT SERVICE ────────────────────────────────────────────────────────────

// ── Test Case 1: Insert a valid new course ────────────────────────────────────
// method: POST
// URL: http://localhost:5000/api/admin/courses
// body: raw JSON
// {
//   "nameCourse": "Introduction to Calculus",
//   "instructorName": "Dr. Smith",
//   "price": 1990,
//   "releaseDate": "2025-01-10",
//   "rating": 4.7,
//   "description": "Covers limits, derivatives, and integrals.",
//   "chapterCovered": "Limits, Derivatives, Integrals, Applications",
//   "subjectCategory": "Mathematics",
//   "perfectFor": "High school and university students",
//   "imageOfSubject": null
// }
// expected: 201 Created  { "success": true, "idCourse": "C00011" }

// ── Test Case 2: Insert with missing required field (no nameCourse) ───────────
// method: POST
// URL: http://localhost:5000/api/admin/courses
// body: raw JSON
// {
//   "instructorName": "Dr. Smith",
//   "price": 1990,
//   "releaseDate": "2025-01-10",
//   "description": "Missing course name.",
//   "chapterCovered": "Chapter 1",
//   "subjectCategory": "Mathematics",
//   "perfectFor": "Students"
// }
// expected: 400 Bad Request  { "success": false, "message": "All required fields must be filled" }

app.post("/api/admin/courses", async (req, res) => {
  const {
    nameCourse, instructorName, price, releaseDate,
    rating, description, chapterCovered, imageOfSubject,
    subjectCategory, perfectFor
  } = req.body;

  // Validate all required fields are present
  if (!nameCourse || !instructorName || price === undefined || !releaseDate ||
      !description || !chapterCovered || !subjectCategory || !perfectFor) {
    return res.status(400).json({ success: false, message: "All required fields must be filled" });
  }

  try {
    const idCourse = await generateCourseId();

    await db.query(
      `INSERT INTO onlinecourse
        (idCourse, nameCourse, instructorName, price, releaseDate,
         rating, description, chapterCovered, imageOfSubject, subjectCategory, perfectFor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idCourse, nameCourse, instructorName, parseInt(price), releaseDate,
        rating ? parseFloat(rating) : null,
        description, chapterCovered,
        imageOfSubject || null,
        subjectCategory, perfectFor
      ]
    );

    // Log admin modify action
    await db.query("INSERT INTO `modify` (Operation, ModiDate) VALUES ('Add', CURDATE())");

    return res.status(201).json({ success: true, message: "Course created successfully", idCourse });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "Image URL must be unique" });
    }
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── UPDATE SERVICE ────────────────────────────────────────────────────────────

// ── Test Case 1: Update the price and rating of an existing course ────────────
// method: PUT
// URL: http://localhost:5000/api/admin/courses/C00001
// body: raw JSON
// {
//   "price": 2490,
//   "rating": 4.9
// }
// expected: 200 OK  { "success": true, "message": "Course updated successfully" }

// ── Test Case 2: Update a course that does not exist ─────────────────────────
// method: PUT
// URL: http://localhost:5000/api/admin/courses/C99999
// body: raw JSON
// {
//   "price": 999
// }
// expected: 404 Not Found  { "success": false, "message": "Course not found" }

app.put("/api/admin/courses/:id", async (req, res) => {
  const { id } = req.params;
  const {
    nameCourse, instructorName, price, releaseDate,
    rating, description, chapterCovered, imageOfSubject,
    subjectCategory, perfectFor
  } = req.body;

  try {
    // Confirm the course exists before updating
    const [existing] = await db.query(
      "SELECT idCourse FROM onlinecourse WHERE idCourse = ?", [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Build a dynamic SET clause from the supplied fields
    const updates = [];
    const params  = [];

    if (nameCourse)     { updates.push("nameCourse = ?");     params.push(nameCourse); }
    if (instructorName) { updates.push("instructorName = ?"); params.push(instructorName); }
    if (price !== undefined)  { updates.push("price = ?");    params.push(parseInt(price)); }
    if (releaseDate)    { updates.push("releaseDate = ?");    params.push(releaseDate); }
    if (rating !== undefined && rating !== "") {
                          updates.push("rating = ?");         params.push(parseFloat(rating)); }
    if (description)    { updates.push("description = ?");   params.push(description); }
    if (chapterCovered) { updates.push("chapterCovered = ?");params.push(chapterCovered); }
    if (imageOfSubject !== undefined) {
                          updates.push("imageOfSubject = ?"); params.push(imageOfSubject || null); }
    if (subjectCategory){ updates.push("subjectCategory = ?");params.push(subjectCategory); }
    if (perfectFor)     { updates.push("perfectFor = ?");    params.push(perfectFor); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    params.push(id);
    await db.query(`UPDATE onlinecourse SET ${updates.join(", ")} WHERE idCourse = ?`, params);

    // Log admin modify action
    await db.query("INSERT INTO `modify` (Operation, ModiDate) VALUES ('Edit', CURDATE())");

    return res.status(200).json({ success: true, message: "Course updated successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "Image URL must be unique" });
    }
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── DELETE SERVICE ────────────────────────────────────────────────────────────

// ── Test Case 1: Delete an existing course ────────────────────────────────────
// method: DELETE
// URL: http://localhost:5000/api/admin/courses/C00011
// expected: 200 OK  { "success": true, "message": "Course deleted successfully" }

// ── Test Case 2: Delete a course that does not exist ─────────────────────────
// method: DELETE
// URL: http://localhost:5000/api/admin/courses/C99999
// expected: 404 Not Found  { "success": false, "message": "Course not found" }

app.delete("/api/admin/courses/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Check course exists before deleting
    const [existing] = await db.query(
      "SELECT idCourse FROM onlinecourse WHERE idCourse = ?", [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    await db.query("DELETE FROM onlinecourse WHERE idCourse = ?", [id]);

    // Log admin modify action
    await db.query("INSERT INTO `modify` (Operation, ModiDate) VALUES ('Delete', CURDATE())");

    return res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── SINGLE COURSE DETAIL ──────────────────────────────────────────────────────
// Must be placed AFTER /api/admin/courses to avoid route conflicts

// ── Test Case 1: Get details of an existing course ────────────────────────────
// method: GET
// URL: http://localhost:5000/api/courses/C00001
// expected: 200 OK  { "success": true, "course": { ... } }

// ── Test Case 2: Get details of a non-existent course ────────────────────────
// method: GET
// URL: http://localhost:5000/api/courses/C99999
// expected: 404 Not Found  { "success": false, "message": "Course not found" }

app.get("/api/courses/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT idCourse, nameCourse, instructorName, price, releaseDate,
              rating, description, chapterCovered, imageOfSubject,
              subjectCategory, perfectFor
       FROM onlinecourse
       WHERE idCourse = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.json({ success: true, course: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});