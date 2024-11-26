const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');
const requestIp = require('request-ip');
const macaddress = require('macaddress');

const app = express();
const port = 3000;

// Middleware setup
app.use(express.json());
app.use(cors());
app.use(requestIp.mw());
/////edit


////

app.post('/save-code', (req, res) => {
  const { code } = req.body;
  if (!code) {
      return res.status(400).json({ error: 'Code is required' });
  }

  // Insert the code into the ph_codes table
  const stmt = db.prepare('INSERT INTO ph_codes (code) VALUES (?)');
  stmt.run(code, function(err) {
      if (err) {
          return res.status(500).json({ error: 'Error saving code' });
      }
      res.status(200).json({ message: 'Code saved successfully' });
  });
  stmt.finalize();
});

// Handle the POST request to save the code from chem.html
app.post('/save-chem-code', (req, res) => {
  const { code } = req.body;
  if (!code) {
      return res.status(400).json({ error: 'Code is required' });
  }

  // Insert the code into the chem_codes table
  const stmt = db.prepare('INSERT INTO chem_codes (code) VALUES (?)');
  stmt.run(code, function(err) {
      if (err) {
          return res.status(500).json({ error: 'Error saving code' });
      }
      res.status(200).json({ message: 'Code saved successfully' });
  });
  stmt.finalize();
});
////
app.get('/get-used-codes', (req, res) => {
  const result = {
      phCodes: [],
      chemCodes: []
  };

  // Fetch PH codes
  db.all('SELECT code FROM ph_codes', [], (err, rows) => {
      if (err) {
          console.error('Error fetching PH codes:', err.message);
          return res.status(500).json({ error: 'Error fetching PH codes' });
      }
      result.phCodes = rows.map(row => row.code);

      // Fetch Chem codes after PH codes are retrieved
      db.all('SELECT code FROM chem_codes', [], (err, rows) => {
          if (err) {
              console.error('Error fetching Chem codes:', err.message);
              return res.status(500).json({ error: 'Error fetching Chem codes' });
          }
          result.chemCodes = rows.map(row => row.code);

          // Send the response with both sets of codes
          res.json(result);
      });
  });
});
///
// Handle the GET request to fetch the count of used codes
app.get('/get-codes-count', (req, res) => {
  const result = {
      phCodesCount: 0,
      chemCodesCount: 0
  };

  // Fetch count of PH codes
  db.get('SELECT COUNT(*) AS count FROM ph_codes', [], (err, row) => {
      if (err) {
          console.error('Error fetching PH codes count:', err.message);
          return res.status(500).json({ error: 'Error fetching PH codes count' });
      }
      result.phCodesCount = row.count;

      // Fetch count of Chem codes after PH codes count is retrieved
      db.get('SELECT COUNT(*) AS count FROM chem_codes', [], (err, row) => {
          if (err) {
              console.error('Error fetching Chem codes count:', err.message);
              return res.status(500).json({ error: 'Error fetching Chem codes count' });
          }
          result.chemCodesCount = row.count;

          // Send the response with both counts
          res.json(result);
      });
  });
});
///
// Handle POST request to reset Physics codes
app.post('/reset-physics-codes', (req, res) => {
  db.run('DELETE FROM ph_codes', function(err) {
      if (err) {
          console.error('Error resetting Physics codes:', err.message);
          return res.status(500).json({ error: 'Error resetting Physics codes' });
      }
      res.json({ message: 'Physics codes reset successfully' });
  });
});

// Handle POST request to reset Chemistry codes
app.post('/reset-chemistry-codes', (req, res) => {
  db.run('DELETE FROM chem_codes', function(err) {
      if (err) {
          console.error('Error resetting Chemistry codes:', err.message);
          return res.status(500).json({ error: 'Error resetting Chemistry codes' });
      }
      res.json({ message: 'Chemistry codes reset successfully' });
  });
});

////edit

// Set up SQLite database
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('users database connected.');
  }
});

// Create tables if they don't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mac_address TEXT NOT NULL
  )
`);
///
db.run(`CREATE TABLE IF NOT EXISTS chem_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL
)`);
db.run(`CREATE TABLE IF NOT EXISTS ph_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL
)`);


///
db.run(`
  CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    verified_at DATETIME

  )
    

    
