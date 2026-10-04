/**
 * DEVELOPMENT SEED — fictional DEMO data only. Not production data.
 *
 *   npm run db:seed
 *
 * - Refuses to run when NODE_ENV=production.
 * - Hospitals are real, publicly known Mumbai institutions (name/city/state/address/phone only —
 *   sourced from each hospital's own public information; no non-public details are used).
 * - Donors, next-of-kin, medical notes, organs and withdrawal requests are entirely SYNTHETIC:
 *   fictional Indian names, @example.com emails, clearly-fake +91 555 phone numbers. They do not
 *   correspond to real people, real patients, or real doctors.
 * - Idempotent: every record is upserted on a stable natural key, so re-running does not duplicate
 *   rows. Organs/withdrawals (which have no natural unique key) are keyed off a deterministic
 *   synthetic id embedded in their `notes` field and upserted via findFirst+create/update.
 * - The UI never presents this as real statistics; all counts shown anywhere are live DB counts,
 *   so they simply reflect whatever is in your local database.
 */
import { PrismaClient, type Gender, type OrganStatus, type OrganType, type WithdrawalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data with NODE_ENV=production.');
  process.exit(1);
}

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'DemoPass123';

// ---------------------------------------------------------------------------
// Hospitals — real, publicly known Mumbai institutions. Only public,
// institution-level details (name / city / state / address / phone) are used.
// ---------------------------------------------------------------------------
const hospitals = [
  {
    name: 'King Edward Memorial Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    phone: '+91 22 2410 7000',
  },
  {
    name: 'Tata Memorial Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Dr. E Borges Road, Parel, Mumbai, Maharashtra 400012',
    phone: '+91 22 2417 7000',
  },
  {
    name: 'Lilavati Hospital and Research Centre',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai, Maharashtra 400050',
    phone: '+91 22 2675 1000',
  },
  {
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Rao Saheb Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai, Maharashtra 400053',
    phone: '+91 22 4269 6969',
  },
  {
    name: 'Seth Gordhandas Sunderdas Medical College and KEM Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    phone: '+91 22 2413 6051',
  },
  {
    name: 'Fortis Hospital Mulund',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Mulund Goregaon Link Road, Mulund West, Mumbai, Maharashtra 400078',
    phone: '+91 22 6799 4444',
  },
  {
    name: 'P. D. Hinduja Hospital and Medical Research Centre',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Veer Savarkar Marg, Mahim, Mumbai, Maharashtra 400016',
    phone: '+91 22 2445 2222',
  },
  {
    name: 'Breach Candy Hospital Trust',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: '60-A, Bhulabhai Desai Road, Breach Candy, Mumbai, Maharashtra 400026',
    phone: '+91 22 2367 1888',
  },
  {
    name: 'Sir H. N. Reliance Foundation Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: '822, Raja Ram Mohan Roy Road, Prarthana Samaj, Mumbai, Maharashtra 400004',
    phone: '+91 22 3999 5000',
  },
  {
    name: 'Nanavati Max Super Speciality Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'S.V. Road, Vile Parle West, Mumbai, Maharashtra 400056',
    phone: '+91 22 2626 7500',
  },
] as const;

// ---------------------------------------------------------------------------
// Donors — entirely synthetic Indian identities (Mumbai-area). None of this
// corresponds to a real person.
// ---------------------------------------------------------------------------
type DonorSeed = {
  code: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dob: string;
  city: string;
  area: string;
  doctor: string;
  medical: string;
  hospital: number; // index into `hospitals`
  kinName: string;
  kinRelationship: string;
  status: 'ACTIVE' | 'WITHDRAWN';
};

