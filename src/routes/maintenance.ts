import express, { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../server';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Maintenance task management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/maintenance:
 *   get:
 *     summary: Get all maintenance tasks for user's properties
 *     tags: [Maintenance]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled, overdue]
 *         description: Filter by task status
 *       - in: query
 *         name: taskType
 *         schema:
 *           type: string
 *           enum: [cleaning, repair, inspection, maintenance, emergency, other]
 *         description: Filter by task type
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
 *         description: Filter tasks from this scheduled date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tasks until this scheduled date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 50
 *         description: Number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of tasks to skip
 *     responses:
 *       200:
 *         description: Maintenance tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/MaintenanceTask'
 *                       - type: object
 *                         properties:
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
 *                           serviceProvider:
 *                             $ref: '#/components/schemas/ServiceProvider'
 *                           booking:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               guestName:
 *                                 type: string
 *                               confirmationCode:
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

// Get all maintenance tasks for user's properties
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, taskType, propertyId, startDate, endDate, limit, offset } = req.query;

    const where: any = {
      property: {
        userId: req.user!.id
      }
    };

    // Add filters
    if (status) {
      where.taskStatus = status;
    }
    if (taskType) {
      where.taskType = taskType;
    }
    if (propertyId) {
      where.propertyId = propertyId;
    }
    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate as string);
      if (endDate) where.scheduledDate.lte = new Date(endDate as string);
    }

    const take = limit ? parseInt(limit as string) : 50;
    const skip = offset ? parseInt(offset as string) : 0;

    const tasks = await prisma.maintenanceTask.findMany({
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
        serviceProvider: true,
        booking: {
          select: {
            id: true,
            guestName: true,
            confirmationCode: true
          }
        },
        payments: true
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      ...(limit ? { take } : {}),
      ...(offset ? { skip } : {})
    });

    const total = await prisma.maintenanceTask.count({ where });

    res.json({
      tasks,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip !== undefined && take !== undefined ? (skip + take) < total : false
      }
    });
  } catch (error) {
    console.error('Get maintenance tasks error:', error);
    res.status(500).json({
      error: 'Failed to fetch maintenance tasks',
      message: 'An error occurred while fetching maintenance tasks'
    });
  }
});

// Validation rules for maintenance tasks
const maintenanceTaskValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Property ID must be a valid UUID'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('taskType')
    .isIn(['cleaning', 'repair', 'inspection', 'maintenance', 'emergency', 'other'])
    .withMessage('Task type must be one of: cleaning, repair, inspection, maintenance, emergency, other'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
  body('serviceProviderId')
    .optional()
    .isUUID()
    .withMessage('Service provider ID must be a valid UUID'),
  body('bookingId')
    .optional()
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
  body('estimatedCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated cost must be a positive number'),
  body('actualCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual cost must be a positive number'),
  body('completionNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Completion notes must be less than 1000 characters')
];

