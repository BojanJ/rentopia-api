import express, { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

/**
 * @swagger
 * tags:
 *   - name: Service Providers
 *     description: Service provider management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/service-providers:
 *   get:
 *     summary: Get all service providers for user
 *     tags: [Service Providers]
 *     parameters:
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [cleaning, maintenance, repair, landscaping, security, other]
 *         description: Filter by service type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 50
 *         description: Number of service providers to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of service providers to skip
 *     responses:
 *       200:
 *         description: Service providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serviceProviders:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ServiceProvider'
 *                       - type: object
 *                         properties:
 *                           _count:
 *                             type: object
 *                             properties:
 *                               maintenanceTasks:
 *                                 type: integer
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

// Get all service providers for user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, isActive, limit, offset } = req.query;

    const where: any = {
      userId: req.user!.id
    };

    // Add filters
    if (serviceType) {
      where.serviceType = serviceType;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const take = limit ? parseInt(limit as string) : 50;
    const skip = offset ? parseInt(offset as string) : 0;

    const serviceProviders = await prisma.serviceProvider.findMany({
      where,
      include: {
        _count: {
          select: {
            maintenanceTasks: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      ...(limit ? { take } : {}),
      ...(offset ? { skip } : {})
    });

    const total = await prisma.serviceProvider.count({ where });

    res.json({
      serviceProviders,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip !== undefined && take !== undefined ? (skip + take) < total : false
      }
    });
  } catch (error) {
    console.error('Get service providers error:', error);
    res.status(500).json({
      error: 'Failed to fetch service providers',
      message: 'An error occurred while fetching service providers'
    });
  }
});

// Validation rules for service providers
const serviceProviderValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name is required and must be less than 200 characters'),
  body('serviceType')
    .isIn(['cleaning', 'maintenance', 'repair', 'landscaping', 'security', 'other'])
    .withMessage('Service type must be one of: cleaning, maintenance, repair, landscaping, security, other'),
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name must be less than 200 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('addressLine1')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 1 must be less than 255 characters'),
  body('addressLine2')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must be less than 255 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),
  body('postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code must be less than 20 characters'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('flatRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Flat rate must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be true or false')
];

/**
 * @swagger
 * /api/service-providers:
 *   post:
 *     summary: Create a new service provider
 *     tags: [Service Providers]
 *     description: Register a new service provider for property management tasks. The service provider will be associated with the authenticated user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - serviceType
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 description: Name of the service provider company or individual
 *                 example: "Crystal Clean Services"
 *               serviceType:
 *                 type: string
 *                 enum: [cleaning, maintenance, repair, landscaping, security, other]
 *                 description: Primary type of service provided
 *                 example: "cleaning"
 *               companyName:
 *                 type: string
 *                 maxLength: 200
 *                 description: Company or business name
 *                 example: "Crystal Clean LLC"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Contact email address
 *                 example: "sarah@crystalclean.com"
 *               phone:
 *                 type: string
 *                 description: Contact phone number
 *                 example: "+1-555-123-4567"
 *               addressLine1:
 *                 type: string
 *                 maxLength: 255
 *                 description: First line of business address
 *                 example: "123 Main St, Suite 200"
 *               addressLine2:
 *                 type: string
 *                 maxLength: 255
 *                 description: Second line of business address
 *                 example: "Apt 5B"
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 description: City
 *                 example: "Anytown"
 *               state:
 *                 type: string
 *                 maxLength: 100
 *                 description: State or province
 *                 example: "CA"
 *               postalCode:
 *                 type: string
 *                 maxLength: 20
 *                 description: Postal or ZIP code
 *                 example: "90210"
 *               hourlyRate:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Standard hourly rate in dollars
 *                 example: 35.00
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes about the service provider
 *                 example: "Preferred for luxury properties. Always punctual and professional."
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the service provider is currently active
 *           example:
 *             name: "Crystal Clean Services"
 *             serviceType: "cleaning"
 *             companyName: "Crystal Clean LLC"
 *             email: "sarah@crystalclean.com"
 *             phone: "+1-555-123-4567"
 *             addressLine1: "123 Main St, Suite 200"
 *             city: "Anytown"
 *             state: "CA"
 *             postalCode: "90210"
 *             hourlyRate: 35.00
 *             flatRate: 150.00
 *             notes: "Eco-friendly cleaning products, excellent for luxury properties"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Service provider created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service provider created successfully"
 *                 serviceProvider:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ServiceProvider'
 *                     - type: object
 *                       properties:
 *                         _count:
 *                           type: object
 *                           properties:
 *                             maintenanceTasks:
 *                               type: integer
 *                               example: 0
 *       400:
 *         description: Validation error
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

// Create new service provider
router.post('/', validate(serviceProviderValidation), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      serviceType,
      companyName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      hourlyRate,
      flatRate,
      notes,
      isActive = true
    } = req.body;

    const serviceProvider = await prisma.serviceProvider.create({
      data: {
        name,
        serviceType,
        companyName,
        email,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        hourlyRate,
        flatRate,
        notes,
        isActive,
        userId: req.user!.id
      },
      include: {
        _count: {
          select: {
            maintenanceTasks: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Service provider created successfully',
      serviceProvider
    });
  } catch (error) {
    console.error('Create service provider error:', error);
    res.status(500).json({
      error: 'Failed to create service provider',
      message: 'An error occurred while creating the service provider'
    });
  }
});

/**
 * @swagger
 * /api/service-providers/{id}:
 *   get:
 *     summary: Get a specific service provider
 *     tags: [Service Providers]
 *     description: Retrieve detailed information about a specific service provider, including their maintenance task history. The service provider must belong to the authenticated user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service provider ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Service provider retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serviceProvider:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ServiceProvider'
 *                     - type: object
 *                       properties:
 *                         _count:
 *                           type: object
 *                           properties:
 *                             maintenanceTasks:
 *                               type: integer
 *                               description: Total number of maintenance tasks assigned
 *                         maintenanceTasks:
 *                           type: array
 *                           description: Recent maintenance tasks (last 10)
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/MaintenanceTask'
 *                               - type: object
 *                                 properties:
 *                                   property:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                       name:
 *                                         type: string
 *                                       city:
 *                                         type: string
 *                                       state:
 *                                         type: string
 *       400:
 *         description: Invalid service provider ID
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
 *         description: Service provider not found
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

// Get single service provider by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Service provider ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Service provider ID is required'
      });
      return;
    }

    const serviceProvider = await prisma.serviceProvider.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        _count: {
          select: {
            maintenanceTasks: true
          }
        },
        maintenanceTasks: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
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
        }
      }
    });

    if (!serviceProvider) {
      res.status(404).json({
        error: 'Service provider not found',
        message: 'The requested service provider could not be found'
      });
      return;
    }

    res.json({ serviceProvider });
  } catch (error) {
    console.error('Get service provider error:', error);
    res.status(500).json({
      error: 'Failed to fetch service provider',
      message: 'An error occurred while fetching the service provider'
    });
  }
});

/**
 * @swagger
 * /api/service-providers/{id}:
 *   put:
 *     summary: Update a service provider
 *     tags: [Service Providers]
 *     description: Update an existing service provider's information. The service provider must belong to the authenticated user. All fields are optional for updates.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 description: Name of the service provider
 *               serviceType:
 *                 type: string
 *                 enum: [cleaning, maintenance, repair, landscaping, security, other]
 *                 description: Type of service provided
 *               companyName:
 *                 type: string
 *                 maxLength: 200
 *                 description: Company or business name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Contact email address
 *               phone:
 *                 type: string
 *                 description: Contact phone number
 *               addressLine1:
 *                 type: string
 *                 maxLength: 255
 *                 description: First line of business address
 *               addressLine2:
 *                 type: string
 *                 maxLength: 255
 *                 description: Second line of business address
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 description: City
 *               state:
 *                 type: string
 *                 maxLength: 100
 *                 description: State or province
 *               postalCode:
 *                 type: string
 *                 maxLength: 20
 *                 description: Postal or ZIP code
 *               hourlyRate:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Standard hourly rate in dollars
 *               flatRate:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Fixed rate for specific services in dollars
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes
 *               isActive:
 *                 type: boolean
 *                 description: Whether the service provider is active
 *           example:
 *             hourlyRate: 40.00
 *             notes: "Raised rates due to excellent performance and client satisfaction"
 *             isActive: true
 *     responses:
 *       200:
 *         description: Service provider updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service provider updated successfully"
 *                 serviceProvider:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ServiceProvider'
 *                     - type: object
 *                       properties:
 *                         _count:
 *                           type: object
 *                           properties:
 *                             maintenanceTasks:
 *                               type: integer
 *       400:
 *         description: Validation error or invalid service provider ID
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
 *         description: Service provider not found
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

// Update service provider
router.put('/:id', [
  param('id').isUUID().withMessage('Service provider ID must be a valid UUID'),
  ...serviceProviderValidation.map(validation => validation.optional())
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Service provider ID is required'
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
    if (updateData.hourlyRate) updateData.hourlyRate = parseFloat(updateData.hourlyRate);
    if (updateData.isActive !== undefined) updateData.isActive = Boolean(updateData.isActive);

    const result = await prisma.serviceProvider.updateMany({
      where: {
        id,
        userId: req.user!.id
      },
      data: updateData
    });

    if (result.count === 0) {
      res.status(404).json({
        error: 'Service provider not found',
        message: 'The requested service provider could not be found'
      });
      return;
    }

    // Fetch updated service provider
    const updatedServiceProvider = await prisma.serviceProvider.findFirst({
      where: { 
        id,
        userId: req.user!.id
      },
      include: {
        _count: {
          select: {
            maintenanceTasks: true
          }
        }
      }
    });

    res.json({
      message: 'Service provider updated successfully',
      serviceProvider: updatedServiceProvider
    });
  } catch (error) {
    console.error('Update service provider error:', error);
    res.status(500).json({
      error: 'Failed to update service provider',
      message: 'An error occurred while updating the service provider'
    });
  }
});

/**
 * @swagger
 * /api/service-providers/{id}:
 *   delete:
 *     summary: Delete a service provider
 *     tags: [Service Providers]
 *     description: Delete a service provider permanently. The service provider must belong to the authenticated user. This action cannot be undone. Service providers with active maintenance tasks cannot be deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service provider ID
 *     responses:
 *       200:
 *         description: Service provider deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service provider deleted successfully"
 *       400:
 *         description: Invalid service provider ID
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
 *         description: Service provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete service provider with active maintenance tasks
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

// Delete service provider
router.delete('/:id', [
  param('id').isUUID().withMessage('Service provider ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Service provider ID is required'
      });
      return;
    }

    // Check if service provider has active maintenance tasks
    const providerWithTasks = await prisma.serviceProvider.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        maintenanceTasks: {
          where: {
            taskStatus: {
              in: ['scheduled', 'in_progress']
            }
          }
        }
      }
    });

    if (!providerWithTasks) {
      res.status(404).json({
        error: 'Service provider not found',
        message: 'The requested service provider could not be found'
      });
      return;
    }

    if (providerWithTasks.maintenanceTasks.length > 0) {
      res.status(409).json({
        error: 'Cannot delete service provider',
        message: `Cannot delete service provider with ${providerWithTasks.maintenanceTasks.length} active maintenance task(s). Please complete or reassign tasks first.`
      });
      return;
    }

    const result = await prisma.serviceProvider.deleteMany({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (result.count === 0) {
      res.status(404).json({
        error: 'Service provider not found',
        message: 'The requested service provider could not be found'
      });
      return;
    }

    res.json({
      message: 'Service provider deleted successfully'
    });
  } catch (error) {
    console.error('Delete service provider error:', error);
    res.status(500).json({
      error: 'Failed to delete service provider',
      message: 'An error occurred while deleting the service provider'
    });
  }
});

export default router;
