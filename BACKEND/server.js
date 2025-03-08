const express = require("express")
const mysql = require("mysql")
const cors = require("cors")
const bodyParser = require("body-parser")
const jwt = require("jsonwebtoken") // Add this for JWT tokens
const bcrypt = require("bcrypt") // Add this for password hashing

const app = express()
const port = 5000
const JWT_SECRET = "spitmed-secret-key" // In production, use environment variable

// Middleware
app.use(cors())
app.use(bodyParser.json())

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost", // Replace with your MySQL host
  user: "hehe", // Replace with your MySQL username
  password: "AVIjit1", // Replace with your MySQL password
  database: "spitmed", // Replace with your database name
})

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err)
    return
  }
  console.log("Connected to MySQL database")
})

// Create tables if they don't exist
db.query(
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) DEFAULT NULL
  )`,
  (err) => {
    if (err) {
      console.error("Error creating users table:", err)
    } else {
      console.log("Users table created or already exists")
    }
  },
)

db.query(
  `CREATE TABLE IF NOT EXISTS medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicineName VARCHAR(255) NOT NULL,
    medicineTime TIME NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL
  )`,
  (err) => {
    if (err) {
      console.error("Error creating medicines table:", err)
    } else {
      console.log("Medicines table created or already exists")
    }
  },
)

db.query(
  `CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    medicineId INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (medicineId) REFERENCES medicines(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("Error creating reminders table:", err)
    } else {
      console.log("Reminders table created or already exists")
    }
  },
)

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" })
  }
}

// API to register user
app.post("/api/register", async (req, res) => {
  const { name, age, email, phone, password } = req.body

  if (!name || !age || !email || !phone || !password) {
    return res.status(400).json({ message: "Missing required fields" })
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    const query = `
      INSERT INTO users (name, age, email, phone, password)
      VALUES (?, ?, ?, ?, ?)
    `

    db.query(query, [name, age, email, phone, hashedPassword], (err, result) => {
      if (err) {
        console.error("Error registering user:", err.message, err.code)

        // Check for duplicate entry error
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Email or phone number already exists" })
        }

        return res.status(500).json({ message: "Error registering user" })
      }

      // Generate JWT token
      const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: "7d" })

      res.status(200).json({
        message: "User registered successfully",
        userId: result.insertId,
        token,
      })
    })
  } catch (error) {
    console.error("Error hashing password:", error)
    return res.status(500).json({ message: "Error registering user" })
  }
})

// API to login user
// API to login user
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const query = `SELECT * FROM users WHERE email = ?`;

  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Error logging in:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = results[0];

    if (!user.password) {
      return res.status(401).json({ message: "Please register with a password" });
    }

    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      return res.status(200).json({ message: "Login successful", userId: user.id, name: user.name, email: user.email, token });
    } catch (error) {
      console.error("Error comparing password:", error);
      return res.status(500).json({ message: "Error verifying password" });
    }
  });
});

// API to get user profile
app.get("/api/profile", verifyToken, (req, res) => {
  const query = `SELECT id, name, age, email, phone FROM users WHERE id = ?`

  db.query(query, [req.userId], (err, results) => {
    if (err) {
      console.error("Error fetching profile:", err)
      return res.status(500).json({ message: "Error fetching profile" })
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json(results[0])
  })
})

// API to save user info (modified to support existing users)
app.post("/api/saveUser", (req, res) => {
  const { name, age, email, phone, password } = req.body

  if (!name || !age || !email || !phone) {
    return res.status(400).send("Missing required fields")
  }

  // Check if user already exists
  db.query(`SELECT * FROM users WHERE email = ?`, [email], async (err, results) => {
    if (err) {
      console.error("Error checking user:", err)
      return res.status(500).send("Error checking user")
    }

    if (results.length > 0) {
      // User exists, return existing user ID
      const userId = results[0].id

      // Generate JWT token
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })

      return res.status(200).json({
        userId,
        token,
        message: "User already exists",
      })
    }

    // User doesn't exist, create new user
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    const query = `
      INSERT INTO users (name, age, email, phone, password)
      VALUES (?, ?, ?, ?, ?)
    `

    db.query(query, [name, age, email, phone, hashedPassword], (err, result) => {
      if (err) {
        console.error("Error saving user:", err)
        return res.status(500).send("Error saving user")
      }

      // Generate JWT token
      const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: "7d" })

      console.log("User saved successfully")
      res.status(200).json({
        userId: result.insertId,
        token,
      })
    })
  })
})

// API to save medicine info
app.post("/api/saveMedicine", (req, res) => {
  const { medicineName, medicineTime, startDate, endDate } = req.body

  if (!medicineName || !medicineTime || !startDate || !endDate) {
    return res.status(400).send("Missing required fields")
  }

  const query = `
    INSERT INTO medicines (medicineName, medicineTime, startDate, endDate)
    VALUES (?, ?, ?, ?)
  `

  db.query(query, [medicineName, medicineTime, startDate, endDate], (err, result) => {
    if (err) {
      console.error("Error saving medicine:", err)
      return res.status(500).send("Error saving medicine")
    }
    console.log("Medicine saved successfully")
    res.status(200).json({ medicineId: result.insertId })
  })
})

// API to save reminder (link user and medicine)
app.post("/api/saveReminder", (req, res) => {
  const { userId, medicineId } = req.body

  if (!userId || !medicineId) {
    return res.status(400).send("Missing required fields")
  }

  const query = `
    INSERT INTO reminders (userId, medicineId)
    VALUES (?, ?)
  `

  db.query(query, [userId, medicineId], (err, result) => {
    if (err) {
      console.error("Error saving reminder:", err)
      return res.status(500).send("Error saving reminder")
    }
    console.log("Reminder saved successfully")
    res.status(200).send("Reminder saved successfully")
  })
})

// API to fetch upcoming reminders for a specific user
app.get("/api/getUserReminders", verifyToken, (req, res) => {
  const query = `
    SELECT users.name, users.email, medicines.medicineName, medicines.medicineTime, medicines.startDate, medicines.endDate
    FROM reminders
    INNER JOIN users ON reminders.userId = users.id
    INNER JOIN medicines ON reminders.medicineId = medicines.id
    WHERE users.id = ? AND medicines.startDate >= CURDATE()
  `

  db.query(query, [req.userId], (err, results) => {
    if (err) {
      console.error("Error fetching reminders:", err)
      return res.status(500).send("Error fetching reminders")
    }
    res.status(200).json(results)
  })
})

// API to fetch all upcoming reminders (keeping for backward compatibility)
app.get("/api/getReminders", (req, res) => {
  const query = `
    SELECT users.name, users.email, medicines.medicineName, medicines.medicineTime, medicines.startDate, medicines.endDate
    FROM reminders
    INNER JOIN users ON reminders.userId = users.id
    INNER JOIN medicines ON reminders.medicineId = medicines.id
    WHERE medicines.startDate >= CURDATE()
  `

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching reminders:", err)
      return res.status(500).send("Error fetching reminders")
    }
    res.status(200).json(results)
  })
})

// Add a health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).send("Server is healthy")
})

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
  console.log(`Try accessing http://localhost:${port}/api/health to verify the server is reachable`)
})

