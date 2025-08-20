import express, { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../server';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management endpoints
 */

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const propertyValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Property name is required and must be less than 200 characters'),
  body('addressLine1')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Address line 1 is required and must be less than 255 characters'),
  body('addressLine2')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must be less than 255 characters'),
  body('city')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City is required and must be less than 100 characters'),
  body('country')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country is required and must be less than 100 characters'),
  body('propertyType')
    .isIn(['apartment', 'house', 'condo', 'studio', 'villa', 'other'])
    .withMessage('Property type must be one of: apartment, house, condo, studio, villa, other'),
  body('bedrooms')
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms')
    .isFloat({ min: 0 })
    .withMessage('Bathrooms must be a non-negative number'),
  body('maxOccupancy')
    .isInt({ min: 1 })
    .withMessage('Max occupancy must be at least 1'),
  body('basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number')
];

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties for the authenticated user
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city name
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [apartment, house, condo, townhouse, studio, loft, other]
 *         description: Filter by property type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of properties to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of properties to skip
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 properties:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
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

// Get all properties for user
router.get('/', async (req, res) => {
  try {
    const { status, city, propertyType, limit, offset } = req.query;

    const where: any = {
      userId: req.user!.id
    };

    // Add filters
    if (status) {
      where.status = status;
    }
    if (city) {
      where.city = {
        contains: city as string,
        mode: 'insensitive'
      };
    }
    if (propertyType) {
      where.propertyType = propertyType;
    }

    const take = limit ? parseInt(limit as string) : 50;
    const skip = offset ? parseInt(offset as string) : 0;

    const properties = await prisma.property.findMany({
      where,
      include: {
        images: {
          orderBy: {
            displayOrder: 'asc'
          }
        },
        _count: {
          select: {
            bookings: true,
            maintenanceTasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...(limit ? { take } : {}),
      ...(offset ? { skip } : {})
    });

    const total = await prisma.property.count({ where });

    res.json({
      properties,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip !== undefined && take !== undefined ? (skip + take) < total : false
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      error: 'Failed to fetch properties',
      message: 'An error occurred while fetching your properties'
    });
  }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get a single property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 property:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Property'
 *                     - type: object
 *                       properties:
 *                         images:
 *                           type: array
 *                           items:
 *                             type: object
 *                         maintenanceTasks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MaintenanceTask'
 *       400:
 *         description: Invalid property ID
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
 *         description: Property not found
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

// Get a single property by ID
router.get('/:id', [
  param('id')
    .isUUID()
    .withMessage('Property ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Property ID is required'
      });
      return;
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        images: {
          orderBy: {
            displayOrder: 'asc'
          }
        },
        bookings: {
          orderBy: {
            checkInDate: 'desc'
          }
        },
        maintenanceTasks: {
          orderBy: {
            scheduledDate: 'desc'
          },
          include: {
            serviceProvider: true
          }
        }
      }
    });

    if (!property) {
      res.status(404).json({
        error: 'Property not found',
        message: 'The requested property could not be found'
      });
      return;
    }

    res.json({ property });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      error: 'Failed to fetch property',
      message: 'An error occurred while fetching the property'
    });
  }
});

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - addressLine1
 *               - city
 *               - state
 *               - country
 *               - zipCode
 *               - propertyType
 *               - bedrooms
 *               - bathrooms
 *               - maxOccupancy
 *               - basePrice
 *               - cleaningFee
 *               - securityDeposit
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 description: Property name
 *               description:
 *                 type: string
 *                 description: Property description
 *               addressLine1:
 *                 type: string
 *                 maxLength: 255
 *                 description: Primary address line
 *               addressLine2:
 *                 type: string
 *                 maxLength: 255
 *                 description: Secondary address line
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 description: City name
 *               state:
 *                 type: string
 *                 maxLength: 100
 *                 description: State/Province
 *               country:
 *                 type: string
 *                 maxLength: 100
 *                 description: Country
 *               zipCode:
 *                 type: string
 *                 maxLength: 20
 *                 description: ZIP/Postal code
 *               propertyType:
 *                 type: string
 *                 enum: [apartment, house, condo, townhouse, studio, loft, other]
 *                 description: Type of property
 *               bedrooms:
 *                 type: integer
 *                 minimum: 0
 *                 description: Number of bedrooms
 *               bathrooms:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Number of bathrooms
 *               maxOccupancy:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum number of guests
 *               squareFeet:
 *                 type: integer
 *                 minimum: 0
 *                 description: Square footage
 *               basePrice:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Base price per night
 *               cleaningFee:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Cleaning fee
 *               securityDeposit:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Security deposit amount
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 property:
 *                   $ref: '#/components/schemas/Property'
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