/**
 * @swagger
 * /api/maintenance:
 *   post:
 *     summary: Create a new maintenance task
 *     tags: [Maintenance]
 *     description: Create a new maintenance task for a property. The property must belong to the authenticated user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - title
 *               - taskType
 *               - scheduledDate
 *             properties:
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the property for this task
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Brief title of the maintenance task
 *                 example: "Fix leaky faucet in bathroom"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Detailed description of the task
 *                 example: "Guest reported dripping faucet in master bathroom. Need to replace washer or entire fixture."
 *               taskType:
 *                 type: string
 *                 enum: [cleaning, repair, inspection, maintenance, emergency, other]
 *                 description: Type of maintenance task
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *                 description: Priority level of the task
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the task is scheduled to be performed
 *               serviceProviderId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional ID of assigned service provider
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional related booking ID
 *               estimatedCost:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Estimated cost in dollars
 *               actualCost:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Actual cost in dollars (if completed)
 *               completionNotes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Notes about task completion
 *           example:
 *             propertyId: "550e8400-e29b-41d4-a716-446655440000"
 *             title: "Post-checkout deep cleaning"
 *             description: "Deep clean apartment after guest checkout, change all linens, restock amenities"
 *             taskType: "cleaning"
 *             priority: "high"
 *             scheduledDate: "2025-08-15T10:00:00Z"
 *             serviceProviderId: "660e8400-e29b-41d4-a716-446655440001"
 *             estimatedCost: 125.00
 *     responses:
 *       201:
 *         description: Maintenance task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Maintenance task created successfully"
 *                 task:
 *                   allOf:
 *                     - $ref: '#/components/schemas/MaintenanceTask'
 *                     - type: object
 *                       properties:
 *                         property:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             city:
 *                               type: string
 *                             state:
 *                               type: string
 *                         serviceProvider:
 *                           $ref: '#/components/schemas/ServiceProvider'
 *       400:
 *         description: Validation error or invalid property
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
 *         description: Property not found or doesn't belong to user
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

// Create new maintenance task
router.post('/', validate(maintenanceTaskValidation), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      propertyId,
      title,
      description,
      taskType,
      priority = 'medium',
      scheduledDate,
      serviceProviderId,
      bookingId,
      estimatedCost,
      actualCost,
      completionNotes
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
        message: 'The specified property could not be found or does not belong to you'
      });
      return;
    }

    // If service provider is specified, verify it belongs to user
    if (serviceProviderId) {
      const serviceProvider = await prisma.serviceProvider.findFirst({
        where: {
          id: serviceProviderId,
          userId: req.user!.id
        }
      });

      if (!serviceProvider) {
        res.status(404).json({
          error: 'Service provider not found',
          message: 'The specified service provider could not be found or does not belong to you'
        });
        return;
      }
    }

    // If booking is specified, verify it belongs to user's property
    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          property: {
            userId: req.user!.id
          }
        }
      });

      if (!booking) {
        res.status(404).json({
          error: 'Booking not found',
          message: 'The specified booking could not be found or does not belong to your properties'
        });
        return;
      }
    }

    const task = await prisma.maintenanceTask.create({
      data: {
        propertyId,
        title,
        description,
        taskType,
        priority,
        scheduledDate: new Date(scheduledDate),
        serviceProviderId,
        bookingId,
        estimatedCost,
        actualCost,
        completionNotes,
        taskStatus: 'scheduled'
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        },
        serviceProvider: true,
        booking: {
          select: {
            id: true,
            guestName: true,
            confirmationCode: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Maintenance task created successfully',
      task
    });
  } catch (error) {
    console.error('Create maintenance task error:', error);
    res.status(500).json({
      error: 'Failed to create maintenance task',
      message: 'An error occurred while creating the maintenance task'
    });
  }
});

/**
 * @swagger
 * /api/maintenance/{id}:
 *   get:
 *     summary: Get a specific maintenance task
 *     tags: [Maintenance]
 *     description: Retrieve detailed information about a specific maintenance task. The task must belong to a property owned by the authenticated user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance task ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Maintenance task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   allOf:
 *                     - $ref: '#/components/schemas/MaintenanceTask'
 *                     - type: object
 *                       properties:
 *                         property:
 *                           $ref: '#/components/schemas/Property'
 *                         serviceProvider:
 *                           $ref: '#/components/schemas/ServiceProvider'
 *                         booking:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             guestName:
 *                               type: string
 *                             confirmationCode:
 *                               type: string
 *                             checkInDate:
 *                               type: string
 *                               format: date-time
 *                             checkOutDate:
 *                               type: string
 *                               format: date-time
 *                         payments:
 *                           type: array
 *                           items:
 *                             type: object
 *       400:
 *         description: Invalid maintenance task ID
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
 *         description: Maintenance task not found
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

// Get single maintenance task by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Maintenance task ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Maintenance task ID is required'
      });
      return;
    }

    const task = await prisma.maintenanceTask.findFirst({
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
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            propertyType: true
          }
        },
        serviceProvider: true,
        booking: {
          select: {
            id: true,
            guestName: true,
            confirmationCode: true,
            checkInDate: true,
            checkOutDate: true,
            numberOfGuests: true
          }
        },
        payments: true
      }
    });

    if (!task) {
      res.status(404).json({
        error: 'Task not found',
        message: 'The requested maintenance task could not be found'
      });
      return;
    }

    res.json({ task });
  } catch (error) {
    console.error('Get maintenance task error:', error);
    res.status(500).json({
      error: 'Failed to fetch maintenance task',
      message: 'An error occurred while fetching the maintenance task'
    });
  }
});

/**
 * @swagger
 * /api/maintenance/{id}:
 *   put:
 *     summary: Update a maintenance task
 *     tags: [Maintenance]
 *     description: Update an existing maintenance task. The task must belong to a property owned by the authenticated user. All fields are optional for updates.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Brief title of the maintenance task
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Detailed description of the task
 *               taskType:
 *                 type: string
 *                 enum: [cleaning, repair, inspection, maintenance, emergency, other]
 *                 description: Type of maintenance task
 *               taskStatus:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled, overdue]
 *                 description: Current status of the task
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Priority level of the task
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the task is scheduled to be performed
 *               completedDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the task was completed (if applicable)
 *               serviceProviderId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of assigned service provider
 *               estimatedCost:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Estimated cost in dollars
 *               actualCost:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Actual cost in dollars
 *               completionNotes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Notes about task completion
 *           example:
 *             taskStatus: "completed"
 *             completedDate: "2025-08-15T14:30:00Z"
 *             actualCost: 135.50
 *             completionNotes: "Task completed successfully. Guest very satisfied with quick response."
 *     responses:
 *       200:
 *         description: Maintenance task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Maintenance task updated successfully"
 *                 task:
 *                   allOf:
 *                     - $ref: '#/components/schemas/MaintenanceTask'
 *                     - type: object
 *                       properties:
 *                         property:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             city:
 *                               type: string
 *                             state:
 *                               type: string
 *                         serviceProvider:
 *                           $ref: '#/components/schemas/ServiceProvider'
 *       400:
 *         description: Validation error or invalid task ID
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
 *         description: Maintenance task not found
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

// Update maintenance task
router.put('/:id', [
  param('id').isUUID().withMessage('Maintenance task ID must be a valid UUID'),
  ...maintenanceTaskValidation.map(validation => validation.optional())
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Maintenance task ID is required'
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
    if (updateData.estimatedCost) updateData.estimatedCost = parseFloat(updateData.estimatedCost);
    if (updateData.actualCost) updateData.actualCost = parseFloat(updateData.actualCost);
    if (updateData.scheduledDate) updateData.scheduledDate = new Date(updateData.scheduledDate);
    if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate);

    // If service provider is being updated, verify it belongs to user
    if (updateData.serviceProviderId) {
      const serviceProvider = await prisma.serviceProvider.findFirst({
        where: {
          id: updateData.serviceProviderId,
          userId: req.user!.id
        }
      });

      if (!serviceProvider) {
        res.status(404).json({
          error: 'Service provider not found',
          message: 'The specified service provider could not be found or does not belong to you'
        });
        return;
      }
    }

    const result = await prisma.maintenanceTask.updateMany({
      where: {
        id,
        property: {
          userId: req.user!.id
        }
      },
      data: updateData
    });

    if (result.count === 0) {
      res.status(404).json({
        error: 'Task not found',
        message: 'The requested maintenance task could not be found'
      });
      return;
    }

    // Fetch updated task
    const updatedTask = await prisma.maintenanceTask.findFirst({
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
        },
        serviceProvider: true,
        booking: {
          select: {
            id: true,
            guestName: true,
            confirmationCode: true
          }
        }
      }
    });

    res.json({
      message: 'Maintenance task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update maintenance task error:', error);
    res.status(500).json({
      error: 'Failed to update maintenance task',
      message: 'An error occurred while updating the maintenance task'
    });
  }
});

/**
 * @swagger
 * /api/maintenance/{id}:
 *   delete:
 *     summary: Delete a maintenance task
 *     tags: [Maintenance]
 *     description: Delete a maintenance task permanently. The task must belong to a property owned by the authenticated user. This action cannot be undone.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Maintenance task ID
 *     responses:
 *       200:
 *         description: Maintenance task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Maintenance task deleted successfully"
 *       400:
 *         description: Invalid maintenance task ID
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
 *         description: Maintenance task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete task with existing payments
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

// Delete maintenance task
router.delete('/:id', [
  param('id').isUUID().withMessage('Maintenance task ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Maintenance task ID is required'
      });
      return;
    }

    // Check if task has payments first
    const taskWithPayments = await prisma.maintenanceTask.findFirst({
      where: {
        id,
        property: {
          userId: req.user!.id
        }
      },
      include: {
        payments: true
      }
    });

    if (!taskWithPayments) {
      res.status(404).json({
        error: 'Task not found',
        message: 'The requested maintenance task could not be found'
      });
      return;
    }

    if (taskWithPayments.payments.length > 0) {
      res.status(409).json({
        error: 'Cannot delete task',
        message: 'Cannot delete maintenance task that has associated payments. Please delete payments first.'
      });
      return;
    }

    const result = await prisma.maintenanceTask.deleteMany({
      where: {
        id,
        property: {
          userId: req.user!.id
        }
      }
    });

    if (result.count === 0) {
      res.status(404).json({
        error: 'Task not found',
        message: 'The requested maintenance task could not be found'
      });
      return;
    }

    res.json({
      message: 'Maintenance task deleted successfully'
    });
  } catch (error) {
    console.error('Delete maintenance task error:', error);
    res.status(500).json({
      error: 'Failed to delete maintenance task',
      message: 'An error occurred while deleting the maintenance task'
    });
  }
});

export default router;