const donors: DonorSeed[] = [
  { code: 'DNMUM001', firstName: 'Aarav', lastName: 'Shah', gender: 'MALE', dob: '1988-03-14', city: 'Mumbai', area: 'Andheri West', doctor: 'Dr. Nilesh Kulkarni', medical: 'No known chronic conditions.', hospital: 3, kinName: 'Meera Shah', kinRelationship: 'Spouse', status: 'ACTIVE' },
  { code: 'DNMUM002', firstName: 'Priya', lastName: 'Deshmukh', gender: 'FEMALE', dob: '1992-07-22', city: 'Mumbai', area: 'Dadar', doctor: 'Dr. Sanjay Rao', medical: 'Mild hypertension, controlled with medication.', hospital: 0, kinName: 'Ramesh Deshmukh', kinRelationship: 'Father', status: 'ACTIVE' },
  { code: 'DNMUM003', firstName: 'Rohan', lastName: 'Mehta', gender: 'MALE', dob: '1979-11-02', city: 'Mumbai', area: 'Bandra West', doctor: 'Dr. Alka Verma', medical: 'Type 2 diabetes, diet-managed.', hospital: 2, kinName: 'Sonal Mehta', kinRelationship: 'Sister', status: 'ACTIVE' },
  { code: 'DNMUM004', firstName: 'Ananya', lastName: 'Iyer', gender: 'FEMALE', dob: '1995-01-30', city: 'Mumbai', area: 'Matunga', doctor: 'Dr. Vikram Nair', medical: 'No known chronic conditions.', hospital: 1, kinName: 'Lakshmi Iyer', kinRelationship: 'Mother', status: 'ACTIVE' },
  { code: 'DNMUM005', firstName: 'Kabir', lastName: 'Khan', gender: 'MALE', dob: '1985-09-18', city: 'Mumbai', area: 'Mira Road', doctor: 'Dr. Farhan Sheikh', medical: 'Asthma, managed with inhaler.', hospital: 5, kinName: 'Ayesha Khan', kinRelationship: 'Spouse', status: 'ACTIVE' },
  { code: 'DNMUM006', firstName: 'Isha', lastName: 'Joshi', gender: 'FEMALE', dob: '1990-04-05', city: 'Mumbai', area: 'Chembur', doctor: 'Dr. Prakash Joshi', medical: 'No known chronic conditions.', hospital: 6, kinName: 'Mahesh Joshi', kinRelationship: 'Father', status: 'ACTIVE' },
  { code: 'DNMUM007', firstName: 'Vivaan', lastName: 'Kapoor', gender: 'MALE', dob: '1982-06-11', city: 'Mumbai', area: 'Malad West', doctor: 'Dr. Reema Kapoor', medical: 'Controlled hypothyroidism.', hospital: 9, kinName: 'Neha Kapoor', kinRelationship: 'Spouse', status: 'ACTIVE' },
  { code: 'DNMUM008', firstName: 'Saanvi', lastName: 'Rao', gender: 'FEMALE', dob: '1997-12-25', city: 'Mumbai', area: 'Powai', doctor: 'Dr. Suresh Pillai', medical: 'No known chronic conditions.', hospital: 3, kinName: 'Geeta Rao', kinRelationship: 'Mother', status: 'ACTIVE' },
  { code: 'DNMUM009', firstName: 'Aditya', lastName: 'Pawar', gender: 'MALE', dob: '1975-02-17', city: 'Mumbai', area: 'Thane West', doctor: 'Dr. Manoj Pawar', medical: 'History of mild cardiac arrhythmia, stable.', hospital: 7, kinName: 'Sunita Pawar', kinRelationship: 'Spouse', status: 'ACTIVE' },
  { code: 'DNMUM010', firstName: 'Myra', lastName: 'Bhatt', gender: 'FEMALE', dob: '1993-08-09', city: 'Mumbai', area: 'Goregaon East', doctor: 'Dr. Kunal Bhatt', medical: 'No known chronic conditions.', hospital: 8, kinName: 'Hiten Bhatt', kinRelationship: 'Brother', status: 'ACTIVE' },
  { code: 'DNMUM011', firstName: 'Arjun', lastName: 'Nair', gender: 'MALE', dob: '1986-10-23', city: 'Navi Mumbai', area: 'Vashi', doctor: 'Dr. Latha Menon', medical: 'No known chronic conditions.', hospital: 1, kinName: 'Divya Nair', kinRelationship: 'Spouse', status: 'ACTIVE' },
  { code: 'DNMUM012', firstName: 'Diya', lastName: 'Patil', gender: 'FEMALE', dob: '1991-05-16', city: 'Navi Mumbai', area: 'Nerul', doctor: 'Dr. Ajay Patil', medical: 'Seasonal allergies.', hospital: 4, kinName: 'Sachin Patil', kinRelationship: 'Father', status: 'ACTIVE' },
  { code: 'DNMUM013', firstName: 'Reyansh', lastName: 'Chavan', gender: 'MALE', dob: '1980-01-08', city: 'Thane', area: 'Ghodbunder Road', doctor: 'Dr. Vaishali Chavan', medical: 'No known chronic conditions.', hospital: 5, kinName: 'Pooja Chavan', kinRelationship: 'Spouse', status: 'ACTIVE' },
  { code: 'DNMUM014', firstName: 'Kiara', lastName: 'Gupta', gender: 'FEMALE', dob: '1998-03-27', city: 'Mumbai', area: 'Juhu', doctor: 'Dr. Rakesh Gupta', medical: 'No known chronic conditions.', hospital: 2, kinName: 'Anita Gupta', kinRelationship: 'Mother', status: 'ACTIVE' },
  { code: 'DNMUM015', firstName: 'Vihaan', lastName: 'Sawant', gender: 'MALE', dob: '1983-07-04', city: 'Mumbai', area: 'Dahisar', doctor: 'Dr. Neeta Sawant', medical: 'Controlled hypertension.', hospital: 6, kinName: 'Trupti Sawant', kinRelationship: 'Spouse', status: 'ACTIVE' },
  { code: 'DNMUM016', firstName: 'Aditi', lastName: 'Kulkarni', gender: 'FEMALE', dob: '1994-11-19', city: 'Mumbai', area: 'Kandivali East', doctor: 'Dr. Milind Kulkarni', medical: 'No known chronic conditions.', hospital: 9, kinName: 'Shridhar Kulkarni', kinRelationship: 'Father', status: 'ACTIVE' },
  { code: 'DNMUM017', firstName: 'Ayaan', lastName: 'Siddiqui', gender: 'MALE', dob: '1977-09-30', city: 'Mumbai', area: 'Bhendi Bazaar', doctor: 'Dr. Imran Siddiqui', medical: 'Type 2 diabetes, insulin-managed.', hospital: 0, kinName: 'Zainab Siddiqui', kinRelationship: 'Spouse', status: 'WITHDRAWN' },
  { code: 'DNMUM018', firstName: 'Navya', lastName: 'Shetty', gender: 'FEMALE', dob: '1989-02-14', city: 'Mumbai', area: 'Ghatkopar West', doctor: 'Dr. Ganesh Shetty', medical: 'No known chronic conditions.', hospital: 7, kinName: 'Rajesh Shetty', kinRelationship: 'Brother', status: 'ACTIVE' },
  { code: 'DNMUM019', firstName: 'Krishna', lastName: 'Agarwal', gender: 'MALE', dob: '1996-06-21', city: 'Mumbai', area: 'Borivali West', doctor: 'Dr. Seema Agarwal', medical: 'No known chronic conditions.', hospital: 8, kinName: 'Radha Agarwal', kinRelationship: 'Mother', status: 'ACTIVE' },
  { code: 'DNMUM020', firstName: 'Sara', lastName: 'Fernandes', gender: 'FEMALE', dob: '1987-12-03', city: 'Mumbai', area: 'Bandra East', doctor: 'Dr. Clive Fernandes', medical: 'Controlled asthma.', hospital: 3, kinName: 'Michael Fernandes', kinRelationship: 'Spouse', status: 'ACTIVE' },
];

