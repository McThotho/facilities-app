const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importData() {
  console.log('Starting data import to Neon PostgreSQL...\n');

  const exportData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'database-export.json'), 'utf-8')
  );

  try {
    // Import users
    console.log('Importing users...');
    for (const user of exportData.users) {
      await pool.query(
        `INSERT INTO users (id, emp_id, username, full_name, email, contact, password, role, must_change_password, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (username) DO NOTHING`,
        [user.id, user.emp_id, user.username, user.full_name, user.email, user.contact, user.password, user.role, user.must_change_password, user.created_at]
      );
    }
    console.log(`✓ Imported ${exportData.users.length} users`);

    // Import facilities
    console.log('Importing facilities...');
    for (const facility of exportData.facilities) {
      await pool.query(
        `INSERT INTO facilities (id, name, location, description, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [facility.id, facility.name, facility.location, facility.description, facility.created_at]
      );
    }
    console.log(`✓ Imported ${exportData.facilities.length} facilities`);

    // Import user-facility assignments
    console.log('Importing user-facility assignments...');
    const validUserIds = new Set(exportData.users.map(u => u.id));
    const validFacilityIds = new Set(exportData.facilities.map(f => f.id));
    let importedAssignments = 0;

    for (const assignment of exportData.userFacilities) {
      // Skip if user or facility doesn't exist
      if (!validUserIds.has(assignment.user_id) || !validFacilityIds.has(assignment.facility_id)) {
        continue;
      }

      await pool.query(
        `INSERT INTO user_facilities (user_id, facility_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [assignment.user_id, assignment.facility_id]
      );
      importedAssignments++;
    }
    console.log(`✓ Imported ${importedAssignments} user-facility assignments`);

    // Import cleaning assignments
    console.log('Importing cleaning assignments...');
    for (const assignment of exportData.cleaningAssignments) {
      await pool.query(
        `INSERT INTO cleaning_assignments (id, facility_id, assigned_user_id, scheduled_date, status, started_at, completed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [assignment.id, assignment.facility_id, assignment.assigned_user_id, assignment.scheduled_date, assignment.status, assignment.started_at, assignment.completed_at, assignment.created_at]
      );
    }
    console.log(`✓ Imported ${exportData.cleaningAssignments.length} cleaning assignments`);

    console.log('\n✅ Data import completed successfully!');
    console.log('\nSummary:');
    console.log(`- Users: ${exportData.users.length}`);
    console.log(`- Facilities: ${exportData.facilities.length}`);
    console.log(`- User-Facility Assignments: ${exportData.userFacilities.length}`);
    console.log(`- Cleaning Assignments: ${exportData.cleaningAssignments.length}`);

  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

importData();
