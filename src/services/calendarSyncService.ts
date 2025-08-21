import axios from "axios";
import ical, { VEvent } from "node-ical";
import { prisma } from "../lib/prisma";
import { BookingStatus, PaymentStatus } from "@prisma/client";

export interface SyncResult {
  success: boolean;
  message: string;
  bookingsCreated: number;
  bookingsUpdated: number;
  bookingsSkipped: number;
  errors: string[];
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  organizer?: string;
}

export class CalendarSyncService {
  /**
   * Download and parse iCal data from URL
   */
  static async downloadICalData(url: string): Promise<CalendarEvent[]> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          "User-Agent": "Rentopia Calendar Sync/1.0",
        },
      });

      if (response.status !== 200) {
        throw new Error(`Failed to download calendar: HTTP ${response.status}`);
      }

      const events = this.parseICalData(response.data);
      return events;
    } catch (error: any) {
      throw new Error(`Failed to download iCal data: ${error.message}`);
    }
  }

  /**
   * Parse iCal string data into calendar events
   */
  static parseICalData(icalData: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    try {
      const parsed = ical.parseICS(icalData);

      for (const key in parsed) {
        const event = parsed[key];

        if (event && event.type === "VEVENT") {
          const vevent = event as VEvent;

          // Skip events without required fields
          if (!vevent.uid || !vevent.start || !vevent.end) {
            continue;
          }

          const organizer =
            typeof vevent.organizer === "string"
              ? vevent.organizer
              : vevent.organizer?.params?.CN || "";

          events.push({
            uid: vevent.uid,
            summary: vevent.summary || "Booking",
            description: vevent.description || "",
            start: new Date(vevent.start),
            end: new Date(vevent.end),
            location: vevent.location || "",
            organizer,
          });
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to parse iCal data: ${error.message}`);
    }

    return events;
  }

  /**
   * Sync calendar events for a specific property
   */
  static async syncPropertyCalendar(propertyId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      message: "",
      bookingsCreated: 0,
      bookingsUpdated: 0,
      bookingsSkipped: 0,
      errors: [],
    };

    try {
      // Get property with calendar URL using raw query
      const properties = (await prisma.$queryRaw`
        SELECT id, name, ical_url, sync_enabled, user_id
        FROM properties 
        WHERE id = ${propertyId}::uuid
      `) as {
        id: string;
        name: string;
        ical_url: string | null;
        sync_enabled: boolean;
        user_id: string;
      }[];

      if (!properties || properties.length === 0) {
        result.errors.push("Property not found");
        return result;
      }

      const property = properties[0];

      if (!property || !property.sync_enabled || !property.ical_url) {
        result.errors.push("Calendar sync is not enabled for this property");
        return result;
      }

      return this.syncPropertyCalendarWithUrl(propertyId, property.ical_url);
    } catch (error: any) {
      console.error("Sync error:", error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Sync calendar events for a specific property with a provided iCal URL
   */
  static async syncPropertyCalendarWithUrl(
    propertyId: string,
    icalUrl: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      message: "",
      bookingsCreated: 0,
      bookingsUpdated: 0,
      bookingsSkipped: 0,
      errors: [],
    };

    try {
      // Get property info using raw query
      const properties = (await prisma.$queryRaw`
        SELECT id, name, user_id
        FROM properties 
        WHERE id = ${propertyId}::uuid
      `) as { id: string; name: string; user_id: string }[];

      if (!properties || properties.length === 0) {
        result.errors.push("Property not found");
        return result;
      }

      const property = properties[0];
      if (!property) {
        result.errors.push("Property not found");
        return result;
      }

      console.log(`Starting calendar sync for property: ${property.name}`);

      // Download and parse calendar data
      const events = await this.downloadICalData(icalUrl);

      console.log("🚀 ~ CalendarSyncService ~ syncPropertyCalendarWithUrl ~ events:", events);

      console.log(`Downloaded ${events.length} events from calendar`);

      // Process each event
      for (const event of events) {
        try {
          await this.processCalendarEvent(propertyId, event, result);
        } catch (error: any) {
          result.errors.push(
            `Error processing event ${event.uid}: ${error.message}`
          );
          console.error(`Error processing event ${event.uid}:`, error);
        }
      }

      // Update last sync timestamp using raw query
      await prisma.$executeRaw`
        UPDATE properties 
        SET last_sync_at = NOW() 
        WHERE id = ${propertyId}::uuid
      `;

      result.success = result.errors.length === 0;
      result.message = result.success
        ? `Sync completed successfully. Created: ${result.bookingsCreated}, Updated: ${result.bookingsUpdated}, Skipped: ${result.bookingsSkipped}`
        : `Sync completed with ${result.errors.length} errors`;

      console.log(
        `Calendar sync completed for property ${property.name}: ${result.message}`
      );
    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
      console.error("Calendar sync error:", error);
    }

    return result;
  }

  /**
   * Process a single calendar event and create/update booking
   */
  private static async processCalendarEvent(
    propertyId: string,
    event: CalendarEvent,
    result: SyncResult
  ): Promise<void> {
    console.log(`🔍 Processing event: ${event.uid}`);
    console.log(`📋 Event summary: "${event.summary}"`);
    console.log(`📝 Event description: "${event.description || 'None'}"`);

    // Check if booking already exists using raw query
    const existingBookings = (await prisma.$queryRaw`
      SELECT id 
      FROM bookings 
      WHERE property_id = ${propertyId}::uuid 
      AND external_id = ${event.uid}
    `) as { id: string }[];

    const existingBooking =
      existingBookings.length > 0 ? existingBookings[0] : null;

    const checkInDate = new Date(event.start);
    const checkOutDate = new Date(event.end);

    // Calculate nights
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (nights <= 0) {
      result.errors.push(`Invalid date range for event ${event.uid}`);
      return;
    }

    // Extract guest information from summary/description
    const guestInfo = this.extractGuestInfo(event);

    console.log(
      "🚀 ~ CalendarSyncService ~ processCalendarEvent ~ guestInfo:",
      guestInfo
    );

    if (existingBooking) {
      // Update existing booking using raw query
      await prisma.$executeRaw`
        UPDATE bookings 
        SET 
          guest_name = ${guestInfo.name},
          guest_email = ${guestInfo.email},
          guest_phone = ${guestInfo.phone},
          number_of_guests = ${guestInfo.guests},
          check_in_date = ${checkInDate},
          check_out_date = ${checkOutDate},
          nights_count = ${nights},
          special_requests = ${event.description || null},
          internal_notes = ${`Updated from calendar sync on ${new Date().toISOString()}`},
          updated_at = NOW()
        WHERE id = ${existingBooking.id}::uuid
      `;
      result.bookingsUpdated++;
    } else {
      // Create new booking using Prisma create method instead of raw SQL
      const internalNotes = guestInfo.isPlaceholder 
        ? `[PLACEHOLDER] Calendar blocked date - imported from calendar sync on ${new Date().toISOString()}`
        : `Imported from calendar sync on ${new Date().toISOString()}`;
      
      await prisma.booking.create({
        data: {
          propertyId: propertyId,
          guestName: guestInfo.name,
          guestEmail: guestInfo.email || null,
          guestPhone: guestInfo.phone || null,
          numberOfGuests: guestInfo.guests,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          nightsCount: nights,
          baseAmount: 0.00,
          cleaningFee: 0.00,
          taxes: 0.00,
          totalAmount: 0.00,
          securityDeposit: 0.00,
          bookingStatus: 'pending',
          paymentStatus: 'pending',
          bookingSource: 'booking.com',
          externalId: event.uid,
          specialRequests: event.description || null,
          internalNotes: internalNotes
        }
      });
      result.bookingsCreated++;
    }
  }

  /**
   * Extract guest information from calendar event
   * Creates placeholder data for calendar-only reservations
   */
  private static extractGuestInfo(event: CalendarEvent): {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    guests: number;
    isPlaceholder: boolean;
  } {
    // Default values for placeholder bookings
    let name = "Calendar Reservation";
    let email: string | undefined;
    let phone: string | undefined;
    let guests = 1;
    let isPlaceholder = true;

    // Check if this appears to be a blocked/closed date
    if (
      event.summary &&
      (event.summary.toLowerCase().includes("closed") ||
        event.summary.toLowerCase().includes("blocked") ||
        event.summary.toLowerCase().includes("unavailable") ||
        event.summary.toLowerCase() === "closed" ||
        event.summary.toLowerCase().includes("not available"))
    ) {
      name = "Blocked Period - Please Update";
      guests = 1; // Default to 1 to avoid database constraints
      isPlaceholder = true;
    } else if (event.summary) {
      // Try to extract guest name from summary
      const cleanSummary = event.summary.trim();
      
      // Check if it looks like a real guest name (contains letters and spaces, not just "CLOSED" etc)
      const nameMatch = cleanSummary.match(/^([A-Za-z\s]{2,50})(?:\s*-|\s*\(|$)/);
      if (nameMatch && nameMatch[1] && 
          !nameMatch[1].toLowerCase().includes('closed') &&
          !nameMatch[1].toLowerCase().includes('blocked') &&
          !nameMatch[1].toLowerCase().includes('unavailable')) {
        name = nameMatch[1].trim();
        isPlaceholder = false; // This looks like a real guest name
      } else {
        // Use the summary as-is but mark as placeholder
        name = `${cleanSummary} - Please Update`;
        isPlaceholder = true;
      }

      // Extract guest count if present
      const guestMatch = event.summary.match(/(\d+)\s*guests?/i);
      if (guestMatch && guestMatch[1]) {
        guests = Math.max(1, parseInt(guestMatch[1], 10)); // Ensure at least 1
      }
    }

    // Try to extract from description
    if (event.description) {
      const emailMatch = event.description.match(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      );
      if (emailMatch) {
        email = emailMatch[1];
      }

      const phoneMatch = event.description.match(
        /(?:phone|tel|mobile):\s*([+\d\s\-\(\)]+)/i
      );
      if (phoneMatch && phoneMatch[1]) {
        phone = phoneMatch[1].trim();
      }
    }

    return {
      name,
      email: email || undefined,
      phone: phone || undefined,
      guests,
      isPlaceholder,
    };
  }

  /**
   * Sync all properties with calendar sync enabled
   */
  static async syncAllProperties(): Promise<SyncResult[]> {
    // Use raw query to get properties with sync enabled
    const properties = (await prisma.$queryRaw`
      SELECT id, name 
      FROM properties 
      WHERE sync_enabled = true 
      AND ical_url IS NOT NULL
    `) as { id: string; name: string }[];

    console.log(`Starting sync for ${properties.length} properties`);

    const results: SyncResult[] = [];

    for (const property of properties) {
      const result = await this.syncPropertyCalendar(property.id);
      results.push(result);
    }

    return results;
  }

  /**
   * Test calendar URL without saving
   */
  static async testCalendarUrl(
    url: string
  ): Promise<{ valid: boolean; eventCount: number; error?: string }> {
    try {
      const events = await this.downloadICalData(url);
      return {
        valid: true,
        eventCount: events.length,
      };
    } catch (error: any) {
      return {
        valid: false,
        eventCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Update calendar settings for a property
   */
  static async updateCalendarSettings(
    propertyId: string,
    settings: { icalUrl?: string; syncEnabled?: boolean }
  ) {
    const { icalUrl, syncEnabled } = settings;

    // Use raw query to update calendar settings
    await prisma.$executeRaw`
      UPDATE properties 
      SET ical_url = ${icalUrl}, 
          sync_enabled = ${syncEnabled || false}
      WHERE id = ${propertyId}
    `;

    return this.getCalendarSettings(propertyId);
  }

  /**
   * Get calendar settings for a property
   */
  static async getCalendarSettings(propertyId: string) {
    const property = (await prisma.$queryRaw`
      SELECT id, name, ical_url, sync_enabled, last_sync_at 
      FROM properties 
      WHERE id = ${propertyId}
    `) as Array<{
      id: string;
      name: string;
      ical_url: string | null;
      sync_enabled: boolean;
      last_sync_at: Date | null;
    }>;

    if (!property || property.length === 0) {
      return null;
    }

    const prop = property[0];
    if (!prop) {
      return null;
    }

    return {
      propertyId: prop.id,
      propertyName: prop.name,
      icalUrl: prop.ical_url,
      syncEnabled: prop.sync_enabled,
      lastSyncAt: prop.last_sync_at,
    };
  }
}
