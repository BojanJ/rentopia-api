import express, { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const bookingValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Property ID must be a valid UUID'),
  body('guestName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Guest name is required and must be less than 200 characters'),
  body('guestEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('numberOfGuests')
    .isInt({ min: 1 })
    .withMessage('Number of guests must be at least 1'),
  body('checkInDate')
    .isISO8601()
    .withMessage('Check-in date must be a valid date'),
  body('checkOutDate')
    .isISO8601()
    .withMessage('Check-out date must be a valid date'),
  body('baseAmount')
    .isFloat({ min: 0 })
    .withMessage('Base amount must be a non-negative number'),
  body('totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a non-negative number')
];

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings for user's properties
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, pending, cancelled, checked_in, checked_out, no_show]
 *         description: Filter by booking status
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by property ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this check-in date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings until this check-in date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 50
 *         description: Number of bookings to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of bookings to skip
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Booking'
 *                       - type: object
 *                         properties:
 *                           nightsCount:
 *                             type: integer
 *                             description: Number of nights for the booking
 *                           property:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                               state:
 *                                 type: string
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Get all bookings for user's properties
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, propertyId, startDate, endDate, limit, offset } = req.query;

    const where: any = {
      property: {
        userId: req.user!.id
      }
    };

    // Add filters
    if (status) {
      where.bookingStatus = status;
    }
    if (propertyId) {
      where.propertyId = propertyId;
    }
    if (startDate || endDate) {
      where.checkInDate = {};
      if (startDate) where.checkInDate.gte = new Date(startDate as string);
      if (endDate) where.checkInDate.lte = new Date(endDate as string);
    }

    const take = limit ? parseInt(limit as string) : 50;
    const skip = offset ? parseInt(offset as string) : 0;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        },
        payments: true,
        _count: {
          select: {
            maintenanceTasks: true
          }
        }
      },
      orderBy: {
        checkInDate: 'desc'
      },
      ...(limit ? { take } : {}),
      ...(offset ? { skip } : {})
    });

    // Calculate nights count for each booking
    const bookingsWithNights = bookings.map((booking: any) => ({
      ...booking,
      nightsCount: Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    }));

    const total = await prisma.booking.count({ where });

    res.json({
      bookings: bookingsWithNights,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip !== undefined && take !== undefined ? (skip + take) < total : false
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      error: 'Failed to fetch bookings',
      message: 'An error occurred while fetching bookings'
    });
  }
});

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get a single booking by ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Booking'
 *                     - type: object
 *                       properties:
 *                         nightsCount:
 *                           type: integer
 *                         property:
 *                           $ref: '#/components/schemas/Property'
 *                         payments:
 *                           type: array
 *                           items:
 *                             type: object
 *                         maintenanceTasks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MaintenanceTask'
 *       400:
 *         description: Invalid booking ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Get single booking by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Booking ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Booking ID is required'
      });
      return;
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        property: {
          userId: req.user!.id
        }
      },
      include: {
        property: true,
        payments: {
          orderBy: {
            paymentDate: 'desc'
          }
        },
        maintenanceTasks: {
          include: {
            serviceProvider: true
          },
          orderBy: {
            scheduledDate: 'asc'
          }
        }
      }
    });

    if (!booking) {
      res.status(404).json({
        error: 'Booking not found',
        message: 'The requested booking could not be found'
      });
      return;
    }

    // Calculate nights count
    const nightsCount = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      booking: {
        ...booking,
        nightsCount
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      error: 'Failed to fetch booking',
      message: 'An error occurred while fetching the booking'
    });
  }
});

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - guestName
 *               - numberOfGuests
 *               - checkInDate
 *               - checkOutDate
 *               - baseAmount
 *               - totalAmount
 *             properties:
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the property to book
 *               guestName:
 *                 type: string
 *                 maxLength: 200
 *                 description: Name of the guest
 *               guestEmail:
 *                 type: string
 *                 format: email
 *                 description: Guest email address
 *               guestPhone:
 *                 type: string
 *                 description: Guest phone number
 *               numberOfGuests:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of guests
 *               checkInDate:
 *                 type: string
 *                 format: date
 *                 description: Check-in date (YYYY-MM-DD)
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *                 description: Check-out date (YYYY-MM-DD)
 *               baseAmount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Base amount for the booking
 *               totalAmount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Total amount including fees
 *               notes:
 *                 type: string
 *                 description: Additional notes for the booking
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error or booking conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Create new booking
router.post('/', validate(bookingValidation), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      propertyId,
      guestName,
      guestEmail,
      guestPhone,
      numberOfGuests,
      checkInDate,
      checkOutDate,
      baseAmount,
      cleaningFee,
      taxes,
      totalAmount,
      securityDeposit,
      specialRequests,
      internalNotes,
      bookingSource,
      confirmationCode
    } = req.body;

    // Verify property belongs to user
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId: req.user!.id
      }
    });

    if (!property) {
      res.status(404).json({
        error: 'Property not found',
        message: 'The specified property could not be found'
      });
      return;
    }

    // Check date validity
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    if (checkOut <= checkIn) {
      res.status(400).json({
        error: 'Invalid dates',
        message: 'Check-out date must be after check-in date'
      });
      return;
    }

    // Check guest capacity
    if (numberOfGuests > property.maxOccupancy) {
      res.status(400).json({
        error: 'Exceeds capacity',
        message: `Number of guests (${numberOfGuests}) exceeds property capacity (${property.maxOccupancy})`
      });
      return;
    }

    // Check for overlapping bookings
    const overlappingBooking = await prisma.booking.findFirst({
      where: {
        propertyId,
        bookingStatus: {
          notIn: ['cancelled', 'no_show']
        },
        OR: [
          {
            checkInDate: {
              lt: checkOut
            },
            checkOutDate: {
              gt: checkIn
            }
          }
        ]
      }
    });

    if (overlappingBooking) {
      res.status(400).json({
        error: 'Booking conflict',
        message: 'The selected dates conflict with an existing booking'
      });
      return;
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        propertyId,
        guestName,
        guestEmail,
        guestPhone,
        numberOfGuests: parseInt(numberOfGuests),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        baseAmount: parseFloat(baseAmount),
        cleaningFee: cleaningFee ? parseFloat(cleaningFee) : 0,
        taxes: taxes ? parseFloat(taxes) : 0,
        totalAmount: parseFloat(totalAmount),
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : 0,
        specialRequests,
        internalNotes,
        bookingSource,
        confirmationCode
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    });

    // Automatically create cleaning task for checkout
    await prisma.maintenanceTask.create({
      data: {
        propertyId,
        bookingId: booking.id,
        taskType: 'cleaning',
        title: `Cleaning after ${guestName}`,
        description: `Post-checkout cleaning for booking ${booking.confirmationCode || booking.id}`,
        scheduledDate: checkOut,
        priority: 'high'
      }
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      error: 'Failed to create booking',
      message: 'An error occurred while creating the booking'
    });
  }
});

