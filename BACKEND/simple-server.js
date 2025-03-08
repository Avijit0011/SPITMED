const express = require("express")
const mysql = require("mysql")
const cors = require("cors")
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt")

const app = express()
const port = 5000

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

// Create users table if it doesn't exist
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

// Simple registration endpoint
app.post("/api/register", async (req, res) => {
  const { name, age, email, phone, password } = req.body

  console.log("Received registration request:", { name, age, email, phone })

  if (!name || !age || !email || !phone || !password) {
    return res.status(400).json({ message: "Missing required fields" })
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log("Password hashed successfully")

    const query = `
      INSERT INTO users (name, age, email, phone, password)
      VALUES (?, ?, ?, ?, ?)
    `

    db.query(query, [name, age, email, phone, hashedPassword], (err, result) => {
      if (err) {
        console.error("Error registering user:", err)

        // Check for duplicate entry error
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Email or phone number already exists" })
        }

        return res.status(500).json({ message: `Error registering user: ${err.message}` })
      }

      console.log("User registered successfully with ID:", result.insertId)

      res.status(200).json({
        message: "User registered successfully",
        userId: result.insertId,
      })
    })
  } catch (error) {
    console.error("Error hashing password:", error)
    return res.status(500).json({ message: `Error hashing password: ${error.message}` })
  }
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).send("Server is healthy")
})

// Start the server
app.listen(port, () => {
  console.log(`Simple server is running on http://localhost:${port}`)
  console.log(`Try accessing http://localhost:${port}/api/health to verify the server is reachable`)
})

