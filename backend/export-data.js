const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'facilities.db');
const db = new Database(dbPath);

console.log('Exporting all data from SQLite database...\n');

// Export users
const users = db.prepare('SELECT * FROM users').all();
console.log('Users:', users.length);

// Export facilities
const facilities = db.prepare('SELECT * FROM facilities').all();
console.log('Facilities:', facilities.length);

// Export user-facility assignments
const userFacilities = db.prepare('SELECT * FROM user_facilities').all();
console.log('User-Facility Assignments:', userFacilities.length);

// Export cleaning assignments
const cleaningAssignments = db.prepare('SELECT * FROM cleaning_assignments').all();
console.log('Cleaning Assignments:', cleaningAssignments.length);

// Export all data
const exportData = {
  users,
  facilities,
  userFacilities,
  cleaningAssignments,
  exportedAt: new Date().toISOString()
};

// Save to JSON file
fs.writeFileSync(
  path.join(__dirname, 'database-export.json'),
  JSON.stringify(exportData, null, 2)
);

console.log('\n✓ Data exported to database-export.json');
console.log('\nStaff members:');
users.filter(u => u.emp_id).forEach(u => {
  console.log(`  - ${u.username} (${u.role}, EmpID: ${u.emp_id})`);
});

db.close();
