const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database schema for PostgreSQL
async function initDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        emp_id TEXT UNIQUE,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT,
        email TEXT UNIQUE NOT NULL,
        contact TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Administrator', 'Manager', 'User')),
        must_change_password INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Facilities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User-Facility assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_facilities (
        user_id INTEGER NOT NULL,
        facility_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, facility_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
      )
    `);

    // Scheduled visits
    await client.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER NOT NULL,
        scheduled_date DATE NOT NULL,
        scheduled_time TIME,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
        assigned_user_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Cleaning assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS cleaning_assignments (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER NOT NULL,
        assigned_user_id INTEGER NOT NULL,
        scheduled_date DATE NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(facility_id, scheduled_date),
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Cleaning checklist items
    await client.query(`
      CREATE TABLE IF NOT EXISTS cleaning_checklist_items (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL,
        area TEXT NOT NULL CHECK(area IN ('living_area', 'bathroom', 'bedroom')),
        task_name TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        photo_url TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES cleaning_assignments(id) ON DELETE CASCADE
      )
    `);

    // Chat messages
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS grievances (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER NOT NULL,
        requester_id INTEGER NOT NULL,
        picker_id INTEGER,
        category TEXT NOT NULL,
        remarks TEXT,
        voice_url TEXT,
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

    // Add voice_url column if it doesn't exist (migration for existing databases)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grievances' AND column_name = 'voice_url') THEN
          ALTER TABLE grievances ADD COLUMN voice_url TEXT;
        END IF;
      END $$;
    `);

    // Create default admin user if not exists
    const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await client.query(
        'INSERT INTO users (username, email, password, role, full_name) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin@facilities.com', hashedPassword, 'Administrator', 'Administrator']
      );
      console.log('Default admin user created: username=admin, password=admin123');
    }

    // Create sample facilities if none exist
    const facilitiesCheck = await client.query('SELECT COUNT(*) as count FROM facilities');
    if (parseInt(facilitiesCheck.rows[0].count) === 0) {
      const facilities = [
        ['M. Rose Bush', 'Location 1', 'Facility 1'],
        ['G. Araakuri', 'Location 2', 'Facility 2'],
        ['M. Kashmeeru Wadhee', 'Location 3', 'Facility 3'],
        ['M. Dhumbuge', 'Location 4', 'Facility 4'],
        ['G. Gaakoshi', 'Location 5', 'Facility 5']
      ];

      for (const facility of facilities) {
        await client.query(
          'INSERT INTO facilities (name, location, description) VALUES ($1, $2, $3)',
          facility
        );
      }
      console.log('Sample facilities created');
    }

    await client.query('COMMIT');
    console.log('PostgreSQL database initialized successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize on startup
initDatabase().catch(console.error);

module.exports = pool;
