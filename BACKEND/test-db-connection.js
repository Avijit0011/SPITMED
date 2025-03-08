const mysql = require("mysql")

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
  console.log("Connected to MySQL database successfully!")

  // Test a simple query
  db.query("SELECT 1 + 1 AS solution", (err, results) => {
    if (err) {
      console.error("Error running test query:", err)
      return
    }
    console.log("Database query test successful. Result:", results[0].solution)

    // Test creating a table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS test_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `

    db.query(createTableQuery, (err) => {
      if (err) {
        console.error("Error creating test table:", err)
        return
      }
      console.log("Test table created successfully!")

      // Test inserting data
      db.query("INSERT INTO test_users (name) VALUES ('Test User')", (err, result) => {
        if (err) {
          console.error("Error inserting test data:", err)
          return
        }
        console.log("Test data inserted successfully! ID:", result.insertId)

        // Close connection
        db.end((err) => {
          if (err) {
            console.error("Error closing connection:", err)
            return
          }
          console.log("Database connection closed.")
        })
      })
    })
  })
})