/**
 * @swagger
 * /api/bookings/{id}:
 *   put:
 *     summary: Update a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *               guestName:
 *                 type: string
 *                 maxLength: 200
 *               guestEmail:
 *                 type: string
 *                 format: email
 *               guestPhone:
 *                 type: string
 *               numberOfGuests:
 *                 type: integer
 *                 minimum: 1
 *               checkInDate:
 *                 type: string
 *                 format: date
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *               baseAmount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               totalAmount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error or invalid booking ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Update booking
router.put('/:id', [
  param('id').isUUID().withMessage('Booking ID must be a valid UUID'),
  ...bookingValidation.map(validation => validation.optional())
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Booking ID is required'
      });
      return;
    }
    
    const updateData = { ...req.body };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Type conversions
    if (updateData.numberOfGuests) updateData.numberOfGuests = parseInt(updateData.numberOfGuests);
    if (updateData.baseAmount) updateData.baseAmount = parseFloat(updateData.baseAmount);
    if (updateData.cleaningFee) updateData.cleaningFee = parseFloat(updateData.cleaningFee);
    if (updateData.taxes) updateData.taxes = parseFloat(updateData.taxes);
    if (updateData.totalAmount) updateData.totalAmount = parseFloat(updateData.totalAmount);
    if (updateData.securityDeposit) updateData.securityDeposit = parseFloat(updateData.securityDeposit);
    if (updateData.checkInDate) updateData.checkInDate = new Date(updateData.checkInDate);
    if (updateData.checkOutDate) updateData.checkOutDate = new Date(updateData.checkOutDate);

    const booking = await prisma.booking.updateMany({
      where: {
        id,
        property: {
          userId: req.user!.id
        }
      },
      data: updateData
    });

    if (booking.count === 0) {
      res.status(404).json({
        error: 'Booking not found',
        message: 'The requested booking could not be found'
      });
      return;
    }

    // Fetch updated booking
    const updatedBooking = await prisma.booking.findFirst({
      where: { 
        id,
        property: {
          userId: req.user!.id
        }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    });

    res.json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      error: 'Failed to update booking',
      message: 'An error occurred while updating the booking'
    });
  }
});

/**
 * @swagger
 * /api/bookings/{id}:
 *   delete:
 *     summary: Delete a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking deleted successfully"
 *       400:
 *         description: Invalid booking ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Delete booking
router.delete('/:id', [
  param('id').isUUID().withMessage('Booking ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Booking ID is required'
      });
      return;
    }

    const result = await prisma.booking.deleteMany({
      where: {
        id,
        property: {
          userId: req.user!.id
        }
      }
    });

    if (result.count === 0) {
      res.status(404).json({
        error: 'Booking not found',
        message: 'The requested booking could not be found'
      });
      return;
    }

    res.json({
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      error: 'Failed to delete booking',
      message: 'An error occurred while deleting the booking'
    });
  }
});

export default router;
