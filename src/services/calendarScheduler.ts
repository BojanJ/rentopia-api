import * as cron from 'node-cron';
import { CalendarSyncService } from '../services/calendarSyncService';

export class CalendarScheduler {
  private static isRunning = false;
  private static task: cron.ScheduledTask | null = null;

  /**
   * Start the calendar sync scheduler
   */
  static async start() {
    if (this.isRunning) {
      console.log('Calendar scheduler is already running');
      return;
    }

    // Run initial sync immediately
    console.log('Running initial calendar sync on startup...');
    try {
      const results = await CalendarSyncService.syncAllProperties();
      const totalCreated = results.reduce((sum, r) => sum + r.bookingsCreated, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.bookingsUpdated, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      
      console.log(`Initial sync completed: ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`);
    } catch (error) {
      console.error('Initial calendar sync error:', error);
    }

    // Run every 2 hours after the initial sync
    this.task = cron.schedule('0 */2 * * *', async () => {
      console.log('Starting scheduled calendar sync...');
      try {
        const results = await CalendarSyncService.syncAllProperties();
        const totalCreated = results.reduce((sum, r) => sum + r.bookingsCreated, 0);
        const totalUpdated = results.reduce((sum, r) => sum + r.bookingsUpdated, 0);
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        
        console.log(`Scheduled sync completed: ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`);
      } catch (error) {
        console.error('Scheduled calendar sync error:', error);
      }
    });

    this.task.start();
    this.isRunning = true;
    console.log('Calendar scheduler started - will run every 2 hours');
  }

  /**
   * Stop the calendar sync scheduler
   */
  static stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    this.isRunning = false;
    console.log('Calendar scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? 'Every 2 hours' : 'Not scheduled'
    };
  }
}