// Create a new property
router.post('/', validate(propertyValidation), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      propertyType,
      bedrooms,
      bathrooms,
      maxOccupancy,
      squareFeet,
      amenities,
      houseRules,
      checkInTime,
      checkOutTime,
      basePrice,
      cleaningFee,
      securityDeposit
    } = req.body;

    const property = await prisma.property.create({
      data: {
        userId: req.user!.id,
        name,
        description,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        propertyType,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseFloat(bathrooms),
        maxOccupancy: parseInt(maxOccupancy),
        squareFeet: squareFeet ? parseInt(squareFeet) : null,
        amenities: amenities || [],
        houseRules,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        basePrice: parseFloat(basePrice),
        cleaningFee: cleaningFee ? parseFloat(cleaningFee) : 0,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : 0
      },
      include: {
        images: true
      }
    });

    res.status(201).json({
      message: 'Property created successfully',
      property
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      error: 'Failed to create property',
      message: 'An error occurred while creating the property'
    });
  }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update a property
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
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
 *               description:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *                 maxLength: 255
 *               addressLine2:
 *                 type: string
 *                 maxLength: 255
 *               city:
 *                 type: string
 *                 maxLength: 100
 *               state:
 *                 type: string
 *                 maxLength: 100
 *               country:
 *                 type: string
 *                 maxLength: 100
 *               zipCode:
 *                 type: string
 *                 maxLength: 20
 *               propertyType:
 *                 type: string
 *                 enum: [apartment, house, condo, townhouse, studio, loft, other]
 *               bedrooms:
 *                 type: integer
 *                 minimum: 0
 *               bathrooms:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               maxOccupancy:
 *                 type: integer
 *                 minimum: 1
 *               squareFeet:
 *                 type: integer
 *                 minimum: 0
 *               basePrice:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               cleaningFee:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *               securityDeposit:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Property updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 property:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Validation error or invalid property ID
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
 *         description: Property not found
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

// Update a property
router.put('/:id', [
  param('id').isUUID().withMessage('Property ID must be a valid UUID'),
  ...propertyValidation.map(validation => validation.optional())
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Property ID is required'
      });
      return;
    }
    
    const updateData = { ...req.body };

    // Remove undefined values and convert string numbers to appropriate types
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (updateData.bedrooms) updateData.bedrooms = parseInt(updateData.bedrooms);
    if (updateData.bathrooms) updateData.bathrooms = parseFloat(updateData.bathrooms);
    if (updateData.maxOccupancy) updateData.maxOccupancy = parseInt(updateData.maxOccupancy);
    if (updateData.squareFeet) updateData.squareFeet = parseInt(updateData.squareFeet);
    if (updateData.basePrice) updateData.basePrice = parseFloat(updateData.basePrice);
    if (updateData.cleaningFee) updateData.cleaningFee = parseFloat(updateData.cleaningFee);
    if (updateData.securityDeposit) updateData.securityDeposit = parseFloat(updateData.securityDeposit);

    const property = await prisma.property.updateMany({
      where: {
        id,
        userId: req.user!.id
      },
      data: updateData
    });

    if (property.count === 0) {
      res.status(404).json({
        error: 'Property not found',
        message: 'The requested property could not be found or you do not have permission to update it'
      });
      return;
    }

    // Fetch the updated property
    const updatedProperty = await prisma.property.findFirst({
      where: { 
        id,
        userId: req.user!.id
      },
      include: {
        images: {
          orderBy: {
            displayOrder: 'asc'
          }
        }
      }
    });

    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      error: 'Failed to update property',
      message: 'An error occurred while updating the property'
    });
  }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete a property
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Property deleted successfully"
 *       400:
 *         description: Invalid property ID or property has bookings
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
 *         description: Property not found
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

// Delete a property
router.delete('/:id', [
  param('id').isUUID().withMessage('Property ID must be a valid UUID')
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Property ID is required'
      });
      return;
    }

    // Check if property exists and belongs to user
    const property = await prisma.property.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        _count: {
          select: {
            bookings: true
          }
        }
      }
    });

    if (!property) {
      res.status(404).json({
        error: 'Property not found',
        message: 'The requested property could not be found or you do not have permission to delete it'
      });
      return;
    }

    // Check if property has bookings
    if (property._count.bookings > 0) {
      res.status(400).json({
        error: 'Cannot delete property',
        message: 'Cannot delete a property that has bookings. Please cancel or complete all bookings first.'
      });
      return;
    }

    await prisma.property.deleteMany({
      where: { 
        id,
        userId: req.user!.id
      }
    });

    res.json({
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      error: 'Failed to delete property',
      message: 'An error occurred while deleting the property'
    });
  }
});

export default router;
