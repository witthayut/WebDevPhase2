const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();
const port = Number(process.env.PORT || 5000);

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
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

// Simple test route for debugging
app.get("/test/:id", (req, res) => {
  res.json({ id: req.params.id, message: "Test route works!" });
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
function createLogId() {
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `L${randomPart}`;
}

// Admin authentication route
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required"
    });
  }

  try {
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

    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

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

// User authentication route
app.post("/api/user/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required"
    });
  }

  try {
    const [rows] = await db.query(
        `SELECT username, fname, lname, email, password, stuDOB, stuAddress
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
        email: user.email,
        dateOfBirth: user.stuDOB,
        address: user.stuAddress
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

// User registration route
app.post("/api/user/register", async (req, res) => {
  const { firstName, lastName, username, dateOfBirth, email, address, password, passwordConfirm } = req.body;

  if (!firstName || !lastName || !username || !dateOfBirth || !email || !address || !password || !passwordConfirm) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  try {
    const [existingUser] = await db.query(
        "SELECT username FROM userinfo WHERE username = ? OR email = ?",
        [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists"
      });
    }

    await db.query(
        `INSERT INTO userinfo (username, fname, lname, stuDOB, email, stuAddress, password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [username, firstName, lastName, dateOfBirth, email, address, password]
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        username: username,
        firstName: firstName,
        lastName: lastName,
        email: email
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

// User update/edit route
app.put("/api/user/update", async (req, res) => {
  const { username, firstName, lastName, dateOfBirth, email, address, password } = req.body;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username is required"
    });
  }

  try {
    const [userExists] = await db.query(
        "SELECT username FROM userinfo WHERE username = ?",
        [username]
    );

    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const updates = [];
    const params = [];

    if (firstName) { updates.push("fname = ?"); params.push(firstName); }
    if (lastName)  { updates.push("lname = ?"); params.push(lastName); }
    if (dateOfBirth){ updates.push("stuDOB = ?"); params.push(dateOfBirth); }
    if (email)     { updates.push("email = ?"); params.push(email); }
    if (address)   { updates.push("stuAddress = ?"); params.push(address); }
    if (password)  { updates.push("password = ?"); params.push(password); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }

    params.push(username);
    const query = `UPDATE userinfo SET ${updates.join(", ")} WHERE username = ?`;
    await db.query(query, params);

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully"
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
app.get("/api/courses/search", async (req, res) => {
  const { q = "", category = "", rating = "", price = "all" } = req.query;

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

// GET /api/courses/categories
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

// ── ADMIN COURSE MANAGEMENT ROUTES ─────────────────────────────────────────

// Helper: generate a new course ID like C00011
async function generateCourseId() {
  const [rows] = await db.query(
    "SELECT idCourse FROM onlinecourse ORDER BY idCourse DESC LIMIT 1"
  );
  if (rows.length === 0) return "C00001";
  const last = rows[0].idCourse; // e.g. "C00010"
  const num = parseInt(last.replace(/\D/g, ""), 10);
  return "C" + String(num + 1).padStart(5, "0");
}

// GET /api/admin/courses — list all courses for admin panel
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

// POST /api/admin/courses — add a new course
app.post("/api/admin/courses", async (req, res) => {
  const {
    nameCourse, instructorName, price, releaseDate,
    rating, description, chapterCovered, imageOfSubject,
    subjectCategory, perfectFor
  } = req.body;

  // Required field validation
  if (!nameCourse || !instructorName || price === undefined || !releaseDate ||
      !description || !chapterCovered || !subjectCategory || !perfectFor) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be filled"
    });
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

    // Log the modify action
    await db.query(
      "INSERT INTO `modify` (Operation, ModiDate) VALUES ('Add', CURDATE())"
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      idCourse
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "Image URL must be unique" });
    }
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// PUT /api/admin/courses/:id — edit an existing course
app.put("/api/admin/courses/:id", async (req, res) => {
  const { id } = req.params;
  const {
    nameCourse, instructorName, price, releaseDate,
    rating, description, chapterCovered, imageOfSubject,
    subjectCategory, perfectFor
  } = req.body;

  try {
    const [existing] = await db.query(
      "SELECT idCourse FROM onlinecourse WHERE idCourse = ?", [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const updates = [];
    const params = [];

    if (nameCourse)     { updates.push("nameCourse = ?");     params.push(nameCourse); }
    if (instructorName) { updates.push("instructorName = ?"); params.push(instructorName); }
    if (price !== undefined) { updates.push("price = ?");    params.push(parseInt(price)); }
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

    // Log the modify action
    await db.query(
      "INSERT INTO `modify` (Operation, ModiDate) VALUES ('Edit', CURDATE())"
    );

    return res.status(200).json({ success: true, message: "Course updated successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "Image URL must be unique" });
    }
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// DELETE /api/admin/courses/:id — remove a course
app.delete("/api/admin/courses/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query(
      "SELECT idCourse FROM onlinecourse WHERE idCourse = ?", [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    await db.query("DELETE FROM onlinecourse WHERE idCourse = ?", [id]);

    // Log the modify action
    await db.query(
      "INSERT INTO `modify` (Operation, ModiDate) VALUES ('Delete', CURDATE())"
    );

    return res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// GET /api/courses/:id — single course (must be LAST)
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
