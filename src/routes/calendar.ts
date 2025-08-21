import { Router, Request, Response } from 'express';
import { CalendarSyncService } from '../services/calendarSyncService.js';
import axios from 'axios';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CalendarSyncRequest:
 *       type: object
 *       required:
 *         - icalUrl
 *       properties:
 *         icalUrl:
 *           type: string
 *           format: uri
 *           description: iCal URL for calendar synchronization
 *           example: "https://ical.booking.com/v1/export?t=dfd06387-a93f-45ae-9247-c8be892e01b4"
 *     CalendarSyncResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         syncedEvents:
 *           type: integer
 *           description: Number of calendar events synchronized
 *         newBookings:
 *           type: integer
 *           description: Number of new bookings created
 *         updatedBookings:
 *           type: integer
 *           description: Number of existing bookings updated
 *     CalendarTestUrlRequest:
 *       type: object
 *       required:
 *         - icalUrl
 *       properties:
 *         icalUrl:
 *           type: string
 *           format: uri
 *           description: iCal URL to test for validity
 *     CalendarTestUrlResponse:
 *       type: object
 *       properties:
 *         valid:
 *           type: boolean
 *         eventCount:
 *           type: integer
 *           description: Number of events found in the calendar
 *         error:
 *           type: string
 *           description: Error message if validation failed
 *     CalendarSettings:
 *       type: object
 *       properties:
 *         propertyId:
 *           type: string
 *         icalUrl:
 *           type: string
 *           format: uri
 *         syncEnabled:
 *           type: boolean
 *         lastSyncAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/calendar/sync/{propertyId}:
 *   post:
 *     summary: Sync property calendar with external iCal source
 *     description: Synchronizes a property's booking calendar with an external iCal feed (e.g., Booking.com)
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID to sync calendar for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalendarSyncRequest'
 *     responses:
 *       200:
 *         description: Calendar synchronized successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarSyncResponse'
 *       400:
 *         description: Bad request - invalid property ID or iCal URL
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error during synchronization
 */
router.post('/sync/:propertyId', async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { icalUrl } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    if (!icalUrl) {
      return res.status(400).json({
        success: false,
        message: 'iCal URL is required'
      });
    }

    const result = await CalendarSyncService.syncPropertyCalendarWithUrl(propertyId, icalUrl);

    return res.json(result);
  } catch (error) {
    console.error('Calendar sync error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to sync calendar'
    });
  }
});

/**
 * @swagger
 * /api/calendar/test-url:
 *   post:
 *     summary: Test iCal URL validity
 *     description: Validates an iCal URL and returns information about the calendar
 *     tags: [Calendar]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalendarTestUrlRequest'
 *     responses:
 *       200:
 *         description: URL validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarTestUrlResponse'
 *       400:
 *         description: Bad request - invalid URL format
 *       500:
 *         description: Internal server error during validation
 */
router.post('/test-url', async (req: Request, res: Response) => {
  try {
    const { icalUrl } = req.body;

    if (!icalUrl) {
      return res.status(400).json({
        valid: false,
        error: 'iCal URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(icalUrl);
    } catch {
      return res.status(400).json({
        valid: false,
        error: 'Invalid URL format'
      });
    }

    // Test if the URL is accessible and returns valid iCal data
    const response = await axios.get(icalUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Rentopia Calendar Sync/1.0'
      }
    });

    // Check if response contains iCal data
    const data = response.data;
    if (typeof data !== 'string' || !data.includes('BEGIN:VCALENDAR')) {
      return res.json({
        valid: false,
        error: 'URL does not return valid iCal data'
      });
    }

    // Count events for informational purposes
    const eventCount = (data.match(/BEGIN:VEVENT/g) || []).length;

    return res.json({
      valid: true,
      eventCount,
      message: `Valid iCal URL with ${eventCount} events`
    });
  } catch (error) {
    console.error('iCal URL test error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return res.json({
          valid: false,
          error: 'URL request timed out'
        });
      }
      if (error.response?.status === 404) {
        return res.json({
          valid: false,
          error: 'URL not found (404)'
        });
      }
      if (error.response?.status && error.response.status >= 400) {
        return res.json({
          valid: false,
          error: `HTTP error: ${error.response.status}`
        });
      }
    }

    return res.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate URL'
    });
  }
});

/**
 * @swagger
 * /api/calendar/settings/{propertyId}:
 *   put:
 *     summary: Update calendar sync settings for a property
 *     description: Configure calendar synchronization settings including iCal URL and sync preferences
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID to update settings for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               icalUrl:
 *                 type: string
 *                 format: uri
 *                 description: iCal URL for calendar synchronization
 *               syncEnabled:
 *                 type: boolean
 *                 description: Enable or disable automatic calendar synchronization
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarSettings'
 *       400:
 *         description: Bad request - invalid property ID or settings
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error during update
 */
router.put('/settings/:propertyId', async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { icalUrl, syncEnabled } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const settings = await CalendarSyncService.updateCalendarSettings(propertyId, {
      icalUrl,
      syncEnabled
    });

    return res.json({
      success: true,
      message: 'Calendar settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Calendar settings update error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update calendar settings'
    });
  }
});

/**
 * @swagger
 * /api/calendar/settings/{propertyId}:
 *   get:
 *     summary: Get calendar sync settings for a property
 *     description: Retrieve current calendar synchronization settings for a property
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID to get settings for
 *     responses:
 *       200:
 *         description: Calendar settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarSettings'
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error during retrieval
 */
router.get('/settings/:propertyId', async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const settings = await CalendarSyncService.getCalendarSettings(propertyId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or no calendar settings configured'
      });
    }

    return res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Calendar settings retrieval error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve calendar settings'
    });
  }
});

export default router;
