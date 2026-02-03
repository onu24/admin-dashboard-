// Load environment variables from .env.local BEFORE importing Firebase
// Using require to ensure it executes before ES module imports
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

interface Service {
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
}

interface Technician {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  active: boolean;
  experience: number; // in years
}

interface Booking {
  serviceId: string;
  technicianId: string | null;
  status: "pending" | "assigned" | "completed";
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  createdAt: Timestamp;
  scheduledAt: Timestamp;
  notes?: string;
}

async function checkCollectionEmpty(collectionName: string): Promise<boolean> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.empty;
}

async function seedServices(): Promise<string[]> {
  const collectionName = "services";
  const isEmpty = await checkCollectionEmpty(collectionName);
  
  if (!isEmpty) {
    console.log(`⚠️  ${collectionName} collection already has data. Skipping...`);
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((doc) => doc.id);
  }

  const services: Service[] = [
    {
      name: "Electrician",
      description: "Professional electrical repairs and installations",
      price: 1500,
      duration: 120,
    },
    {
      name: "Plumber",
      description: "Plumbing repairs, installations, and maintenance",
      price: 1200,
      duration: 90,
    },
    {
      name: "AC Repair",
      description: "Air conditioning repair and maintenance services",
      price: 2000,
      duration: 180,
    },
    {
      name: "Carpenter",
      description: "Furniture repair, installation, and custom woodwork",
      price: 1800,
      duration: 150,
    },
    {
      name: "Painter",
      description: "Interior and exterior painting services",
      price: 2500,
      duration: 240,
    },
  ];

  const serviceIds: string[] = [];
  console.log(`📝 Seeding ${services.length} services...`);

  for (const service of services) {
    const docRef = await addDoc(collection(db, collectionName), service);
    serviceIds.push(docRef.id);
    console.log(`  ✓ Added service: ${service.name} (ID: ${docRef.id})`);
  }

  return serviceIds;
}

async function seedTechnicians(): Promise<string[]> {
  const collectionName = "technicians";
  const isEmpty = await checkCollectionEmpty(collectionName);
  
  if (!isEmpty) {
    console.log(`⚠️  ${collectionName} collection already has data. Skipping...`);
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((doc) => doc.id);
  }

  const technicians: Technician[] = [
    {
      name: "Rajesh Kumar",
      email: "rajesh.kumar@example.com",
      phone: "+91 98765 43210",
      skills: ["Electrician", "AC Repair"],
      active: true,
      experience: 8,
    },
    {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+91 98765 43211",
      skills: ["Plumber", "Carpenter"],
      active: true,
      experience: 5,
    },
    {
      name: "Amit Patel",
      email: "amit.patel@example.com",
      phone: "+91 98765 43212",
      skills: ["Electrician", "Plumber"],
      active: true,
      experience: 10,
    },
    {
      name: "Sneha Reddy",
      email: "sneha.reddy@example.com",
      phone: "+91 98765 43213",
      skills: ["AC Repair", "Painter"],
      active: true,
      experience: 6,
    },
    {
      name: "Vikram Singh",
      email: "vikram.singh@example.com",
      phone: "+91 98765 43214",
      skills: ["Carpenter", "Painter"],
      active: true,
      experience: 7,
    },
  ];

  const technicianIds: string[] = [];
  console.log(`📝 Seeding ${technicians.length} technicians...`);

  for (const technician of technicians) {
    const docRef = await addDoc(collection(db, collectionName), technician);
    technicianIds.push(docRef.id);
    console.log(`  ✓ Added technician: ${technician.name} (ID: ${docRef.id})`);
  }

  return technicianIds;
}

