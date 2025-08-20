import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  console.log("🧹 Clearing existing data...");
  await prisma.taskPayment.deleteMany();
  await prisma.bookingPayment.deleteMany();
  await prisma.maintenanceTask.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.serviceProvider.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const hashedPassword = await bcrypt.hash("Password123!", 12);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@rentopia.com",
      passwordHash: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      phone: "+1234567890",
      timezone: "America/New_York",
    },
  });

  console.log("✅ Created admin user:", adminUser.email);

  // Create demo properties
  const property1 = await prisma.property.create({
    data: {
      userId: adminUser.id,
      name: "Cozy Downtown Apartment",
      description:
        "A beautiful 2-bedroom apartment in the heart of downtown with modern amenities and stunning city views. Perfect for business travelers and couples looking for a luxurious stay.",
      addressLine1: "123 Main Street",
      addressLine2: "Unit 4B",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "United States",
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 1.5,
      maxOccupancy: 4,
      squareFeet: 850,
      amenities: [
        "WiFi",
        "Kitchen",
        "Air Conditioning",
        "Parking",
        "TV",
        "Washer/Dryer",
        "City View",
        "Elevator",
      ],
      houseRules: "No smoking, No pets, Quiet hours after 10 PM, No parties",
      basePrice: 180.0,
      cleaningFee: 75.0,
      securityDeposit: 200.0,
    },
  });

  const property2 = await prisma.property.create({
    data: {
      userId: adminUser.id,
      name: "Seaside Beach House",
      description:
        "A charming 3-bedroom beach house just steps from the pristine sandy beach. Perfect for family vacations with direct beach access and stunning ocean views.",
      addressLine1: "456 Ocean Drive",
      city: "Miami Beach",
      state: "FL",
      postalCode: "33139",
      country: "United States",
      propertyType: "house",
      bedrooms: 3,
      bathrooms: 2.0,
      maxOccupancy: 6,
      squareFeet: 1200,
      amenities: [
        "WiFi",
        "Kitchen",
        "Air Conditioning",
        "Beach Access",
        "TV",
        "Patio",
        "Barbecue",
        "Beach Chairs",
        "Parking",
      ],
      houseRules:
        "No smoking indoors, No loud parties after 9 PM, Beach gear provided, Clean up after beach use",
      basePrice: 285.0,
      cleaningFee: 125.0,
      securityDeposit: 400.0,
    },
  });

  const property3 = await prisma.property.create({
    data: {
      userId: adminUser.id,
      name: "Mountain Cabin Retreat",
      description:
        "A cozy mountain cabin surrounded by pine trees and hiking trails. Perfect for nature lovers and those seeking a peaceful getaway from city life.",
      addressLine1: "789 Pine Ridge Road",
      city: "Aspen",
      state: "CO",
      postalCode: "81611",
      country: "United States",
      propertyType: "house",
      bedrooms: 2,
      bathrooms: 1.0,
      maxOccupancy: 4,
      squareFeet: 950,
      amenities: [
        "WiFi",
        "Kitchen",
        "Heating",
        "Fireplace",
        "TV",
        "Hot Tub",
        "Hiking Trails",
        "Mountain View",
        "Parking",
      ],
      houseRules:
        "No smoking, Pets allowed with deposit, Quiet hours after 10 PM, Keep fireplace clean",
      basePrice: 220.0,
      cleaningFee: 95.0,
      securityDeposit: 300.0,
    },
  });

  console.log(
    "✅ Created demo properties:",
    property1.name,
    property2.name,
    "and",
    property3.name
  );

  // Create property images
  await prisma.propertyImage.createMany({
    data: [
      // Property 1 images
      {
        propertyId: property1.id,
        imageUrl:
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
        altText: "Downtown apartment living room",
        displayOrder: 1,
        isPrimary: true,
      },
      {
        propertyId: property1.id,
        imageUrl:
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        altText: "Downtown apartment bedroom",
        displayOrder: 2,
        isPrimary: false,
      },
      {
        propertyId: property1.id,
        imageUrl:
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
        altText: "Downtown apartment kitchen",
        displayOrder: 3,
        isPrimary: false,
      },
      // Property 2 images
      {
        propertyId: property2.id,
        imageUrl:
          "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800",
        altText: "Beach house exterior",
        displayOrder: 1,
        isPrimary: true,
      },
      {
        propertyId: property2.id,
        imageUrl:
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
        altText: "Beach house living area",
        displayOrder: 2,
        isPrimary: false,
      },
      {
        propertyId: property2.id,
        imageUrl:
          "https://images.unsplash.com/photo-1520637836862-4d197d17c13a?w=800",
        altText: "Beach house deck with ocean view",
        displayOrder: 3,
        isPrimary: false,
      },
      // Property 3 images
      {
        propertyId: property3.id,
        imageUrl:
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
        altText: "Mountain cabin exterior",
        displayOrder: 1,
        isPrimary: true,
      },
      {
        propertyId: property3.id,
        imageUrl:
          "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
        altText: "Mountain cabin living room with fireplace",
        displayOrder: 2,
        isPrimary: false,
      },
    ],
  });

  console.log("✅ Created property images");

  // Create service providers
  const cleaner1 = await prisma.serviceProvider.create({
    data: {
      userId: adminUser.id,
      name: "Maria Rodriguez",
      companyName: "Sparkle Clean Services",
      serviceType: "cleaning",
      phone: "+1555123456",
      email: "maria@sparklecover.com",
      addressLine1: "321 Service Lane",
      city: "New York",
      state: "NY",
      postalCode: "10002",
      hourlyRate: 45.0,
      notes:
        "Excellent cleaner, very reliable, has keys to NYC properties. Specializes in deep cleaning and turnover services.",
    },
  });

  const cleaner2 = await prisma.serviceProvider.create({
    data: {
      userId: adminUser.id,
      name: "Jennifer Wilson",
      companyName: "Coastal Cleaning Co",
      serviceType: "cleaning",
      phone: "+1555987654",
      email: "jen@coastalcleaning.com",
      addressLine1: "789 Beach Boulevard",
      city: "Miami Beach",
      state: "FL",
      postalCode: "33140",
      hourlyRate: 40.0,
      notes:
        "Specializes in beach house cleaning, sand removal, and vacation rental turnovers.",
    },
  });

  const handyman = await prisma.serviceProvider.create({
    data: {
      userId: adminUser.id,
      name: "Bob Thompson",
      companyName: "Fix-It Bob Maintenance",
      serviceType: "maintenance",
      phone: "+1555789012",
      email: "bob@fixitbob.com",
      addressLine1: "456 Workshop Street",
      city: "New York",
      state: "NY",
      postalCode: "10003",
      flatRate: 150.0,
      notes:
        "Great for general repairs and maintenance issues. Available for emergency repairs.",
    },
  });

  const plumber = await prisma.serviceProvider.create({
    data: {
      userId: adminUser.id,
      name: "Mike Waters",
      companyName: "Aqua Pro Plumbing",
      serviceType: "plumbing",
      phone: "+1555456789",
      email: "mike@aquapro.com",
      addressLine1: "123 Pipe Road",
      city: "Miami",
      state: "FL",
      postalCode: "33101",
      hourlyRate: 85.0,
      notes:
        "Licensed plumber, available for emergencies. Specializes in vacation rental plumbing systems.",
    },
  });

  const landscaper = await prisma.serviceProvider.create({
    data: {
      userId: adminUser.id,
      name: "Carlos Green",
      companyName: "Mountain Landscapes",
      serviceType: "landscaping",
      phone: "+1555321654",
      email: "carlos@mountainlandscapes.com",
      addressLine1: "999 Alpine Way",
      city: "Aspen",
      state: "CO",
      postalCode: "81612",
      flatRate: 200.0,
      notes:
        "Specializes in mountain property maintenance, snow removal, and seasonal landscaping.",
    },
  });

  console.log("✅ Created service providers");

  // Create demo bookings with realistic dates
  const today = new Date();

  // Past booking (completed)
  const pastCheckIn = new Date(today.getFullYear(), today.getMonth() - 1, 15);
  const pastCheckOut = new Date(today.getFullYear(), today.getMonth() - 1, 18);

  // Current booking (checked in)
  const currentCheckIn = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 2
  );
  const currentCheckOut = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 3
  );

  // Future bookings
  const futureCheckIn1 = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7
  );
  const futureCheckOut1 = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 10
  );

  const futureCheckIn2 = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 15
  );
  const futureCheckOut2 = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 22
  );

  const booking1 = await prisma.booking.create({
    data: {
      propertyId: property1.id,
      guestName: "John Smith",
      guestEmail: "john.smith@email.com",
      guestPhone: "+1555234567",
      numberOfGuests: 2,
      checkInDate: pastCheckIn,
      checkOutDate: pastCheckOut,
      nightsCount: 3,
      baseAmount: 540.0, // 3 nights * $180
      cleaningFee: 75.0,
      taxes: 61.5,
      totalAmount: 676.5,
      securityDeposit: 200.0,
      bookingStatus: "checked_out",
      paymentStatus: "paid",
      bookingSource: "Direct",
      confirmationCode: "RNT001",
      specialRequests: "Late checkout requested",
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      propertyId: property2.id,
      guestName: "Sarah Johnson",
      guestEmail: "sarah.j@email.com",
      guestPhone: "+1555345678",
      numberOfGuests: 4,
      checkInDate: currentCheckIn,
      checkOutDate: currentCheckOut,
      nightsCount: 5,
      baseAmount: 1425.0, // 5 nights * $285
      cleaningFee: 125.0,
      taxes: 155.0,
      totalAmount: 1705.0,
      securityDeposit: 400.0,
      bookingStatus: "checked_in",
      paymentStatus: "paid",
      bookingSource: "Airbnb",
      confirmationCode: "ABB789",
      internalNotes: "Guest requested extra towels and beach equipment",
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      propertyId: property1.id,
      guestName: "Michael Brown",
      guestEmail: "m.brown@company.com",
      guestPhone: "+1555456789",
      numberOfGuests: 1,
      checkInDate: futureCheckIn1,
      checkOutDate: futureCheckOut1,
      nightsCount: 3,
      baseAmount: 540.0, // 3 nights * $180
      cleaningFee: 75.0,
      taxes: 61.5,
      totalAmount: 676.5,
      securityDeposit: 200.0,
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      bookingSource: "VRBO",
      confirmationCode: "VRB456",
      specialRequests: "Business traveler, early check-in preferred",
    },
  });

  const booking4 = await prisma.booking.create({
    data: {
      propertyId: property3.id,
      guestName: "Emily Davis",
      guestEmail: "emily.davis@email.com",
      guestPhone: "+1555567890",
      numberOfGuests: 3,
      checkInDate: futureCheckIn2,
      checkOutDate: futureCheckOut2,
      nightsCount: 7,
      baseAmount: 1540.0, // 7 nights * $220
      cleaningFee: 95.0,
      taxes: 163.5,
      totalAmount: 1798.5,
      securityDeposit: 300.0,
      bookingStatus: "pending",
      paymentStatus: "partial",
      bookingSource: "Direct",
      confirmationCode: "RNT789",
      specialRequests:
        "Celebrating anniversary, hiking recommendations welcome",
      internalNotes: "First-time mountain guests, send hiking trail map",
    },
  });

  console.log("✅ Created demo bookings");

  // Create booking payments
  await prisma.bookingPayment.createMany({
    data: [
      // Booking 1 payments (completed booking)
      {
        bookingId: booking1.id,
        amount: 338.25,
        paymentDate: new Date(today.getFullYear(), today.getMonth() - 2, 1),
        paymentType: "deposit",
        paymentMethod: "credit_card",
        referenceNumber: "CC12345",
        notes: "50% deposit payment",
      },
      {
        bookingId: booking1.id,
        amount: 338.25,
        paymentDate: new Date(today.getFullYear(), today.getMonth() - 1, 10),
        paymentType: "balance",
        paymentMethod: "credit_card",
        referenceNumber: "CC12346",
        notes: "Final balance payment",
      },
      // Booking 2 payments (current booking)
      {
        bookingId: booking2.id,
        amount: 1705.0,
        paymentDate: new Date(today.getFullYear(), today.getMonth() - 1, 5),
        paymentType: "full_payment",
        paymentMethod: "bank_transfer",
        referenceNumber: "BT78901",
        notes: "Full payment via bank transfer",
      },
      // Booking 3 payments (future booking)
      {
        bookingId: booking3.id,
        amount: 676.5,
        paymentDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 3
        ),
        paymentType: "full_payment",
        paymentMethod: "credit_card",
        referenceNumber: "CC54321",
        notes: "Business booking - paid in full",
      },
      // Booking 4 payments (partial payment)
      {
        bookingId: booking4.id,
        amount: 899.25,
        paymentDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 5
        ),
        paymentType: "deposit",
        paymentMethod: "credit_card",
        referenceNumber: "CC99888",
        notes: "50% deposit payment",
      },
    ],
  });

  console.log("✅ Created booking payments");

  // Create maintenance tasks
  const cleaningTask1 = await prisma.maintenanceTask.create({
    data: {
      propertyId: property1.id,
      bookingId: booking1.id,
      serviceProviderId: cleaner1.id,
      taskType: "cleaning",
      title: "Post-checkout cleaning - John Smith",
      description:
        "Deep clean apartment after guest checkout, change linens, restock amenities, vacuum thoroughly",
      scheduledDate: pastCheckOut,
      scheduledTime: new Date(`1970-01-01T14:00:00.000Z`),
      estimatedDuration: 180, // 3 hours
      actualStartTime: new Date(pastCheckOut.getTime() + 14 * 60 * 60 * 1000), // 2 PM same day
      actualEndTime: new Date(pastCheckOut.getTime() + 17 * 60 * 60 * 1000), // 5 PM same day
      priority: "high",
      estimatedCost: 135.0,
      actualCost: 135.0,
      taskStatus: "completed",
      paymentStatus: "paid",
      completionNotes:
        "Cleaned thoroughly, restocked all amenities, apartment ready for next guest",
      completedAt: new Date(pastCheckOut.getTime() + 17 * 60 * 60 * 1000),
    },
  });

  const cleaningTask2 = await prisma.maintenanceTask.create({
    data: {
      propertyId: property2.id,
      bookingId: booking2.id,
      serviceProviderId: cleaner2.id,
      taskType: "cleaning",
      title: "Checkout cleaning - Sarah Johnson",
      description:
        "Beach house cleaning after checkout, sand removal, laundry, restock beach supplies",
      scheduledDate: currentCheckOut,
      scheduledTime: new Date(`1970-01-01T11:00:00.000Z`),
      estimatedDuration: 240, // 4 hours
      priority: "high",
      estimatedCost: 160.0,
      taskStatus: "scheduled",
      paymentStatus: "pending",
    },
  });

  const maintenanceTask1 = await prisma.maintenanceTask.create({
    data: {
      propertyId: property2.id,
      serviceProviderId: plumber.id,
      taskType: "repair",
      title: "Fix leaky kitchen faucet",
      description:
        "Guest reported dripping kitchen faucet, needs washer replacement or faucet repair",
      scheduledDate: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 2
      ),
      scheduledTime: new Date(`1970-01-01T09:00:00.000Z`),
      estimatedDuration: 120, // 2 hours
      priority: "medium",
      estimatedCost: 170.0,
      taskStatus: "scheduled",
      paymentStatus: "not_applicable",
    },
  });

  const recurringTask1 = await prisma.maintenanceTask.create({
    data: {
      propertyId: property1.id,
      taskType: "preventive",
      title: "Monthly HVAC Filter Change - Downtown Apartment",
      description:
        "Replace air conditioning filter monthly for optimal performance and air quality",
      scheduledDate: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 5
      ),
      priority: "medium",
      estimatedCost: 50.0,
      taskStatus: "scheduled",
      paymentStatus: "not_applicable",
      isRecurring: true,
      recurringInterval: 30,
      nextRecurringDate: new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate() + 5
      ),
    },
  });

  const recurringTask2 = await prisma.maintenanceTask.create({
    data: {
      propertyId: property3.id,
      serviceProviderId: landscaper.id,
      taskType: "preventive",
      title: "Quarterly Property Inspection - Mountain Cabin",
      description:
        "Full property inspection including roof, gutters, heating system, and exterior maintenance",
      scheduledDate: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 10
      ),
      estimatedDuration: 180,
      priority: "medium",
      estimatedCost: 200.0,
      taskStatus: "scheduled",
      paymentStatus: "pending",
      isRecurring: true,
      recurringInterval: 90,
      nextRecurringDate: new Date(
        today.getFullYear(),
        today.getMonth() + 3,
        today.getDate() + 10
      ),
    },
  });

  const emergencyTask = await prisma.maintenanceTask.create({
    data: {
      propertyId: property1.id,
      serviceProviderId: handyman.id,
      taskType: "emergency",
      title: "Emergency Lock Repair",
      description:
        "Front door lock mechanism broken, guest unable to lock door properly",
      scheduledDate: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      ),
      scheduledTime: new Date(`1970-01-01T08:00:00.000Z`),
      estimatedDuration: 90,
      priority: "urgent",
      estimatedCost: 150.0,
      taskStatus: "scheduled",
      paymentStatus: "pending",
    },
  });

  console.log("✅ Created maintenance tasks");

  // Create task payments
  await prisma.taskPayment.createMany({
    data: [
      {
        maintenanceTaskId: cleaningTask1.id,
        amount: 135.0,
        paymentDate: new Date(pastCheckOut.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days after completion
        paymentMethod: "bank_transfer",
        referenceNumber: "PAY001",
        notes: "Payment for post-checkout cleaning",
      },
    ],
  });

  console.log("✅ Created task payments");

  console.log("🎉 Database seeding completed successfully!");
  console.log("");
  console.log("=== DEMO DATA SUMMARY ===");
  console.log("Admin login credentials:");
  console.log("Email: admin@rentopia.com");
  console.log("Password: Password123!");
  console.log("");
  console.log("Properties created: 3");
  console.log("- Cozy Downtown Apartment (NYC)");
  console.log("- Seaside Beach House (Miami Beach)");
  console.log("- Mountain Cabin Retreat (Aspen)");
  console.log("");
  console.log("Service Providers created: 5");
  console.log("- 2 Cleaning companies");
  console.log("- 1 General maintenance");
  console.log("- 1 Plumber");
  console.log("- 1 Landscaper");
  console.log("");
  console.log("Bookings created: 4");
  console.log("- 1 Past booking (checked out)");
  console.log("- 1 Current booking (checked in)");
  console.log("- 2 Future bookings (1 confirmed, 1 pending)");
  console.log("");
  console.log("Maintenance Tasks created: 6");
  console.log("- 2 Cleaning tasks");
  console.log("- 2 Repair tasks");
  console.log("- 2 Recurring maintenance tasks");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
