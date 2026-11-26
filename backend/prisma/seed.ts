import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Sizes can be overridden: SEED_PATIENTS=100 SEED_RECORDS=1000 npm run db:seed
const PATIENT_COUNT = Number(process.env.SEED_PATIENTS ?? 2000);
const RECORD_COUNT = Number(process.env.SEED_RECORDS ?? 100000);
const BATCH_SIZE = 5000;

const DOCTOR_SURNAMES = [
  "Smith", "Jones", "Brown", "Taylor", "Wilson",
  "Davies", "Evans", "Thomas", "Roberts", "Johnson",
];
const FIRST_NAMES = [
  "Aung", "Kyaw", "Zaw", "Min", "Htet", "Su", "Thida", "Mya",
  "Hnin", "Khin", "Nandar", "Wai", "Phyo", "Thiri", "Ei", "Moe",
];
const LAST_NAMES = [
  "Aye", "Naing", "Oo", "Tun", "Lwin", "Htun", "Win", "Soe",
  "Thant", "Myint", "Kyi", "Zin", "Han", "Swe", "Maung", "Phyu",
];
const CASES: [diagnosis: string, treatment: string][] = [
  ["Hypertension", "Amlodipine 5mg daily, reduce salt intake"],
  ["Type 2 diabetes", "Metformin 500mg twice daily, diet plan"],
  ["Acute bronchitis", "Rest, fluids, bronchodilator inhaler"],
  ["Migraine", "Sumatriptan as needed, avoid triggers"],
  ["Lower back pain", "Physiotherapy, NSAIDs for 5 days"],
  ["Gastritis", "Omeprazole 20mg daily, avoid spicy food"],
  ["Seasonal allergy", "Cetirizine 10mg daily"],
  ["Urinary tract infection", "Nitrofurantoin 100mg, 5 days"],
  ["Anxiety disorder", "Counselling referral, follow-up in 4 weeks"],
  ["Iron deficiency anaemia", "Ferrous sulfate 200mg daily"],
];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

function randomBirthDate(): Date {
  const year = new Date().getFullYear() - 1 - Math.floor(Math.random() * 90);
  return new Date(Date.UTC(year, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)));
}

function randomPastDate(maxDaysAgo: number): Date {
  return new Date(Date.now() - Math.random() * maxDaysAgo * 24 * 60 * 60 * 1000);
}

async function main() {
  const started = Date.now();

  console.log("Clearing old data...");
  await prisma.medicalRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users...");
  const adminHash = await bcrypt.hash("admin123", 10);
  const doctorHash = await bcrypt.hash("doctor123", 10);
  const doctors = DOCTOR_SURNAMES.map((surname) => ({
    id: randomUUID(),
    username: `dr.${surname.toLowerCase()}`,
    passwordHash: doctorHash,
    name: `Dr. ${surname}`,
    role: Role.DOCTOR,
  }));
  await prisma.user.createMany({
    data: [
      { id: randomUUID(), username: "admin", passwordHash: adminHash, name: "Admin", role: Role.ADMIN },
      ...doctors,
    ],
  });

  console.log(`Creating ${PATIENT_COUNT} patients...`);
  const patients = Array.from({ length: PATIENT_COUNT }, () => ({
    id: randomUUID(),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    dateOfBirth: randomBirthDate(),
  }));
  await prisma.patient.createMany({ data: patients });

  console.log(`Creating ${RECORD_COUNT} medical records...`);
  for (let done = 0; done < RECORD_COUNT; done += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, RECORD_COUNT - done);
    const rows = Array.from({ length: size }, () => {
      const patientIndex = Math.floor(Math.random() * patients.length);
      // Each patient has one "primary" doctor who writes ~90% of their records.
      const primary = doctors[patientIndex % doctors.length];
      const doctor = Math.random() < 0.9 ? primary : pick(doctors);
      const [diagnosis, treatment] = pick(CASES);
      return {
        patientId: patients[patientIndex].id,
        doctorId: doctor.id,
        diagnosis,
        treatment,
        createdAt: randomPastDate(3 * 365),
      };
    });
    await prisma.medicalRecord.createMany({ data: rows });
    console.log(`  inserted ${done + size} / ${RECORD_COUNT}`);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nDone in ${seconds}s.`);
  console.log("Demo logins:  admin / admin123   |   dr.smith / doctor123   |   dr.jones / doctor123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());