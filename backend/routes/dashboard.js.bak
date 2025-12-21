const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get overall KPIs
router.get('/kpis', authenticateToken, (req, res) => {
  try {
    // Total facilities
    const facilitiesCount = db.prepare('SELECT COUNT(*) as count FROM facilities').get();

    // Visit completion rate
    const visitStats = db.prepare(`
      SELECT
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_visits
      FROM visits
      WHERE scheduled_date >= date('now', '-30 days')
    `).get();

    const visitCompletionRate = visitStats.total_visits > 0
      ? Math.round((visitStats.completed_visits / visitStats.total_visits) * 100)
      : 0;

    // Cleaning adherence rate
    const cleaningStats = db.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM cleaning_assignments
      WHERE scheduled_date >= date('now', '-30 days')
    `).get();

    const cleaningAdherenceRate = cleaningStats.total_tasks > 0
      ? Math.round((cleaningStats.completed_tasks / cleaningStats.total_tasks) * 100)
      : 0;

    // Overdue tasks
    const overdueTasks = db.prepare(`
      SELECT COUNT(*) as count
      FROM cleaning_assignments
      WHERE status = 'pending' AND scheduled_date < date('now')
    `).get();

    // Upcoming visits (next 7 days)
    const upcomingVisits = db.prepare(`
      SELECT COUNT(*) as count
      FROM visits
      WHERE status = 'pending'
        AND scheduled_date >= date('now')
        AND scheduled_date <= date('now', '+7 days')
    `).get();

    res.json({
      totalFacilities: facilitiesCount.count,
      visitCompletionRate,
      cleaningAdherenceRate,
      overdueTasks: overdueTasks.count,
      upcomingVisits: upcomingVisits.count,
      recentStats: {
        totalVisits: visitStats.total_visits,
        completedVisits: visitStats.completed_visits,
        totalCleaningTasks: cleaningStats.total_tasks,
        completedCleaningTasks: cleaningStats.completed_tasks
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// Get facility-specific stats
router.get('/facility/:facilityId', authenticateToken, (req, res) => {
  try {
    const facilityId = req.params.facilityId;

    // Visit stats
    const visitStats = db.prepare(`
      SELECT
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_visits
      FROM visits
      WHERE facility_id = ? AND scheduled_date >= date('now', '-30 days')
    `).get(facilityId);

    // Cleaning stats
    const cleaningStats = db.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
      FROM cleaning_assignments
      WHERE facility_id = ? AND scheduled_date >= date('now', '-30 days')
    `).get(facilityId);

    // Recent activity count
    const recentMessages = db.prepare(`
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE facility_id = ? AND created_at >= datetime('now', '-7 days')
    `).get(facilityId);

    res.json({
      visits: visitStats,
      cleaning: cleaningStats,
      recentMessages: recentMessages.count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch facility stats' });
  }
});

module.exports = router;
