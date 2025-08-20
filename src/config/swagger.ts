import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import path from "path";

export const getSwaggerOptions = (): swaggerJSDoc.Options => ({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Rentopia API",
      version: "1.0.0",
      description: "A comprehensive property rental management system API",
      contact: {
        name: "Rentopia API Support",
        email: "support@rentopia.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            details: { type: "array", items: { type: "object" } },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            phone: { type: "string", nullable: true },
            timezone: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                phone: { type: "string", nullable: true },
                timezone: { type: "string" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
            token: { type: "string" },
          },
        },
        Property: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            addressLine1: { type: "string" },
            addressLine2: { type: "string", nullable: true },
            city: { type: "string" },
            state: { type: "string" },
            country: { type: "string" },
            zipCode: { type: "string" },
            propertyType: {
              type: "string",
              enum: [
                "apartment",
                "house",
                "condo",
                "townhouse",
                "studio",
                "loft",
                "other",
              ],
            },
            bedrooms: { type: "integer" },
            bathrooms: { type: "number", format: "float" },
            maxOccupancy: { type: "integer" },
            squareFeet: { type: "integer", nullable: true },
            isActive: { type: "boolean" },
            basePrice: { type: "number", format: "decimal" },
            cleaningFee: { type: "number", format: "decimal" },
            securityDeposit: { type: "number", format: "decimal" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Booking: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            propertyId: { type: "string", format: "uuid" },
            guestName: { type: "string" },
            guestEmail: { type: "string", format: "email", nullable: true },
            guestPhone: { type: "string", nullable: true },
            numberOfGuests: { type: "integer" },
            checkInDate: { type: "string", format: "date" },
            checkOutDate: { type: "string", format: "date" },
            bookingStatus: {
              type: "string",
              enum: [
                "confirmed",
                "pending",
                "cancelled",
                "checked_in",
                "checked_out",
                "no_show",
              ],
            },
            baseAmount: { type: "number", format: "decimal" },
            totalAmount: { type: "number", format: "decimal" },
            confirmationCode: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        MaintenanceTask: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            propertyId: { type: "string", format: "uuid" },
            serviceProviderId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            bookingId: { type: "string", format: "uuid", nullable: true },
            title: { type: "string" },
            description: { type: "string" },
            taskType: {
              type: "string",
              enum: [
                "cleaning",
                "repair",
                "inspection",
                "maintenance",
                "emergency",
                "other",
              ],
            },
            taskStatus: {
              type: "string",
              enum: [
                "pending",
                "assigned",
                "in_progress",
                "completed",
                "cancelled",
              ],
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
            },
            estimatedCost: {
              type: "number",
              format: "decimal",
              nullable: true,
            },
            actualCost: { type: "number", format: "decimal", nullable: true },
            scheduledDate: { type: "string", format: "date-time" },
            completedDate: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ServiceProvider: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            serviceType: {
              type: "string",
              enum: [
                "cleaning",
                "maintenance",
                "repair",
                "landscaping",
                "security",
                "other",
              ],
            },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PaginationResponse: {
          type: "object",
          properties: {
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
            hasMore: { type: "boolean" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/routes/auth.ts",
    "./src/routes/properties.ts",
    "./src/routes/bookings.ts",
    "./src/routes/maintenance.ts",
    "./src/routes/serviceProviders.ts",
    "./src/server.ts",
  ],
});

let specs: any = null;

// Build swagger specs (strict). Let errors propagate so server.ts can disable Swagger if needed.
const buildSpecsSafely = () => {
  // Allow disabling JSDoc scan entirely via env for emergencies
  const disableScan = process.env.SWAGGER_DISABLE_SCAN === "true";

  const options = getSwaggerOptions() as any;
  if (disableScan) {
    options.apis = [];
  }

  // Be strict: throw on YAML errors
  options.failOnErrors = true;

  return swaggerJSDoc(options);
};

const getSpecs = () => {
  if (!specs) {
    specs = buildSpecsSafely();
  }
  return specs;
};

export const setupSwagger = (app: Express): void => {
  const specs = getSpecs();

  // Swagger page
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: `.swagger-ui .topbar { display: none }`,
      customSiteTitle: "Rentopia API Documentation",
    })
  );

  // Docs in JSON format
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  // Diagnostics: test each API file individually to find YAML/JSDoc issues
  app.get("/api-docs/diagnostics", (req, res) => {
    const baseOptions = getSwaggerOptions() as any;
    const files: string[] = baseOptions.apis || [];

    const results = files.map((file: string) => {
      const abs = path.isAbsolute(file)
        ? file
        : path.resolve(process.cwd(), file.replace(/^\.\/*/, ""));

      const options = {
        ...baseOptions,
        // Strict for diagnostics so we surface parse errors
        failOnErrors: true,
        apis: [abs],
      } as any;

      try {
        const out = swaggerJSDoc(options) as any;
        const pathCount = out?.paths ? Object.keys(out.paths).length : 0;
        return { file, absolutePath: abs, ok: true, pathCount };
      } catch (err: any) {
        return {
          file,
          absolutePath: abs,
          ok: false,
          error: err?.message || String(err),
          // Only include stack in non-production to avoid noisy logs
          stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
        };
      }
    });

    res.json({
      summary: {
        total: results.length,
        failed: results.filter((r) => !r.ok).length,
      },
      results,
    });
  });
};

export default getSpecs;
