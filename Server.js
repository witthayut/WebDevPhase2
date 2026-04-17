const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

// for test is it can connect to the database and run a simple query
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS test");
    res.json({
      message: "Database connected successfully",
      result: rows
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message
    });
  }
});

// Build a short login-log ID like L123456.
// This fits the VARCHAR(6) shape you showed for adminlog.IDlist.
function createLogId() {
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `L${randomPart}`;
}

// Admin authentication route for Website/admin-login.html.
// The page currently collects:
// - adminUser
// - adminPwd
//
// This API accepts:
// {
//   "username": "...",
//   "password": "..."
// }
//
// "username" can be either:
// - admin email, for example alice.wong@webdev.com
// - admin ID, for example 100001
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required"
    });
  }

  try {
    // Find the admin by either email or adminID.
    // CAST(adminID AS CHAR) lets us compare numeric adminID to a text input field.
    const [rows] = await db.query(
        `SELECT adminID, fname, lname, email, password, role
       FROM adminidinfo
       WHERE email = ? OR CAST(adminID AS CHAR) = ?`,
        [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const admin = rows[0];

    // For this class project the password is compared as plain text
    // because your table currently stores plain text passwords.
    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    // Write one login record into adminlog after successful authentication.
    // A short retry loop helps avoid a duplicate key if a random ID collides.
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
        // Duplicate entry means the generated ID already exists.
        // In that case we generate a new one and try again.
        if (error.code !== "ER_DUP_ENTRY") {
          throw error;
        }
      }

      attempts += 1;
    }

    if (!logSaved) {
      return res.status(500).json({
        success: false,
        message: "Login succeeded but log entry could not be created"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      admin: {
        adminID: admin.adminID,
        firstName: admin.fname,
        lastName: admin.lname,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// User authentication route for Website/login.html.
// This route checks userinfo only and does not create any log record.
app.post("/api/user/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required"
    });
  }

  try {
    // Allow the user to sign in with either username or email.
    const [rows] = await db.query(
        `SELECT username, fname, lname, email, password
       FROM userinfo
       WHERE username = ? OR email = ?`,
        [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const user = rows[0];

    // Plain-text comparison matches the current database design.
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    return res.status(200).json({
      success: true,
      message: "User login successful",
      user: {
        username: user.username,
        firstName: user.fname,
        lastName: user.lname,
        email: user.email
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// ── SEARCH COURSES API ──────────────────────────────────────────────────────
// GET /api/courses/search
//
// Query parameters (all optional):
//   q        – keyword matched against nameCourse and description
//   category – exact match on subjectCategory  (e.g. "WebDev", "Coding")
//   rating   – minimum rating  (e.g. 4  → returns 4.0 and above)
//   price    – "free" | "paid" | "all"  (default: "all")
//
// Returns an array of matching course objects.
app.get("/api/courses/search", async (req, res) => {
  const { q = "", category = "", rating = "", price = "all" } = req.query;

  // Build WHERE clauses dynamically so we only JOIN conditions the user sent.
  const conditions = [];
  const params = [];

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
              rating, description, subjectCategory, imageOfSubject, perfectFor
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

// GET /api/courses/categories
// Returns the distinct list of subjectCategory values for the filter dropdown.
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});