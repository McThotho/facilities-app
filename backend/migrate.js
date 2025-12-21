const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'facilities.db');
const db = new Database(dbPath);

console.log('Checking database schema...');

// Check if must_change_password column exists
try {
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const hasColumn = tableInfo.some(col => col.name === 'must_change_password');

  if (!hasColumn) {
    console.log('Adding must_change_password column to users table...');
    db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0`);
    console.log('✓ Column added successfully');
  } else {
    console.log('✓ must_change_password column already exists');
  }

  console.log('\nCurrent users in database:');
  const users = db.prepare('SELECT id, emp_id, username, email, role, must_change_password FROM users').all();
  console.table(users);

} catch (error) {
  console.error('Error during migration:', error.message);
}

db.close();
