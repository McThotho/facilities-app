const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use /tmp for Vercel serverless or local path
const dbPath = process.env.VERCEL ? '/tmp/facilities.db' : path.join(__dirname, 'facilities.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      contact TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Administrator', 'Manager', 'User')),
      must_change_password INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Facilities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User-Facility assignments
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_facilities (
      user_id INTEGER NOT NULL,
      facility_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, facility_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
    )
  `);

  // Scheduled visits
  db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      scheduled_date DATE NOT NULL,
      scheduled_time TIME,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      assigned_user_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Cleaning assignments (daily assignments)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cleaning_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      assigned_user_id INTEGER NOT NULL,
      scheduled_date DATE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(facility_id, scheduled_date),
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Cleaning checklist items (per assignment and area)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cleaning_checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      area TEXT NOT NULL CHECK(area IN ('living_area', 'bathroom', 'bedroom')),
      task_name TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT 0,
      photo_url TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES cleaning_assignments(id) ON DELETE CASCADE
    )
  `);

  // Chat messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Grievances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS grievances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      picker_id INTEGER,
      category TEXT NOT NULL,
      remarks TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'picked', 'working', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      picked_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (picker_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create default admin user if not exists (ONLY admin, no dummy users)
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin@facilities.com', hashedPassword, 'Administrator');
    console.log('Default admin user created: username=admin, password=admin123');
  }

  // Create sample facilities if none exist
  const facilitiesCount = db.prepare('SELECT COUNT(*) as count FROM facilities').get();
  if (facilitiesCount.count === 0) {
    const facilities = [
      ['M. Rose Bush', 'Location 1', 'Facility 1'],
      ['G. Araakuri', 'Location 2', 'Facility 2'],
      ['M. Kashmeeru Wadhee', 'Location 3', 'Facility 3'],
      ['M. Dhumbuge', 'Location 4', 'Facility 4'],
      ['G. Gaakoshi', 'Location 5', 'Facility 5']
    ];

    const insertFacility = db.prepare('INSERT INTO facilities (name, location, description) VALUES (?, ?, ?)');
    facilities.forEach(facility => insertFacility.run(...facility));
    console.log('Sample facilities created');
  }

  console.log('Database initialized successfully');
}

initDatabase();

module.exports = db;
