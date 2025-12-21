const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'facilities.db');
const db = new Database(dbPath);

console.log('Migrating existing users to add full names...\n');

// Mapping of emails to full names (extracted from your data)
const emailToFullName = {
  'admin@facilities.com': 'Administrator',
  'manager@facilities.com': 'Manager',
  'mizanur_rahman@facilities.com': 'Mizanur Rahman',
  'samirul_islam@facilities.com': 'Samirul Islam',
  'md_shohag@facilities.com': 'MD Shohag',
  'jalal_miah@facilities.com': 'Jalal Miah',
  'vikram_veeramani@facilities.com': 'Vikram Veeramani'
};

const users = db.prepare('SELECT id, email, username FROM users').all();
const updateStmt = db.prepare('UPDATE users SET full_name = ? WHERE id = ?');

users.forEach(user => {
  // Get full name from email mapping, or convert email to readable name
  let fullName = emailToFullName[user.email];

  if (!fullName) {
    // Fallback: extract from email (e.g., "john_doe@..." becomes "John Doe")
    const emailPart = user.email.split('@')[0];
    fullName = emailPart
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  updateStmt.run(fullName, user.id);
  console.log(`✓ Updated user ${user.id}: ${user.username} → ${fullName}`);
});

console.log('\n✓ Migration completed!\n');

// Show updated users
console.log('Updated users:');
const updatedUsers = db.prepare('SELECT id, emp_id, username, full_name, email FROM users').all();
console.table(updatedUsers);

db.close();
