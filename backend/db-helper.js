// Database helper that works with both SQLite (for local dev) and PostgreSQL (for production)
const { query } = require('./database-pg');

// Helper to convert SQLite-style queries to PostgreSQL parameterized queries
const db = {
  prepare: (sql) => {
    return {
      get: async (...params) => {
        try {
          // Convert ? to $1, $2, etc.
          let pgSql = sql;
          let paramIndex = 1;
          pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
          
          const result = await query(pgSql, params);
          return result.rows[0] || null;
        } catch (error) {
          console.error('DB Error:', error);
          throw error;
        }
      },
      all: async (...params) => {
        try {
          let pgSql = sql;
          let paramIndex = 1;
          pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
          
          const result = await query(pgSql, params);
          return result.rows;
        } catch (error) {
          console.error('DB Error:', error);
          throw error;
        }
      },
      run: async (...params) => {
        try {
          let pgSql = sql;
          let paramIndex = 1;
          pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
          
          // Add RETURNING id for INSERT statements
          if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
            pgSql += ' RETURNING id';
          }
          
          const result = await query(pgSql, params);
          
          return {
            lastInsertRowid: result.rows[0]?.id,
            changes: result.rowCount
          };
        } catch (error) {
          console.error('DB Error:', error);
          throw error;
        }
      }
    };
  },
  exec: async (sql) => {
    await query(sql);
  }
};

module.exports = db;
