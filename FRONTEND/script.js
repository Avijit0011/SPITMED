// Make showPage function globally accessible by attaching it to the window object
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active")
  })
  document.getElementById(pageId).classList.add("active")
}

// Explicitly attach the function to the window object
window.showPage = showPage

document.addEventListener("DOMContentLoaded", () => {
  const backendUrl = "http://localhost:5000" // Replace with your backend URL
  let currentUserId = null // Store the current user ID
  let authToken = null // Store the authentication token

  // Check if user is already logged in
  checkAuthStatus()

  // Check server connection
  checkServerConnection()

  // Handle login form submission
  document.getElementById("loginForm").addEventListener("submit", (event) => {
    event.preventDefault()

    const email = document.getElementById("loginEmail").value
    const password = document.getElementById("loginPassword").value

    // Login user
    fetch(`${backendUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Login successful") {
          // Store user info and token
          currentUserId = data.userId
          authToken = data.token

          // Save to localStorage
          localStorage.setItem("userId", currentUserId)
          localStorage.setItem("authToken", authToken)
          localStorage.setItem("userName", data.name)
          localStorage.setItem("userEmail", data.email)

          // Update UI
          updateAuthUI(true)

          // Load user profile
          loadUserProfile()

          // Show profile page
          showPage("profile")
        } else {
          alert(data.message || "Login failed")
        }
      })
      .catch((error) => {
        console.error("Error logging in:", error)
        alert("Error logging in")
      })
  })

  // Handle register form submission
  document.getElementById("registerForm").addEventListener("submit", (event) => {
    event.preventDefault()

    const name = document.getElementById("name").value
    const age = document.getElementById("age").value
    const email = document.getElementById("email").value
    const phone = document.getElementById("phone").value
    const password = document.getElementById("password").value

    const userData = { name, age, email, phone, password }

    // Register user
    fetch(`${backendUrl}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "User registered successfully") {
          console.log("User registered with ID:", data.userId)

          // Store user info and token
          currentUserId = data.userId
          authToken = data.token

          // Save to localStorage
          localStorage.setItem("userId", currentUserId)
          localStorage.setItem("authToken", authToken)
          localStorage.setItem("userName", name)
          localStorage.setItem("userEmail", email)

          // Update UI
          updateAuthUI(true)

          // Show medicine page
          showPage("medicine")
        } else {
          alert(data.message || "Registration failed")
        }
      })
      .catch((error) => {
        console.error("Error registering user:", error)
        alert("Error registering user")
      })
  })

  // Handle medicine form submission
  document.getElementById("medicineForm").addEventListener("submit", (event) => {
    event.preventDefault()

    // Check if user is logged in
    if (!currentUserId || !authToken) {
      alert("Please login first")
      showPage("login")
      return
    }

    const medicineName = document.getElementById("medicineName").value
    const medicineTime = document.getElementById("medicineTime").value
    const startDate = document.getElementById("startDate").value
    const endDate = document.getElementById("endDate").value

    const medicineData = { medicineName, medicineTime, startDate, endDate }

    // Save medicine info
    fetch(`${backendUrl}/api/saveMedicine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(medicineData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Medicine saved with ID:", data.medicineId)
        // Link user and medicine in reminders table
        const userId = currentUserId
        const medicineId = data.medicineId

        const reminderData = { userId, medicineId }

        fetch(`${backendUrl}/api/saveReminder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(reminderData),
        })
          .then((response) => response.text())
          .then((data) => {
            alert("Reminder set successfully!") // Show success message
            showPage("success")
          })
          .catch((error) => {
            console.error("Error saving reminder:", error)
            alert("Error saving reminder")
          })
      })
      .catch((error) => {
        console.error("Error saving medicine:", error)
        alert("Error saving medicine")
      })
  })

  // Function to display upcoming reminders
  function displayUpcomingReminders() {
    // Check if user is logged in
    if (!authToken) {
      alert("Please login first")
      showPage("login")
      return
    }

    fetch(`${backendUrl}/api/getUserReminders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const upcomingRemindersList = document.getElementById("upcomingRemindersList")
        if (data.length > 0) {
          upcomingRemindersList.innerHTML = data
            .map(
              (reminder) => `
                <div class="reminder-item">
                  <p><strong>Medicine:</strong> ${reminder.medicineName}</p>
                  <p><strong>Time:</strong> ${reminder.medicineTime}</p>
                  <p><strong>Start Date:</strong> ${reminder.startDate}</p>
                  <p><strong>End Date:</strong> ${reminder.endDate}</p>
                </div>
              `,
            )
            .join("")
        } else {
          upcomingRemindersList.innerHTML = "<p>No upcoming reminders.</p>"
        }
        showPage("upcomingReminders")
      })
      .catch((error) => {
        console.error("Error fetching reminders:", error)
        alert("Error fetching reminders")
      })
  }

  // Function to load user profile
function loadUserProfile() {
  if (!authToken) {
    console.warn("No auth token found. User might not be logged in.");
    return;
  }

  fetch(`${backendUrl}/api/profile`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data || !data.name) {
        throw new Error("Invalid profile data received");
      }

      const profileInfo = document.getElementById("profileInfo");
      profileInfo.innerHTML = `
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Age:</strong> ${data.age}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
      `;
    })
    .catch((error) => {
      console.error("Error loading profile:", error);
      document.getElementById("profileInfo").innerHTML = `<p style="color: red;">Failed to load profile. Please try again.</p>`;
    });
}

  // Function to check authentication status
  function checkAuthStatus() {
    const storedToken = localStorage.getItem("authToken")
    const storedUserId = localStorage.getItem("userId")

    if (storedToken && storedUserId) {
      // User is logged in
      authToken = storedToken
      currentUserId = storedUserId

      // Update UI
      updateAuthUI(true)

      // Load user profile
      loadUserProfile()

      // If on home page, redirect to profile
      if (document.querySelector("#home.active")) {
        showPage("profile")
      }
    } else {
      // User is not logged in
      updateAuthUI(false)
    }
  }

  // Function to update UI based on auth status
  function updateAuthUI(isLoggedIn) {
    const loginBtn = document.getElementById("loginBtn")
    const logoutBtn = document.getElementById("logoutBtn")
    const getStartedBtn = document.getElementById("getStartedBtn")

    if (isLoggedIn) {
      loginBtn.style.display = "none"
      logoutBtn.style.display = "block"
      getStartedBtn.textContent = "My Profile"
      getStartedBtn.onclick = () => showPage("profile")
    } else {
      loginBtn.style.display = "block"
      logoutBtn.style.display = "none"
      getStartedBtn.textContent = "Next"
      getStartedBtn.onclick = () => showPage("register")
    }
  }

  // Function to logout
  function logout() {
    // Clear localStorage
    localStorage.removeItem("authToken")
    localStorage.removeItem("userId")
    localStorage.removeItem("userName")
    localStorage.removeItem("userEmail")

    // Reset variables
    authToken = null
    currentUserId = null

    // Update UI
    updateAuthUI(false)

    // Redirect to home
    showPage("home")

    alert("You have been logged out")
  }

  // Make displayUpcomingReminders function globally accessible
  window.displayUpcomingReminders = displayUpcomingReminders

  // Make logout function globally accessible
  window.logout = logout

  // Fix the event listeners for buttons
  document.querySelectorAll(".btn.secondary").forEach((button) => {
    if (button.textContent.trim() === "Upcoming Reminder") {
      button.addEventListener("click", displayUpcomingReminders)
    }
  })

  // Function to check server connection
  function checkServerConnection() {
    fetch(`${backendUrl}/api/health`)
      .then((response) => {
        if (response.ok) {
          console.log("Server connection successful")
        } else {
          throw new Error("Server responded with an error")
        }
      })
      .catch((error) => {
        console.error("Server connection failed:", error)
        alert("Cannot connect to the server. Please make sure the server is running at " + backendUrl)
      })
  }

  // Initialize the page
  showPage("home")
})
// Function to check reminders every minute
function checkReminders() {
  if (!authToken) {
    console.warn("User not logged in, skipping reminder check.");
    return;
  }

  fetch(`${backendUrl}/api/getUserReminders`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
    .then((response) => response.json())
    .then((reminders) => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      reminders.forEach((reminder) => {
        const [reminderHour, reminderMinute] = reminder.medicineTime.split(":").map(Number);

        if (reminderHour === currentHour && reminderMinute === currentMinute) {
          showNotification(reminder.medicineName);
        }
      });
    })
    .catch((error) => console.error("Error fetching reminders:", error));
}

// Function to request notification permission
function requestNotificationPermission() {
  if (Notification.permission !== "granted") {
    Notification.requestPermission().then((permission) => {
      console.log("Notification permission:", permission);
      if (permission === "granted") {
        console.log("Notifications enabled!");
      }
    });
  }
}

// Function to fetch and check reminders
function checkReminders() {
  if (!authToken) {
    console.warn("User not logged in, skipping reminder check.");
    return;
  }

  fetch(`${backendUrl}/api/getUserReminders`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
    .then((response) => response.json())
    .then((reminders) => {
      console.log("Fetched Reminders:", reminders); // Debugging line

      if (!Array.isArray(reminders) || reminders.length === 0) {
        console.warn("No reminders found.");
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      reminders.forEach((reminder) => {
        console.log("Checking reminder:", reminder); // Debugging line

        const [reminderHour, reminderMinute] = reminder.medicineTime.split(":").map(Number);

        if (reminderHour === currentHour && reminderMinute === currentMinute) {
          console.log("MATCH! Sending notification...");
          showNotification(reminder.medicineName);
        }
      });
    })
    .catch((error) => console.error("Error fetching reminders:", error));
}

// Function to show browser notification
// Add this to your existing script.js file

// Request notification permission when the page loads
document.addEventListener("DOMContentLoaded", function() {
  // Check if browser supports notifications
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return;
  }
  
  // Add notification permission request button to the home page
  if (document.getElementById("home") && Notification.permission !== "granted") {
    const permissionButton = document.createElement("button");
    permissionButton.className = "btn primary";
    permissionButton.textContent = "Enable Notifications";
    permissionButton.style.marginTop = "1rem";
    permissionButton.addEventListener("click", requestNotificationPermission);
    
    // Add it after the "Next" button
    const getStartedBtn = document.getElementById("getStartedBtn");
    if (getStartedBtn && getStartedBtn.parentNode) {
      getStartedBtn.parentNode.appendChild(permissionButton);
    }
  }
  
  // Set up the reminder checker
  setInterval(checkReminders, 30000); // Check every 30 seconds for more precision
});

// Function to request notification permission
function requestNotificationPermission() {
  Notification.requestPermission().then(function(permission) {
    console.log("Notification permission:", permission);
    
    if (permission === "granted") {
      // Show a confirmation notification
      new Notification("Notifications Enabled", {
        body: "You will now receive medicine reminders at the scheduled times",
        icon: "https://cdn-icons-png.flaticon.com/512/942/942748.png"
      });
      
      // Refresh the page to update UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  });
}

// Function to check reminders
function checkReminders() {
  // Only proceed if notifications are allowed
  if (Notification.permission !== "granted") return;
  
  // Get auth token
  const authToken = localStorage.getItem("authToken");
  if (!authToken) return;
  
  const backendUrl = "http://localhost:5000";
  
  // Fetch reminders from the server
  fetch(`${backendUrl}/api/getUserReminders`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  })
  .then(response => response.json())
  .then(reminders => {
    if (!Array.isArray(reminders) || reminders.length === 0) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    reminders.forEach(reminder => {
      // Parse reminder time
      const [reminderHour, reminderMinute] = reminder.medicineTime.split(":").map(Number);
      
      // Check if current time matches reminder time (within the last minute)
      if (reminderHour === currentHour && reminderMinute === currentMinute) {
        // Check if today is within the date range
        const today = new Date();
        const startDate = new Date(reminder.startDate);
        const endDate = new Date(reminder.endDate);
        
        if (today >= startDate && today <= endDate) {
          showNotification(reminder.medicineName);
        }
      }
    });
  })
  .catch(error => console.error("Error fetching reminders:", error));
}

// Function to show notification with sound
function showNotification(medicineName) {
  // Create and show notification
  const notification = new Notification("💊 Medicine Reminder", {
    body: `It's time to take your medicine: ${medicineName}`,
    icon: "https://cdn-icons-png.flaticon.com/512/942/942748.png",
    requireInteraction: true // Keep notification until user interacts with it
  });
  
  // Play sound
  playAlarmSound();
  
  // Handle notification click
  notification.onclick = function() {
    notification.close();
    stopAlarmSound();
  };
}

// Function to play alarm sound
function playAlarmSound() {
  // Create audio element if it doesn't exist
  let audio = document.getElementById("notification-sound");
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "notification-sound";
    // Use a default alarm sound URL - replace with your own sound file
    audio.src = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
    audio.loop = true;
    document.body.appendChild(audio);
  }
  
  // Play the sound
  audio.play().catch(err => console.error("Error playing sound:", err));
}

// Function to stop alarm sound
function stopAlarmSound() {
  const audio = document.getElementById("notification-sound");
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

// Add a function to test notifications
function testNotification() {
  if (Notification.permission === "granted") {
    showNotification("Test Medicine");
  } else {
    alert("Please enable notifications first");
    requestNotificationPermission();
  }
}

// Make functions globally accessible
window.requestNotificationPermission = requestNotificationPermission;
window.testNotification = testNotification;