async function seedBookings(
  serviceIds: string[],
  technicianIds: string[]
): Promise<void> {
  const collectionName = "bookings";
  const isEmpty = await checkCollectionEmpty(collectionName);
  
  if (!isEmpty) {
    console.log(`⚠️  ${collectionName} collection already has data. Skipping...`);
    return;
  }

  const now = Timestamp.now();
  const oneDayInSeconds = 24 * 60 * 60;
  const oneWeekInSeconds = 7 * oneDayInSeconds;

  const bookings: Omit<Booking, "createdAt" | "scheduledAt">[] = [
    {
      serviceId: serviceIds[0], // Electrician
      technicianId: technicianIds[0], // Rajesh
      status: "assigned",
      customerName: "Ramesh Gupta",
      customerPhone: "+91 98765 12345",
      customerAddress: "123 Main Street, Mumbai",
      notes: "Need urgent electrical repair",
    },
    {
      serviceId: serviceIds[1], // Plumber
      technicianId: null,
      status: "pending",
      customerName: "Sunita Mehta",
      customerPhone: "+91 98765 12346",
      customerAddress: "456 Park Avenue, Delhi",
      notes: "Leaky faucet in kitchen",
    },
    {
      serviceId: serviceIds[2], // AC Repair
      technicianId: technicianIds[3], // Sneha
      status: "completed",
      customerName: "Anil Verma",
      customerPhone: "+91 98765 12347",
      customerAddress: "789 Oak Road, Bangalore",
    },
    {
      serviceId: serviceIds[0], // Electrician
      technicianId: technicianIds[2], // Amit
      status: "assigned",
      customerName: "Kavita Joshi",
      customerPhone: "+91 98765 12348",
      customerAddress: "321 Elm Street, Pune",
      notes: "Install new ceiling fan",
    },
    {
      serviceId: serviceIds[3], // Carpenter
      technicianId: null,
      status: "pending",
      customerName: "Mohit Agarwal",
      customerPhone: "+91 98765 12349",
      customerAddress: "654 Pine Lane, Hyderabad",
      notes: "Fix broken cabinet door",
    },
    {
      serviceId: serviceIds[4], // Painter
      technicianId: technicianIds[4], // Vikram
      status: "completed",
      customerName: "Deepak Nair",
      customerPhone: "+91 98765 12350",
      customerAddress: "987 Cedar Drive, Chennai",
    },
    {
      serviceId: serviceIds[1], // Plumber
      technicianId: technicianIds[1], // Priya
      status: "assigned",
      customerName: "Meera Desai",
      customerPhone: "+91 98765 12351",
      customerAddress: "147 Maple Court, Kolkata",
      notes: "Bathroom pipe replacement",
    },
    {
      serviceId: serviceIds[2], // AC Repair
      technicianId: null,
      status: "pending",
      customerName: "Arjun Iyer",
      customerPhone: "+91 98765 12352",
      customerAddress: "258 Birch Way, Jaipur",
      notes: "AC not cooling properly",
    },
  ];

  console.log(`📝 Seeding ${bookings.length} bookings...`);

  for (let i = 0; i < bookings.length; i++) {
    const booking = bookings[i];
    const createdAt = Timestamp.fromMillis(
      now.toMillis() - (bookings.length - i) * oneDayInSeconds
    );
    const scheduledAt = Timestamp.fromMillis(
      now.toMillis() + (i + 1) * oneDayInSeconds
    );

    const bookingData: Booking = {
      ...booking,
      createdAt,
      scheduledAt,
    };

    const docRef = await addDoc(collection(db, collectionName), bookingData);
    console.log(
      `  ✓ Added booking: ${booking.customerName} - ${booking.status} (ID: ${docRef.id})`
    );
  }
}

async function main() {
  try {
    console.log("🚀 Starting demo data seeding...\n");

    const serviceIds = await seedServices();
    console.log();

    const technicianIds = await seedTechnicians();
    console.log();

    await seedBookings(serviceIds, technicianIds);
    console.log();

    console.log("✅ Demo data seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    process.exit(1);
  }
}

// Run the script when executed directly
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

export { seedServices, seedTechnicians, seedBookings };
