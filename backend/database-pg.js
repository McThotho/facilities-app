const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper function to execute queries
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Initialize database schema
async function initDatabase() {
  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        emp_id TEXT UNIQUE,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        contact TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Administrator', 'Manager', 'User')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Facilities table
    await query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User-Facility assignments
    await query(`
      CREATE TABLE IF NOT EXISTS user_facilities (
        user_id INTEGER NOT NULL,
        facility_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, facility_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
      )
    `);

    // Scheduled visits
    await query(`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER NOT NULL,
        scheduled_date DATE NOT NULL,
        time TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
      )
    `);

    // Cleaning assignments
    await query(`
      CREATE TABLE IF NOT EXISTS cleaning_assignments (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER NOT NULL,
        assigned_user_id INTEGER NOT NULL,
        scheduled_date DATE NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
        photo_url TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(facility_id, scheduled_date, assigned_user_id),
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Chat messages
    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Grievances table
    await query(`
      CREATE TABLE IF NOT EXISTS grievances (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER NOT NULL,
        requester_id INTEGER NOT NULL,
        picker_id INTEGER,
        category TEXT NOT NULL,
        remarks TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'picked', 'working', 'completed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        picked_at TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (picker_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create default admin user if not exists (ONLY admin, no dummy users)
    const adminCheck = await query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await query(`
        INSERT INTO users (username, email, password, role)
        VALUES ($1, $2, $3, $4)
      `, ['admin', 'admin@facilities.com', hashedPassword, 'Administrator']);
      console.log('Default admin user created: username=admin, password=admin123');
    }

    // Create sample facilities if none exist
    const facilitiesCheck = await query('SELECT COUNT(*) as count FROM facilities');
    if (parseInt(facilitiesCheck.rows[0].count) === 0) {
      const facilities = [
        ['M. Rose Bush', 'Location 1', 'Facility 1'],
        ['G. Araakuri', 'Location 2', 'Facility 2'],
        ['M. Kashmeeru Wadhee', 'Location 3', 'Facility 3'],
        ['M. Dhumbuge', 'Location 4', 'Facility 4'],
        ['G. Gaakoshi', 'Location 5', 'Facility 5']
      ];

      for (const facility of facilities) {
        await query(
          'INSERT INTO facilities (name, location, description) VALUES ($1, $2, $3)',
          facility
        );
      }
      console.log('Sample facilities created');
    }

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Export query function and pool
module.exports = {
  query,
  pool,
  initDatabase
};