`, (err) => {
  if (err) {
    console.error('Error creating codes table:', err.message);
  } else {
    console.log('Codes database connnected.');
  }
});


// Helper function to generate random code
function generateRandomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Register endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const macAddress = req.clientIp; // For production, replace this with actual MAC retrieval
  if (!macAddress) {
    return res.status(400).json({ error: 'Unable to retrieve device information.' });
  }

  // Check if the email already exists
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (row) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    db.run('INSERT INTO users (email, password, mac_address) VALUES (?, ?, ?)', [email, hashedPassword, macAddress], (err) => {
      if (err) {
        console.error('Error inserting user:', err.message);
        return res.status(500).json({ error: 'Error creating user' });
      }
      res.status(201).json({ message: 'Registration successful' });
    });
  });
});
//
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }

    if (!row) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, row.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const currentMacAddress = req.clientIp; // Replace with actual MAC retrieval
    if (email !== "admin123@gmail.com" && row.mac_address !== currentMacAddress) {
      return res.status(400).json({ error: 'This account can only be accessed from the registered device.' });
    }

    // Respond with success and user info (or token, depending on your needs)
    res.status(200).json({
      message: 'Login successful',
      email: row.email,
      userId: row.id
    });
  });
});




// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Your login route can redirect to sim.html like this:
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  ///
    req.session.userId = validUser.id; // Store userId in session

  ///
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }

    if (!row) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, row.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const currentMacAddress = req.clientIp; // Replace with actual MAC retrieval
    if (email !== "admin123@gmail.com" && row.mac_address !== currentMacAddress) {
      return res.status(400).json({ error: 'This account can only be accessed from the registered device.' });
    }

    // Redirect to sim.html on successful login
    res.redirect('/sim.html');
  });
});

// API to get all codes
app.get('/api/codes', (req, res) => {
  db.all('SELECT * FROM codes', (err, rows) => {
    if (err) {
      console.error('Error fetching codes:', err);
      return res.status(500).json({ error: 'Failed to retrieve codes' });
    }
    res.json(rows);
  });
});

// API to add a new code
app.post('/api/addCode', (req, res) => {
  const code = generateRandomCode();
  db.run('INSERT INTO codes (code) VALUES (?)', [code], function(err) {
    if (err) {
      console.error('Error adding code:', err);
      return res.status(500).json({ error: 'Failed to add code' });
    }
    res.status(201).json({ message: 'Code added successfully', code });
  });
});

// API to delete a code by code value
app.delete('/api/deleteCode', (req, res) => {
  const { code } = req.body;
  db.run('DELETE FROM codes WHERE code = ?', [code], function(err) {
    if (err) {
      console.error('Error deleting code:', err);
      return res.status(500).json({ error: 'Failed to delete code' });
    }
    res.json({ message: 'Code deleted successfully' });
  });
});
///
app.post('/api/verifyCode', (req, res) => {
  const { code } = req.body;

  db.get('SELECT * FROM codes WHERE code = ?', [code], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to verify code' });
    }

    if (!row) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    const currentTimestamp = new Date().toISOString(); // Get current UTC timestamp

    // Update the verified_at column with the current timestamp
    db.run('UPDATE codes SET verified_at = ? WHERE code = ?', [currentTimestamp, code], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update code verification time' });
      }

      // Delete the code from the database after verification
      db.run('DELETE FROM codes WHERE code = ?', [code], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete code' });
        }
        res.status(200).json({ message: 'Code verified successfully and deleted.' });
      });
    });
  });
});


//db.run('ALTER TABLE codes ADD COLUMN verified_at DATETIME', (err) => {
 // if (err) {
 //   console.error('Error adding verified_at column:', err.message);
 // } else {
 //   console.log('verified_at column added successfully.');
 // }
//});

//

//
app.post('/api/checkCodeForVideo', (req, res) => {
  const { code } = req.body;

  db.get('SELECT * FROM codes WHERE code = ?', [code], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve code' });
    }

    if (!row) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Get the current timestamp and the verification timestamp
    const currentTimestamp = new Date();
    const verificationTimestamp = new Date(row.verified_at);

    // Calculate the time difference in milliseconds
    const diffTime = currentTimestamp - verificationTimestamp;
    const diffDays = diffTime / (1000 * 3600 * 24); // Convert milliseconds to days

    // If the verification was within the last 7 days, allow access
    if (diffDays <= 7) {
      res.status(200).json({ message: 'Code verified within 7 days, no need to verify again.' });
    } else {
      res.status(400).json({ error: 'Code verification expired, please verify again.' });
    }
  });
});
app.post('/api/accessVideo', (req, res) => {
  const { code } = req.body;

  // Call the checkCodeForVideo endpoint to validate the code
  app.post('/api/checkCodeForVideo', (req, res) => {
    // This will internally handle the logic described in Step 3
  });

  // If valid, proceed with video access (could serve a link or file)
  res.status(200).json({ message: 'Access granted to the video!' });
});


 

///
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
 