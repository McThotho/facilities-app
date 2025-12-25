const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get overall KPIs
router.get('/kpis', authenticateToken, async (req, res) => {
  try {
    // Total facilities
    const facilitiesResult = await pool.query('SELECT COUNT(*) as count FROM facilities');
    const facilitiesCount = facilitiesResult.rows[0];

    // Visit completion rate
    const visitStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_visits
      FROM visits
      WHERE scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    const visitStats = visitStatsResult.rows[0];

    const visitCompletionRate = parseInt(visitStats.total_visits) > 0
      ? Math.round((parseInt(visitStats.completed_visits || 0) / parseInt(visitStats.total_visits)) * 100)
      : 0;

    // Cleaning adherence rate
    const cleaningStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM cleaning_assignments
      WHERE scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    const cleaningStats = cleaningStatsResult.rows[0];

    const cleaningAdherenceRate = parseInt(cleaningStats.total_tasks) > 0
      ? Math.round((parseInt(cleaningStats.completed_tasks || 0) / parseInt(cleaningStats.total_tasks)) * 100)
      : 0;

    // Overdue tasks
    const overdueTasksResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM cleaning_assignments
      WHERE status = 'pending' AND scheduled_date < CURRENT_DATE
    `);
    const overdueTasks = overdueTasksResult.rows[0];

    // Upcoming visits (next 7 days)
    const upcomingVisitsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM visits
      WHERE status = 'pending'
        AND scheduled_date >= CURRENT_DATE
        AND scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
    `);
    const upcomingVisits = upcomingVisitsResult.rows[0];

    res.json({
      totalFacilities: parseInt(facilitiesCount.count),
      visitCompletionRate,
      cleaningAdherenceRate,
      overdueTasks: parseInt(overdueTasks.count),
      upcomingVisits: parseInt(upcomingVisits.count),
      recentStats: {
        totalVisits: parseInt(visitStats.total_visits),
        completedVisits: parseInt(visitStats.completed_visits || 0),
        totalCleaningTasks: parseInt(cleaningStats.total_tasks),
        completedCleaningTasks: parseInt(cleaningStats.completed_tasks || 0)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// Get facility-specific stats
router.get('/facility/:facilityId', authenticateToken, async (req, res) => {
  try {
    const facilityId = req.params.facilityId;

    // Visit stats
    const visitStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_visits
      FROM visits
      WHERE facility_id = $1 AND scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
    `, [facilityId]);
    const visitStats = visitStatsResult.rows[0];

    // Cleaning stats
    const cleaningStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
      FROM cleaning_assignments
      WHERE facility_id = $1 AND scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
    `, [facilityId]);
    const cleaningStats = cleaningStatsResult.rows[0];

    // Recent activity count
    const recentMessagesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE facility_id = $1 AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    `, [facilityId]);
    const recentMessages = recentMessagesResult.rows[0];

    res.json({
      visits: visitStats,
      cleaning: cleaningStats,
      recentMessages: parseInt(recentMessages.count)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch facility stats' });
  }
});

module.exports = router;
