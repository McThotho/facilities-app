const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'facilities.db');
const db = new Database(dbPath);

// Helper function to generate username from name and emp_id
function generateUsername(fullName, empId) {
  if (!fullName || !empId) return null;
  const nameParts = fullName.trim().split(/\s+/);
  const lastName = nameParts[nameParts.length - 1].toLowerCase();
  return `${lastName}${empId}`;
}

console.log('Fixing usernames to match lastname+empid format...\n');

// Get all users with emp_id (skip admin who doesn't have emp_id)
const users = db.prepare('SELECT id, emp_id, username, email FROM users WHERE emp_id IS NOT NULL').all();

const updateUsername = db.prepare('UPDATE users SET username = ? WHERE id = ?');

users.forEach(user => {
  const newUsername = generateUsername(user.username, user.emp_id);

  if (newUsername && newUsername !== user.username) {
    console.log(`Updating user ${user.id}:`);
    console.log(`  Old username: ${user.username}`);
    console.log(`  New username: ${newUsername}`);

    updateUsername.run(newUsername, user.id);
  }
});

console.log('\n✓ Username migration completed!\n');
console.log('Updated users:');
const updatedUsers = db.prepare('SELECT id, emp_id, username, email, role FROM users').all();
console.table(updatedUsers);

db.close();