// ---------------------------------------------------------------------------
// Organs — distributed across all six named types, historical procurement
// dates, and a realistic status mix (mostly AVAILABLE, some PENDING awaiting
// admin verification, a few UNAVAILABLE). `donor` is an index into `donors`
// and `hospital` an index into `hospitals`. `seedKey` is a stable synthetic
// id (stored in `notes`) used to make seeding idempotent.
// ---------------------------------------------------------------------------
type OrganSeed = {
  seedKey: string;
  donor: number;
  hospital: number;
  organType: OrganType;
  status: OrganStatus;
  date: string;
};

const organs: OrganSeed[] = [
  { seedKey: 'ORG-001', donor: 0, hospital: 3, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-11-02' },
  { seedKey: 'ORG-002', donor: 0, hospital: 3, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-11-02' },
  { seedKey: 'ORG-003', donor: 1, hospital: 0, organType: 'LIVER', status: 'AVAILABLE', date: '2025-12-10' },
  { seedKey: 'ORG-004', donor: 2, hospital: 2, organType: 'KIDNEY', status: 'PENDING', date: '2026-01-05' },
  { seedKey: 'ORG-005', donor: 3, hospital: 1, organType: 'HEART', status: 'AVAILABLE', date: '2025-10-18' },
  { seedKey: 'ORG-006', donor: 4, hospital: 5, organType: 'LUNG', status: 'AVAILABLE', date: '2025-09-27' },
  { seedKey: 'ORG-007', donor: 4, hospital: 5, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-09-27' },
  { seedKey: 'ORG-008', donor: 5, hospital: 6, organType: 'KIDNEY', status: 'AVAILABLE', date: '2026-02-14' },
  { seedKey: 'ORG-009', donor: 6, hospital: 9, organType: 'PANCREAS', status: 'PENDING', date: '2026-03-01' },
  { seedKey: 'ORG-010', donor: 7, hospital: 3, organType: 'LIVER', status: 'AVAILABLE', date: '2025-08-09' },
  { seedKey: 'ORG-011', donor: 8, hospital: 7, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-07-22' },
  { seedKey: 'ORG-012', donor: 8, hospital: 7, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-07-22' },
  { seedKey: 'ORG-013', donor: 9, hospital: 8, organType: 'HEART', status: 'PENDING', date: '2026-01-29' },
  { seedKey: 'ORG-014', donor: 10, hospital: 1, organType: 'LUNG', status: 'AVAILABLE', date: '2025-06-15' },
  { seedKey: 'ORG-015', donor: 11, hospital: 4, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-05-30' },
  { seedKey: 'ORG-016', donor: 12, hospital: 5, organType: 'PANCREAS', status: 'AVAILABLE', date: '2025-04-11' },
  { seedKey: 'ORG-017', donor: 13, hospital: 2, organType: 'CORNEA', status: 'AVAILABLE', date: '2026-01-20' },
  { seedKey: 'ORG-018', donor: 13, hospital: 2, organType: 'KIDNEY', status: 'PENDING', date: '2026-01-20' },
  { seedKey: 'ORG-019', donor: 14, hospital: 6, organType: 'LIVER', status: 'AVAILABLE', date: '2025-03-08' },
  { seedKey: 'ORG-020', donor: 15, hospital: 9, organType: 'HEART', status: 'AVAILABLE', date: '2025-02-17' },
  { seedKey: 'ORG-021', donor: 16, hospital: 0, organType: 'KIDNEY', status: 'UNAVAILABLE', date: '2024-12-01' },
  { seedKey: 'ORG-022', donor: 16, hospital: 0, organType: 'LIVER', status: 'UNAVAILABLE', date: '2024-12-01' },
  { seedKey: 'ORG-023', donor: 17, hospital: 7, organType: 'LUNG', status: 'AVAILABLE', date: '2025-10-05' },
  { seedKey: 'ORG-024', donor: 18, hospital: 8, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-11-19' },
  { seedKey: 'ORG-025', donor: 18, hospital: 8, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-11-19' },
  { seedKey: 'ORG-026', donor: 19, hospital: 3, organType: 'PANCREAS', status: 'PENDING', date: '2026-02-28' },
  { seedKey: 'ORG-027', donor: 2, hospital: 2, organType: 'CORNEA', status: 'AVAILABLE', date: '2026-01-05' },
  { seedKey: 'ORG-028', donor: 9, hospital: 8, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-07-02' },
];

// ---------------------------------------------------------------------------
// Withdrawal requests — only donor 16 (DNMUM017, status WITHDRAWN) has an
// approved withdrawal; one additional donor has a pending request to
// populate the admin review queue; one has a past rejected request.
// ---------------------------------------------------------------------------
type WithdrawalSeed = {
  seedKey: string;
  donor: number;
  reason: string;
  status: WithdrawalStatus;
  adminNote?: string;
  reviewed?: boolean;
};

const withdrawals: WithdrawalSeed[] = [
  { seedKey: 'WDR-001', donor: 16, reason: 'Relocating abroad and unable to continue participation in the local registry.', status: 'APPROVED', adminNote: 'Verified and processed.', reviewed: true },
  { seedKey: 'WDR-002', donor: 10, reason: 'Personal medical reasons; advised by family physician to withdraw for now.', status: 'PENDING' },
  { seedKey: 'WDR-003', donor: 5, reason: 'Submitted in error, intended to update contact details instead.', status: 'REJECTED', adminNote: 'Donor confirmed by phone that withdrawal was not intended; request closed.', reviewed: true },
];

const DEMO_ADMIN_EMAIL = 'demo.admin@example.com';

// Public demo admin for the deployed site (documented in README.md). Intentionally a fixed,
// publicly-known password: this account only ever operates on demo data, and the known-good
// snapshot (System Recovery) undoes anything a visitor does to it. Never give this account
// SUPER_ADMIN or recovery access (see server/src/routes/recovery.routes.ts).
const PUBLIC_DEMO_ADMIN_EMAIL = 'demo@organflow.app';
const PUBLIC_DEMO_ADMIN_PASSWORD = 'DemoAdmin123!';

function donorEmail(code: string) {
  return `${code.toLowerCase()}@example.com`;
}

function donorPhone(index: number) {
  // Clearly-synthetic +91 555 numbers — not valid/dialable real numbers.
  return `+91 555 7${String(100 + index).padStart(3, '0')}`;
}

function kinPhone(index: number) {
  return `+91 555 8${String(100 + index).padStart(3, '0')}`;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // --- Hospitals (upsert on the schema's own unique [name, city] key) ------
  const hospitalRows = [];
  for (const h of hospitals) {
    hospitalRows.push(
      await prisma.hospital.upsert({
        where: { name_city: { name: h.name, city: h.city } },
        create: h,
        update: h,
      }),
    );
  }

  // --- Admin ----------------------------------------------------------------
  await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      admin: { create: { displayName: 'Demo Registry Admin' } },
    },
    update: { passwordHash },
  });

  // --- Public demo admin (fixed credentials, documented in README.md) -------
  const publicDemoPasswordHash = await bcrypt.hash(PUBLIC_DEMO_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: PUBLIC_DEMO_ADMIN_EMAIL },
    create: {
      email: PUBLIC_DEMO_ADMIN_EMAIL,
      passwordHash: publicDemoPasswordHash,
      role: 'ADMIN',
      admin: { create: { displayName: 'Demo Admin', isDemo: true } },
    },
    update: { passwordHash: publicDemoPasswordHash, admin: { update: { isDemo: true } } },
  });

  // --- Donors + NextOfKin (upsert on unique donor_code / user email) -------
  const donorRows: { id: string; code: string }[] = [];
  for (const [index, d] of donors.entries()) {
    const email = donorEmail(d.code);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        role: 'DONOR',
        donor: {
          create: {
            donorCode: d.code,
            firstName: d.firstName,
            lastName: d.lastName,
            gender: d.gender,
            dateOfBirth: new Date(`${d.dob}T00:00:00Z`),
            phone: donorPhone(index),
            address: `${100 + index} ${d.area} Road`,
            city: d.city,
            state: 'Maharashtra',
            personalDoctor: d.doctor,
            hospitalId: hospitalRows[d.hospital]!.id,
            medicalConditions: d.medical,
            status: d.status,
            nextOfKin: {
              create: {
                name: d.kinName,
                phone: kinPhone(index),
                relationship: d.kinRelationship,
              },
            },
          },
        },
      },
      update: {
        passwordHash,
        donor: {
          update: {
            firstName: d.firstName,
            lastName: d.lastName,
            gender: d.gender,
            dateOfBirth: new Date(`${d.dob}T00:00:00Z`),
            phone: donorPhone(index),
            address: `${100 + index} ${d.area} Road`,
            city: d.city,
            state: 'Maharashtra',
            personalDoctor: d.doctor,
            hospitalId: hospitalRows[d.hospital]!.id,
            medicalConditions: d.medical,
            status: d.status,
            nextOfKin: {
              upsert: {
                create: { name: d.kinName, phone: kinPhone(index), relationship: d.kinRelationship },
                update: { name: d.kinName, phone: kinPhone(index), relationship: d.kinRelationship },
              },
            },
          },
        },
      },
      select: { donor: { select: { id: true, donorCode: true } } },
    });
    donorRows.push({ id: user.donor!.id, code: user.donor!.donorCode });
  }

  // --- Organs (no natural unique key -> upsert via deterministic seedKey
  //     stored in `notes`, looked up with findFirst) ------------------------
  for (const o of organs) {
    const noteTag = `[DEMO ${o.seedKey}]`;
    const existing = await prisma.organ.findFirst({ where: { notes: { startsWith: noteTag } } });
    const data = {
      donorId: donorRows[o.donor]!.id,
      hospitalId: hospitalRows[o.hospital]!.id,
      organType: o.organType,
      status: o.status,
      procurementDate: new Date(`${o.date}T00:00:00Z`),
      notes: `${noteTag} Synthetic demo record — not a real donation.`,
    };
    if (existing) {
      await prisma.organ.update({ where: { id: existing.id }, data });
    } else {
      await prisma.organ.create({ data });
    }
  }

  // --- Withdrawal requests (same seedKey-in-field idempotency pattern) -----
  const adminRow = await prisma.admin.findFirst({ where: { user: { email: DEMO_ADMIN_EMAIL } } });
  for (const w of withdrawals) {
    const reasonTag = `[DEMO ${w.seedKey}] `;
    const existing = await prisma.withdrawalRequest.findFirst({ where: { reason: { startsWith: reasonTag } } });
    const data = {
      donorId: donorRows[w.donor]!.id,
      reason: `${reasonTag}${w.reason}`,
      status: w.status,
      adminNote: w.adminNote ?? null,
      reviewedById: w.reviewed ? adminRow?.id ?? null : null,
      reviewedAt: w.reviewed ? new Date() : null,
    };
    if (existing) {
      await prisma.withdrawalRequest.update({ where: { id: existing.id }, data });
    } else {
      await prisma.withdrawalRequest.create({ data });
    }
  }

  const [hospitalCount, donorCount, organCount, withdrawalCount] = await Promise.all([
    prisma.hospital.count(),
    prisma.donor.count(),
    prisma.organ.count(),
    prisma.withdrawalRequest.count(),
  ]);

  console.log('Seeded DEMO data (development only, idempotent — safe to re-run).');
  console.log(`  Hospitals:   ${hospitalCount} (10 seeded, real Mumbai institutions — public info only)`);
  console.log(`  Donors:      ${donorCount} (20 seeded, fully synthetic)`);
  console.log(`  Organs:      ${organCount} (28 seeded across Kidney/Liver/Heart/Lung/Pancreas/Cornea)`);
  console.log(`  Withdrawals: ${withdrawalCount} (3 seeded: approved, pending, rejected)`);
  console.log(`  Admin:       ${DEMO_ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Public demo admin: ${PUBLIC_DEMO_ADMIN_EMAIL} / ${PUBLIC_DEMO_ADMIN_PASSWORD} (documented in README.md)`);
  console.log(`  Donor login: e.g. ${donorEmail(donors[0]!.code)} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
