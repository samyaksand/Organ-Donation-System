/**
 * DEVELOPMENT SEED - fictional DEMO data only. Not production data.
 *
 *   npm run db:seed
 *
 * - Refuses to run when NODE_ENV=production.
 * - Hospitals are real, publicly known Mumbai and Delhi institutions (name/city/state/address/
 *   phone only - sourced from each hospital's own public information; no non-public details are
 *   used; this does not imply any of them actually participate in OrganFlow).
 * - Donors, next-of-kin, medical notes, organs and withdrawal requests are entirely SYNTHETIC:
 *   fictional Indian names, @example.com emails, clearly-fake +91 555 phone numbers. They do not
 *   correspond to real people, real patients, or real doctors.
 * - Idempotent: every record is upserted on a stable natural key, so re-running does not duplicate
 *   rows. Organs/withdrawals (which have no natural unique key) are keyed off a deterministic
 *   synthetic id embedded in their `notes` field and upserted via findFirst+create/update.
 * - The UI never presents this as real statistics; all counts shown anywhere are live DB counts,
 *   so they simply reflect whatever is in your local database.
 * - ADDITIVE: the original 10 Mumbai hospitals, 20 donors (DNMUM001-020), 28 organs (ORG-001 to
 *   ORG-028) and 3 withdrawals (WDR-001 to WDR-003) are never modified in value, only re-applied
 *   via the same upsert they always used (so re-running preserves them exactly). Everything below
 *   the "NEW DATA" markers was added later to broaden the dataset (more hospitals, donors, organ
 *   history, and withdrawal volume/variety) for analytics; it follows the same idempotency
 *   pattern and never touches the original rows' keys.
 * - Blood types, Donor.status = PENDING, and WorkflowEvent rows are new analytics dimensions
 *   (see prisma/schema.prisma). Backfilling them onto the ORIGINAL 20 donors (who predate these
 *   fields) is an update to a previously-null/default field, not a rewrite of their identity,
 *   medical info, or any other previously-seeded value.
 */
import {
  PrismaClient,
  type BloodType,
  type DonorStatus,
  type Gender,
  type OrganRequestStatus,
  type OrganStatus,
  type OrganType,
  type WithdrawalStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ALL_POLICIES } from '../server/src/security/policies';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data with NODE_ENV=production.');
  process.exit(1);
}

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'DemoPass123';

// ---------------------------------------------------------------------------
// Hospitals - real, publicly known Mumbai institutions. Only public,
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

  // --- NEW DATA: Delhi hospitals (real, publicly known institutions; public info only) ------
  {
    name: 'All India Institute of Medical Sciences, New Delhi',
    city: 'Delhi',
    state: 'Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029',
    phone: '+91 11 2658 8500',
  },
  {
    name: 'Max Super Speciality Hospital, Saket',
    city: 'Delhi',
    state: 'Delhi',
    address: '1, 2, Press Enclave Road, Saket, New Delhi, Delhi 110017',
    phone: '+91 11 2651 5050',
  },
  {
    name: 'Indraprastha Apollo Hospitals',
    city: 'Delhi',
    state: 'Delhi',
    address: 'Sarita Vihar, Delhi Mathura Road, New Delhi, Delhi 110076',
    phone: '+91 11 7179 1090',
  },
  {
    name: 'Fortis Escorts Heart Institute',
    city: 'Delhi',
    state: 'Delhi',
    address: 'Okhla Road, New Delhi, Delhi 110025',
    phone: '+91 11 4713 5000',
  },
  {
    name: 'Sir Ganga Ram Hospital',
    city: 'Delhi',
    state: 'Delhi',
    address: 'Rajinder Nagar, New Delhi, Delhi 110060',
    phone: '+91 11 2575 0000',
  },
] as const;

// ---------------------------------------------------------------------------
// Donors - entirely synthetic Indian identities (Mumbai-area). None of this
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
  status: DonorStatus;
  bloodType: BloodType;
  /** Registration date, expressed as days before the seed runs. Spreads registrations across
   * several months (see schema: Donor.createdAt) instead of every donor appearing "today",
   * which is required for any registrations-over-time trend to be meaningful. */
  registeredDaysAgo: number;
};

// Non-uniform blood-type distribution, approximating real-world population frequencies
// (O+ and A+ most common, AB- rarest), cycled across donors rather than assigned uniformly.
const BLOOD_TYPE_CYCLE: BloodType[] = [
  'O_POS', 'O_POS', 'O_POS', 'A_POS', 'A_POS', 'A_POS', 'B_POS', 'B_POS',
  'O_NEG', 'A_NEG', 'AB_POS', 'B_NEG', 'O_POS', 'A_POS', 'B_POS', 'O_POS',
  'A_POS', 'O_NEG', 'AB_NEG', 'O_POS',
];
function bloodTypeFor(index: number): BloodType {
  return BLOOD_TYPE_CYCLE[index % BLOOD_TYPE_CYCLE.length]!;
}

const donors: DonorSeed[] = [
  // --- ORIGINAL 20 donors (Mumbai area). Identity, medical info, hospital and kin UNCHANGED
  //     from the original seed; only `bloodType` (new field) and `registeredDaysAgo` (spreads
  //     their registration date across the last ~7 months instead of "today") are added. ---
  { code: 'DNMUM001', firstName: 'Aarav', lastName: 'Shah', gender: 'MALE', dob: '1988-03-14', city: 'Mumbai', area: 'Andheri West', doctor: 'Dr. Nilesh Kulkarni', medical: 'No known chronic conditions.', hospital: 3, kinName: 'Meera Shah', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(0), registeredDaysAgo: 210 },
  { code: 'DNMUM002', firstName: 'Priya', lastName: 'Deshmukh', gender: 'FEMALE', dob: '1992-07-22', city: 'Mumbai', area: 'Dadar', doctor: 'Dr. Sanjay Rao', medical: 'Mild hypertension, controlled with medication.', hospital: 0, kinName: 'Ramesh Deshmukh', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(1), registeredDaysAgo: 205 },
  { code: 'DNMUM003', firstName: 'Rohan', lastName: 'Mehta', gender: 'MALE', dob: '1979-11-02', city: 'Mumbai', area: 'Bandra West', doctor: 'Dr. Alka Verma', medical: 'Type 2 diabetes, diet-managed.', hospital: 2, kinName: 'Sonal Mehta', kinRelationship: 'Sister', status: 'ACTIVE', bloodType: bloodTypeFor(2), registeredDaysAgo: 198 },
  { code: 'DNMUM004', firstName: 'Ananya', lastName: 'Iyer', gender: 'FEMALE', dob: '1995-01-30', city: 'Mumbai', area: 'Matunga', doctor: 'Dr. Vikram Nair', medical: 'No known chronic conditions.', hospital: 1, kinName: 'Lakshmi Iyer', kinRelationship: 'Mother', status: 'ACTIVE', bloodType: bloodTypeFor(3), registeredDaysAgo: 190 },
  { code: 'DNMUM005', firstName: 'Kabir', lastName: 'Khan', gender: 'MALE', dob: '1985-09-18', city: 'Mumbai', area: 'Mira Road', doctor: 'Dr. Farhan Sheikh', medical: 'Asthma, managed with inhaler.', hospital: 5, kinName: 'Ayesha Khan', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(4), registeredDaysAgo: 183 },
  { code: 'DNMUM006', firstName: 'Isha', lastName: 'Joshi', gender: 'FEMALE', dob: '1990-04-05', city: 'Mumbai', area: 'Chembur', doctor: 'Dr. Prakash Joshi', medical: 'No known chronic conditions.', hospital: 6, kinName: 'Mahesh Joshi', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(5), registeredDaysAgo: 176 },
  { code: 'DNMUM007', firstName: 'Vivaan', lastName: 'Kapoor', gender: 'MALE', dob: '1982-06-11', city: 'Mumbai', area: 'Malad West', doctor: 'Dr. Reema Kapoor', medical: 'Controlled hypothyroidism.', hospital: 9, kinName: 'Neha Kapoor', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(6), registeredDaysAgo: 169 },
  { code: 'DNMUM008', firstName: 'Saanvi', lastName: 'Rao', gender: 'FEMALE', dob: '1997-12-25', city: 'Mumbai', area: 'Powai', doctor: 'Dr. Suresh Pillai', medical: 'No known chronic conditions.', hospital: 3, kinName: 'Geeta Rao', kinRelationship: 'Mother', status: 'ACTIVE', bloodType: bloodTypeFor(7), registeredDaysAgo: 162 },
  { code: 'DNMUM009', firstName: 'Aditya', lastName: 'Pawar', gender: 'MALE', dob: '1975-02-17', city: 'Mumbai', area: 'Thane West', doctor: 'Dr. Manoj Pawar', medical: 'History of mild cardiac arrhythmia, stable.', hospital: 7, kinName: 'Sunita Pawar', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(8), registeredDaysAgo: 155 },
  { code: 'DNMUM010', firstName: 'Myra', lastName: 'Bhatt', gender: 'FEMALE', dob: '1993-08-09', city: 'Mumbai', area: 'Goregaon East', doctor: 'Dr. Kunal Bhatt', medical: 'No known chronic conditions.', hospital: 8, kinName: 'Hiten Bhatt', kinRelationship: 'Brother', status: 'ACTIVE', bloodType: bloodTypeFor(9), registeredDaysAgo: 148 },
  { code: 'DNMUM011', firstName: 'Arjun', lastName: 'Nair', gender: 'MALE', dob: '1986-10-23', city: 'Navi Mumbai', area: 'Vashi', doctor: 'Dr. Latha Menon', medical: 'No known chronic conditions.', hospital: 1, kinName: 'Divya Nair', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(10), registeredDaysAgo: 141 },
  { code: 'DNMUM012', firstName: 'Diya', lastName: 'Patil', gender: 'FEMALE', dob: '1991-05-16', city: 'Navi Mumbai', area: 'Nerul', doctor: 'Dr. Ajay Patil', medical: 'Seasonal allergies.', hospital: 4, kinName: 'Sachin Patil', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(11), registeredDaysAgo: 134 },
  { code: 'DNMUM013', firstName: 'Reyansh', lastName: 'Chavan', gender: 'MALE', dob: '1980-01-08', city: 'Thane', area: 'Ghodbunder Road', doctor: 'Dr. Vaishali Chavan', medical: 'No known chronic conditions.', hospital: 5, kinName: 'Pooja Chavan', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(12), registeredDaysAgo: 127 },
  { code: 'DNMUM014', firstName: 'Kiara', lastName: 'Gupta', gender: 'FEMALE', dob: '1998-03-27', city: 'Mumbai', area: 'Juhu', doctor: 'Dr. Rakesh Gupta', medical: 'No known chronic conditions.', hospital: 2, kinName: 'Anita Gupta', kinRelationship: 'Mother', status: 'ACTIVE', bloodType: bloodTypeFor(13), registeredDaysAgo: 120 },
  { code: 'DNMUM015', firstName: 'Vihaan', lastName: 'Sawant', gender: 'MALE', dob: '1983-07-04', city: 'Mumbai', area: 'Dahisar', doctor: 'Dr. Neeta Sawant', medical: 'Controlled hypertension.', hospital: 6, kinName: 'Trupti Sawant', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(14), registeredDaysAgo: 113 },
  { code: 'DNMUM016', firstName: 'Aditi', lastName: 'Kulkarni', gender: 'FEMALE', dob: '1994-11-19', city: 'Mumbai', area: 'Kandivali East', doctor: 'Dr. Milind Kulkarni', medical: 'No known chronic conditions.', hospital: 9, kinName: 'Shridhar Kulkarni', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(15), registeredDaysAgo: 106 },
  { code: 'DNMUM017', firstName: 'Ayaan', lastName: 'Siddiqui', gender: 'MALE', dob: '1977-09-30', city: 'Mumbai', area: 'Bhendi Bazaar', doctor: 'Dr. Imran Siddiqui', medical: 'Type 2 diabetes, insulin-managed.', hospital: 0, kinName: 'Zainab Siddiqui', kinRelationship: 'Spouse', status: 'WITHDRAWN', bloodType: bloodTypeFor(16), registeredDaysAgo: 99 },
  { code: 'DNMUM018', firstName: 'Navya', lastName: 'Shetty', gender: 'FEMALE', dob: '1989-02-14', city: 'Mumbai', area: 'Ghatkopar West', doctor: 'Dr. Ganesh Shetty', medical: 'No known chronic conditions.', hospital: 7, kinName: 'Rajesh Shetty', kinRelationship: 'Brother', status: 'ACTIVE', bloodType: bloodTypeFor(17), registeredDaysAgo: 92 },
  { code: 'DNMUM019', firstName: 'Krishna', lastName: 'Agarwal', gender: 'MALE', dob: '1996-06-21', city: 'Mumbai', area: 'Borivali West', doctor: 'Dr. Seema Agarwal', medical: 'No known chronic conditions.', hospital: 8, kinName: 'Radha Agarwal', kinRelationship: 'Mother', status: 'ACTIVE', bloodType: bloodTypeFor(18), registeredDaysAgo: 85 },
  { code: 'DNMUM020', firstName: 'Sara', lastName: 'Fernandes', gender: 'FEMALE', dob: '1987-12-03', city: 'Mumbai', area: 'Bandra East', doctor: 'Dr. Clive Fernandes', medical: 'Controlled asthma.', hospital: 3, kinName: 'Michael Fernandes', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(19), registeredDaysAgo: 78 },

  // --- NEW DATA: 30 additional donors, Mumbai and Delhi, spread over the last ~7 months. -----
  { code: 'DNMUM021', firstName: 'Ishaan', lastName: 'Bose', gender: 'MALE', dob: '1984-02-11', city: 'Mumbai', area: 'Worli', doctor: 'Dr. Anjali Bose', medical: 'No known chronic conditions.', hospital: 0, kinName: 'Riya Bose', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(20), registeredDaysAgo: 203 },
  { code: 'DNMUM022', firstName: 'Tanvi', lastName: 'Rane', gender: 'FEMALE', dob: '1999-05-02', city: 'Mumbai', area: 'Vikhroli', doctor: 'Dr. Suhas Rane', medical: 'No known chronic conditions.', hospital: 1, kinName: 'Suhas Rane', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(21), registeredDaysAgo: 196 },
  { code: 'DNMUM023', firstName: 'Yash', lastName: 'Thakur', gender: 'MALE', dob: '1978-08-19', city: 'Thane', area: 'Kolshet Road', doctor: 'Dr. Prachi Thakur', medical: 'Controlled hypertension.', hospital: 2, kinName: 'Prachi Thakur', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(22), registeredDaysAgo: 189 },
  { code: 'DNMUM024', firstName: 'Riya', lastName: 'Menon', gender: 'FEMALE', dob: '1992-10-30', city: 'Mumbai', area: 'Sion', doctor: 'Dr. Hari Menon', medical: 'No known chronic conditions.', hospital: 3, kinName: 'Hari Menon', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(23), registeredDaysAgo: 182 },
  { code: 'DNMUM025', firstName: 'Dev', lastName: 'Oza', gender: 'MALE', dob: '1986-01-25', city: 'Mumbai', area: 'Lower Parel', doctor: 'Dr. Minal Oza', medical: 'No known chronic conditions.', hospital: 4, kinName: 'Minal Oza', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(24), registeredDaysAgo: 175 },
  { code: 'DNMUM026', firstName: 'Anjali', lastName: 'Pillai', gender: 'FEMALE', dob: '1995-07-14', city: 'Navi Mumbai', area: 'Kharghar', doctor: 'Dr. Vijay Pillai', medical: 'Seasonal allergies.', hospital: 5, kinName: 'Vijay Pillai', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(25), registeredDaysAgo: 168 },
  { code: 'DNMUM027', firstName: 'Kunal', lastName: 'Save', gender: 'MALE', dob: '1981-03-08', city: 'Mumbai', area: 'Marol', doctor: 'Dr. Smita Save', medical: 'Type 2 diabetes, diet-managed.', hospital: 6, kinName: 'Smita Save', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(26), registeredDaysAgo: 161 },
  { code: 'DNMUM028', firstName: 'Pooja', lastName: 'Jadhav', gender: 'FEMALE', dob: '1990-09-21', city: 'Mumbai', area: 'Kurla', doctor: 'Dr. Nitin Jadhav', medical: 'No known chronic conditions.', hospital: 7, kinName: 'Nitin Jadhav', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(27), registeredDaysAgo: 154 },
  { code: 'DNMUM029', firstName: 'Rahul', lastName: 'Ghosh', gender: 'MALE', dob: '1976-12-02', city: 'Mumbai', area: 'Colaba', doctor: 'Dr. Mitali Ghosh', medical: 'History of mild cardiac arrhythmia, stable.', hospital: 8, kinName: 'Mitali Ghosh', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(28), registeredDaysAgo: 147 },
  { code: 'DNMUM030', firstName: 'Neha', lastName: 'Kamath', gender: 'FEMALE', dob: '1997-04-17', city: 'Mumbai', area: 'Wadala', doctor: 'Dr. Ramesh Kamath', medical: 'No known chronic conditions.', hospital: 9, kinName: 'Ramesh Kamath', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(29), registeredDaysAgo: 140 },
  { code: 'DNMUM031', firstName: 'Varun', lastName: 'Desai', gender: 'MALE', dob: '1989-06-06', city: 'Mumbai', area: 'Santacruz', doctor: 'Dr. Leena Desai', medical: 'No known chronic conditions.', hospital: 0, kinName: 'Leena Desai', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(30), registeredDaysAgo: 133 },
  { code: 'DNMUM032', firstName: 'Simran', lastName: 'Kaur', gender: 'FEMALE', dob: '1993-11-11', city: 'Mumbai', area: 'Andheri East', doctor: 'Dr. Gurpreet Kaur', medical: 'Controlled asthma.', hospital: 1, kinName: 'Gurpreet Kaur', kinRelationship: 'Mother', status: 'PENDING', bloodType: bloodTypeFor(31), registeredDaysAgo: 4 },
  { code: 'DNMUM033', firstName: 'Harsh', lastName: 'Vora', gender: 'MALE', dob: '1982-02-28', city: 'Mumbai', area: 'Ghatkopar East', doctor: 'Dr. Deepa Vora', medical: 'No known chronic conditions.', hospital: 2, kinName: 'Deepa Vora', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(32), registeredDaysAgo: 119 },
  { code: 'DNMUM034', firstName: 'Shreya', lastName: 'Naik', gender: 'FEMALE', dob: '1998-08-05', city: 'Mumbai', area: 'Vile Parle', doctor: 'Dr. Ramesh Naik', medical: 'No known chronic conditions.', hospital: 3, kinName: 'Ramesh Naik', kinRelationship: 'Father', status: 'PENDING', bloodType: bloodTypeFor(33), registeredDaysAgo: 2 },
  { code: 'DNMUM035', firstName: 'Nikhil', lastName: 'Bhosale', gender: 'MALE', dob: '1979-05-23', city: 'Thane', area: 'Majiwada', doctor: 'Dr. Asha Bhosale', medical: 'Controlled hypertension.', hospital: 4, kinName: 'Asha Bhosale', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(34), registeredDaysAgo: 105 },
  { code: 'DNDEL001', firstName: 'Aryan', lastName: 'Sharma', gender: 'MALE', dob: '1987-01-19', city: 'Delhi', area: 'Vasant Kunj', doctor: 'Dr. Meenakshi Sharma', medical: 'No known chronic conditions.', hospital: 10, kinName: 'Meenakshi Sharma', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(35), registeredDaysAgo: 200 },
  { code: 'DNDEL002', firstName: 'Kavya', lastName: 'Chopra', gender: 'FEMALE', dob: '1991-09-09', city: 'Delhi', area: 'Dwarka', doctor: 'Dr. Ravi Chopra', medical: 'No known chronic conditions.', hospital: 11, kinName: 'Ravi Chopra', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(36), registeredDaysAgo: 193 },
  { code: 'DNDEL003', firstName: 'Mohit', lastName: 'Malhotra', gender: 'MALE', dob: '1983-12-14', city: 'Delhi', area: 'Rohini', doctor: 'Dr. Preeti Malhotra', medical: 'Type 2 diabetes, insulin-managed.', hospital: 12, kinName: 'Preeti Malhotra', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(37), registeredDaysAgo: 186 },
  { code: 'DNDEL004', firstName: 'Ira', lastName: 'Bhatia', gender: 'FEMALE', dob: '1994-03-27', city: 'Delhi', area: 'Lajpat Nagar', doctor: 'Dr. Sunil Bhatia', medical: 'Seasonal allergies.', hospital: 13, kinName: 'Sunil Bhatia', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(38), registeredDaysAgo: 179 },
  { code: 'DNDEL005', firstName: 'Rohit', lastName: 'Khurana', gender: 'MALE', dob: '1980-07-07', city: 'Delhi', area: 'Pitampura', doctor: 'Dr. Namrata Khurana', medical: 'History of mild cardiac arrhythmia, stable.', hospital: 14, kinName: 'Namrata Khurana', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(39), registeredDaysAgo: 172 },
  { code: 'DNDEL006', firstName: 'Nisha', lastName: 'Arora', gender: 'FEMALE', dob: '1996-11-02', city: 'Delhi', area: 'Karol Bagh', doctor: 'Dr. Deepak Arora', medical: 'No known chronic conditions.', hospital: 10, kinName: 'Deepak Arora', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(40), registeredDaysAgo: 165 },
  { code: 'DNDEL007', firstName: 'Siddharth', lastName: 'Kapur', gender: 'MALE', dob: '1985-04-16', city: 'Delhi', area: 'Mayur Vihar', doctor: 'Dr. Ritu Kapur', medical: 'Controlled hypothyroidism.', hospital: 11, kinName: 'Ritu Kapur', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(41), registeredDaysAgo: 158 },
  { code: 'DNDEL008', firstName: 'Aditi', lastName: 'Sethi', gender: 'FEMALE', dob: '1990-02-20', city: 'Delhi', area: 'Janakpuri', doctor: 'Dr. Arvind Sethi', medical: 'No known chronic conditions.', hospital: 12, kinName: 'Arvind Sethi', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(42), registeredDaysAgo: 151 },
  { code: 'DNDEL009', firstName: 'Karan', lastName: 'Bajaj', gender: 'MALE', dob: '1977-10-11', city: 'Delhi', area: 'Greater Kailash', doctor: 'Dr. Shalini Bajaj', medical: 'Controlled hypertension.', hospital: 13, kinName: 'Shalini Bajaj', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(43), registeredDaysAgo: 144 },
  { code: 'DNDEL010', firstName: 'Megha', lastName: 'Saxena', gender: 'FEMALE', dob: '1993-06-28', city: 'Delhi', area: 'Vasant Vihar', doctor: 'Dr. Anil Saxena', medical: 'No known chronic conditions.', hospital: 14, kinName: 'Anil Saxena', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(44), registeredDaysAgo: 137 },
  { code: 'DNDEL011', firstName: 'Abhinav', lastName: 'Tandon', gender: 'MALE', dob: '1984-08-13', city: 'Delhi', area: 'Paschim Vihar', doctor: 'Dr. Komal Tandon', medical: 'No known chronic conditions.', hospital: 10, kinName: 'Komal Tandon', kinRelationship: 'Spouse', status: 'PENDING', bloodType: bloodTypeFor(45), registeredDaysAgo: 6 },
  { code: 'DNDEL012', firstName: 'Priyanka', lastName: 'Chauhan', gender: 'FEMALE', dob: '1998-01-05', city: 'Delhi', area: 'Shahdara', doctor: 'Dr. Yogesh Chauhan', medical: 'No known chronic conditions.', hospital: 11, kinName: 'Yogesh Chauhan', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(46), registeredDaysAgo: 123 },
  { code: 'DNDEL013', firstName: 'Vikram', lastName: 'Rawat', gender: 'MALE', dob: '1975-05-30', city: 'Delhi', area: 'Hauz Khas', doctor: 'Dr. Sangeeta Rawat', medical: 'Type 2 diabetes, diet-managed.', hospital: 12, kinName: 'Sangeeta Rawat', kinRelationship: 'Spouse', status: 'WITHDRAWN', bloodType: bloodTypeFor(47), registeredDaysAgo: 116 },
  { code: 'DNDEL014', firstName: 'Tanya', lastName: 'Grover', gender: 'FEMALE', dob: '1995-09-18', city: 'Delhi', area: 'Preet Vihar', doctor: 'Dr. Manish Grover', medical: 'No known chronic conditions.', hospital: 13, kinName: 'Manish Grover', kinRelationship: 'Father', status: 'ACTIVE', bloodType: bloodTypeFor(48), registeredDaysAgo: 109 },
  { code: 'DNDEL015', firstName: 'Gaurav', lastName: 'Mittal', gender: 'MALE', dob: '1988-12-24', city: 'Delhi', area: 'Rajouri Garden', doctor: 'Dr. Pallavi Mittal', medical: 'No known chronic conditions.', hospital: 14, kinName: 'Pallavi Mittal', kinRelationship: 'Spouse', status: 'ACTIVE', bloodType: bloodTypeFor(49), registeredDaysAgo: 3 },
];

// ---------------------------------------------------------------------------
// Organs - distributed across all six named types, historical procurement
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

  // --- NEW DATA: ~60 more organs spanning the new Mumbai + Delhi donors (indices 20-49) and
  //     all 15 hospitals (indices 0-9 Mumbai, 10-14 Delhi), across several months of history.
  //     Deliberate operational scenarios (see prisma/seed.ts header / CLAUDE.md):
  //       - hospital 9 (Nanavati) organs below are ALL UNAVAILABLE -> one hospital with zero
  //         current availability, alongside hospitals that already have plenty (e.g. hospital 3).
  //       - PANCREAS and OTHER stay comparatively rare (uneven organ-type distribution), matching
  //         real transplant volume being dominated by kidney/cornea.
  //       - several PENDING organs are recent (within the last few days), awaiting admin
  //         verification, alongside PENDING organs from the original data that are already older.
  { seedKey: 'ORG-029', donor: 20, hospital: 0, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-04-02' },
  { seedKey: 'ORG-030', donor: 20, hospital: 0, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-04-02' },
  { seedKey: 'ORG-031', donor: 21, hospital: 1, organType: 'LIVER', status: 'AVAILABLE', date: '2025-04-20' },
  { seedKey: 'ORG-032', donor: 22, hospital: 2, organType: 'HEART', status: 'PENDING', date: '2026-02-20' },
  { seedKey: 'ORG-033', donor: 23, hospital: 3, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-05-11' },
  { seedKey: 'ORG-034', donor: 23, hospital: 3, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-05-11' },
  { seedKey: 'ORG-035', donor: 24, hospital: 4, organType: 'LUNG', status: 'AVAILABLE', date: '2025-05-29' },
  { seedKey: 'ORG-036', donor: 25, hospital: 5, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-06-14' },
  { seedKey: 'ORG-037', donor: 26, hospital: 6, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-06-28' },
  { seedKey: 'ORG-038', donor: 27, hospital: 7, organType: 'LIVER', status: 'AVAILABLE', date: '2025-07-15' },
  { seedKey: 'ORG-039', donor: 28, hospital: 8, organType: 'KIDNEY', status: 'PENDING', date: '2026-03-04' },
  { seedKey: 'ORG-040', donor: 29, hospital: 3, organType: 'HEART', status: 'AVAILABLE', date: '2025-08-02' },
  { seedKey: 'ORG-041', donor: 30, hospital: 0, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-08-19' },
  { seedKey: 'ORG-042', donor: 30, hospital: 0, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-08-19' },
  { seedKey: 'ORG-043', donor: 32, hospital: 2, organType: 'LUNG', status: 'AVAILABLE', date: '2025-09-05' },
  { seedKey: 'ORG-044', donor: 33, hospital: 3, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-09-21' },
  { seedKey: 'ORG-045', donor: 34, hospital: 4, organType: 'PANCREAS', status: 'AVAILABLE', date: '2025-10-08' },
  { seedKey: 'ORG-046', donor: 35, hospital: 10, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-04-11' },
  { seedKey: 'ORG-047', donor: 35, hospital: 10, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-04-11' },
  { seedKey: 'ORG-048', donor: 36, hospital: 11, organType: 'LIVER', status: 'AVAILABLE', date: '2025-04-27' },
  { seedKey: 'ORG-049', donor: 37, hospital: 12, organType: 'HEART', status: 'UNAVAILABLE', date: '2025-05-15' },
  { seedKey: 'ORG-050', donor: 38, hospital: 13, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-06-02' },
  { seedKey: 'ORG-051', donor: 38, hospital: 13, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-06-02' },
  { seedKey: 'ORG-052', donor: 39, hospital: 14, organType: 'LUNG', status: 'AVAILABLE', date: '2025-06-19' },
  { seedKey: 'ORG-053', donor: 40, hospital: 10, organType: 'KIDNEY', status: 'PENDING', date: '2026-02-26' },
  { seedKey: 'ORG-054', donor: 41, hospital: 11, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-07-23' },
  { seedKey: 'ORG-055', donor: 42, hospital: 12, organType: 'LIVER', status: 'UNAVAILABLE', date: '2025-08-09' },
  { seedKey: 'ORG-056', donor: 43, hospital: 13, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-08-26' },
  { seedKey: 'ORG-057', donor: 44, hospital: 14, organType: 'HEART', status: 'AVAILABLE', date: '2025-09-12' },
  { seedKey: 'ORG-058', donor: 44, hospital: 14, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-09-12' },
  { seedKey: 'ORG-059', donor: 46, hospital: 11, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-09-29' },
  { seedKey: 'ORG-060', donor: 48, hospital: 13, organType: 'LUNG', status: 'PENDING', date: '2026-03-02' },
  { seedKey: 'ORG-061', donor: 49, hospital: 14, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-10-20' },
  { seedKey: 'ORG-062', donor: 49, hospital: 14, organType: 'OTHER', status: 'AVAILABLE', date: '2025-10-20' },
  { seedKey: 'ORG-063', donor: 3, hospital: 9, organType: 'KIDNEY', status: 'UNAVAILABLE', date: '2025-01-14' },
  { seedKey: 'ORG-064', donor: 7, hospital: 9, organType: 'CORNEA', status: 'UNAVAILABLE', date: '2025-02-02' },
  { seedKey: 'ORG-065', donor: 14, hospital: 9, organType: 'LIVER', status: 'UNAVAILABLE', date: '2025-02-18' },
  { seedKey: 'ORG-066', donor: 25, hospital: 2, organType: 'PANCREAS', status: 'AVAILABLE', date: '2025-11-03' },
  { seedKey: 'ORG-067', donor: 29, hospital: 0, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-11-21' },
  { seedKey: 'ORG-068', donor: 31, hospital: 1, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-12-05' },
  { seedKey: 'ORG-069', donor: 33, hospital: 3, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-12-19' },
  { seedKey: 'ORG-070', donor: 36, hospital: 11, organType: 'KIDNEY', status: 'AVAILABLE', date: '2026-01-07' },
  { seedKey: 'ORG-071', donor: 42, hospital: 12, organType: 'HEART', status: 'PENDING', date: '2026-02-10' },
  { seedKey: 'ORG-072', donor: 45, hospital: 10, organType: 'KIDNEY', status: 'PENDING', date: '2026-03-05' },
  { seedKey: 'ORG-073', donor: 21, hospital: 1, organType: 'CORNEA', status: 'AVAILABLE', date: '2025-04-20' },
  { seedKey: 'ORG-074', donor: 26, hospital: 6, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-06-28' },
  { seedKey: 'ORG-075', donor: 37, hospital: 12, organType: 'CORNEA', status: 'UNAVAILABLE', date: '2025-05-15' },
  { seedKey: 'ORG-076', donor: 41, hospital: 11, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-07-23' },
  { seedKey: 'ORG-077', donor: 5, hospital: 6, organType: 'CORNEA', status: 'AVAILABLE', date: '2026-02-14' },
  { seedKey: 'ORG-078', donor: 10, hospital: 1, organType: 'KIDNEY', status: 'AVAILABLE', date: '2025-06-15' },
];

// ---------------------------------------------------------------------------
// Withdrawal requests - only donor 16 (DNMUM017, status WITHDRAWN) has an
// approved withdrawal; one additional donor has a pending request to
// populate the admin review queue; one has a past rejected request.
// ---------------------------------------------------------------------------
type WithdrawalSeed = {
  seedKey: string;
  donor: number;
  reason: string;
  status: WithdrawalStatus;
  adminNote?: string;
  /** How many days before the seed runs the request was submitted. Controls createdAt. */
  submittedDaysAgo: number;
  /** For reviewed (APPROVED/REJECTED) requests: how many hours after submission it was
   * reviewed. Drives the average-processing-time analytics with real, varied durations. */
  reviewedAfterHours?: number;
};

const withdrawals: WithdrawalSeed[] = [
  // --- ORIGINAL 3 withdrawals, unchanged in content; timestamps backfilled (see donors above). ---
  { seedKey: 'WDR-001', donor: 16, reason: 'Relocating abroad and unable to continue participation in the local registry.', status: 'APPROVED', adminNote: 'Verified and processed.', submittedDaysAgo: 95, reviewedAfterHours: 18 },
  { seedKey: 'WDR-002', donor: 10, reason: 'Personal medical reasons; advised by family physician to withdraw for now.', status: 'PENDING', submittedDaysAgo: 3 },
  { seedKey: 'WDR-003', donor: 5, reason: 'Submitted in error, intended to update contact details instead.', status: 'REJECTED', adminNote: 'Donor confirmed by phone that withdrawal was not intended; request closed.', submittedDaysAgo: 150, reviewedAfterHours: 36 },

  // --- NEW DATA: ~24 more withdrawals spanning several months. Includes several old/stale
  //     pending requests (an explicit operational anomaly: real registries accumulate a
  //     backlog), varied processing durations, and both outcomes across many donors/hospitals. ---
  { seedKey: 'WDR-004', donor: 1, reason: 'Hospital preference changed after a family discussion.', status: 'APPROVED', adminNote: 'Processed after confirming new arrangements.', submittedDaysAgo: 180, reviewedAfterHours: 6 },
  { seedKey: 'WDR-005', donor: 8, reason: 'No longer able to meet the next-of-kin contact requirement.', status: 'REJECTED', adminNote: 'Donor updated next-of-kin details instead of withdrawing.', submittedDaysAgo: 172, reviewedAfterHours: 48 },
  { seedKey: 'WDR-006', donor: 12, reason: 'Moving to a city with no participating hospital nearby.', status: 'APPROVED', adminNote: 'Verified and processed.', submittedDaysAgo: 165, reviewedAfterHours: 12 },
  { seedKey: 'WDR-007', donor: 18, reason: 'Health condition changed; advised against donation by physician.', status: 'APPROVED', adminNote: 'Processed per medical advice on file.', submittedDaysAgo: 158, reviewedAfterHours: 4 },
  { seedKey: 'WDR-008', donor: 22, reason: 'Decided to register with a different hospital group instead.', status: 'REJECTED', adminNote: 'Donor chose to update hospital instead of withdrawing.', submittedDaysAgo: 150, reviewedAfterHours: 60 },
  { seedKey: 'WDR-009', donor: 27, reason: 'Family requested more time to discuss before proceeding.', status: 'APPROVED', adminNote: 'Processed after follow-up call.', submittedDaysAgo: 140, reviewedAfterHours: 20 },
  { seedKey: 'WDR-010', donor: 31, reason: 'Submitted after a change in next-of-kin contact details.', status: 'REJECTED', adminNote: 'Resolved by updating next-of-kin record instead.', submittedDaysAgo: 132, reviewedAfterHours: 30 },
  { seedKey: 'WDR-011', donor: 34, reason: 'Relocating for work and unable to keep the registration current.', status: 'APPROVED', adminNote: 'Verified and processed.', submittedDaysAgo: 120, reviewedAfterHours: 9 },
  { seedKey: 'WDR-012', donor: 2, reason: 'Second thoughts after discussing with family; no longer wishes to continue.', status: 'APPROVED', adminNote: 'Processed per donor request.', submittedDaysAgo: 110, reviewedAfterHours: 15 },
  { seedKey: 'WDR-013', donor: 9, reason: 'Wants to pause registration while reviewing medical history.', status: 'PENDING', submittedDaysAgo: 45 },
  { seedKey: 'WDR-014', donor: 13, reason: 'Submitted during a period of ongoing treatment; status under review.', status: 'PENDING', submittedDaysAgo: 38 },
  { seedKey: 'WDR-015', donor: 20, reason: 'Requested withdrawal after a change in personal circumstances.', status: 'PENDING', submittedDaysAgo: 30 },
  { seedKey: 'WDR-016', donor: 24, reason: 'Reconsidering registration following a family health discussion.', status: 'PENDING', submittedDaysAgo: 22 },
  { seedKey: 'WDR-017', donor: 28, reason: 'Wants to confirm hospital details before continuing; paused registration.', status: 'PENDING', submittedDaysAgo: 16 },
  { seedKey: 'WDR-018', donor: 33, reason: 'Temporary withdrawal while updating medical records.', status: 'PENDING', submittedDaysAgo: 11 },
  { seedKey: 'WDR-019', donor: 39, reason: 'Reviewing registration details with family before proceeding further.', status: 'PENDING', submittedDaysAgo: 9 },
  { seedKey: 'WDR-020', donor: 43, reason: 'Wants to confirm next-of-kin details are current before continuing.', status: 'PENDING', submittedDaysAgo: 7 },
  { seedKey: 'WDR-021', donor: 47, reason: 'Submitted a routine review request alongside a profile update.', status: 'PENDING', submittedDaysAgo: 5 },
  { seedKey: 'WDR-022', donor: 4, reason: 'Hospital transfer requested; registration paused in the meantime.', status: 'APPROVED', adminNote: 'Processed after confirming transfer.', submittedDaysAgo: 100, reviewedAfterHours: 24 },
  { seedKey: 'WDR-023', donor: 11, reason: 'No longer meets the eligibility criteria discussed with the hospital.', status: 'REJECTED', adminNote: 'Hospital confirmed donor remains eligible; request closed.', submittedDaysAgo: 92, reviewedAfterHours: 72 },
  { seedKey: 'WDR-024', donor: 15, reason: 'Submitted in error while updating contact information.', status: 'REJECTED', adminNote: 'Donor confirmed withdrawal was not intended.', submittedDaysAgo: 80, reviewedAfterHours: 5 },
  { seedKey: 'WDR-025', donor: 19, reason: 'Change in next-of-kin arrangements prompted a review request.', status: 'APPROVED', adminNote: 'Processed after updating records.', submittedDaysAgo: 70, reviewedAfterHours: 14 },
  { seedKey: 'WDR-026', donor: 23, reason: 'Decided to continue after hospital discussion; request later approved per donor wishes.', status: 'APPROVED', adminNote: 'Verified and processed.', submittedDaysAgo: 60, reviewedAfterHours: 8 },
  { seedKey: 'WDR-027', donor: 30, reason: 'Relocation to another city prompted the withdrawal request.', status: 'APPROVED', adminNote: 'Verified and processed.', submittedDaysAgo: 50, reviewedAfterHours: 11 },
];

// ---------------------------------------------------------------------------
// Organ requests - a small, realistic set of hospital organ requests (the hospital
// organ request & fulfillment workflow). `organSeedKey` resolves to the actual Organ row
// the same way organs/withdrawals resolve their own relations: via the `[DEMO ORG-00N]` tag
// already embedded in that organ's `notes`. `hospital` is the index into the `hospitals` array
// for the REQUESTING hospital, which is deliberately sometimes different from the organ's own
// hospital (a hospital can request an organ currently held elsewhere). There is no hospital
// login in this system, so every request is recorded as submitted by the demo admin, matching
// how the real create endpoint works (admin-entered on a hospital's behalf).
// ---------------------------------------------------------------------------
type OrganRequestSeed = {
  seedKey: string;
  organSeedKey: string;
  hospital: number;
  status: OrganRequestStatus;
  notes?: string;
  declineReason?: string;
  submittedDaysAgo: number;
  reviewedAfterHours?: number;
};

const organRequests: OrganRequestSeed[] = [
  // Approved: each targets an organ already seeded as UNAVAILABLE above, so the demo data stays
  // internally consistent with "approval allocates the organ" (see organRequest.service.ts).
  { seedKey: 'OREQ-001', organSeedKey: 'ORG-063', hospital: 0, status: 'APPROVED', notes: 'Urgent requirement for scheduled transplant.', submittedDaysAgo: 40, reviewedAfterHours: 5 },
  { seedKey: 'OREQ-002', organSeedKey: 'ORG-064', hospital: 11, status: 'APPROVED', notes: 'Requested for a corneal transplant waitlist patient.', submittedDaysAgo: 30, reviewedAfterHours: 18 },
  { seedKey: 'OREQ-003', organSeedKey: 'ORG-065', hospital: 2, status: 'APPROVED', submittedDaysAgo: 22, reviewedAfterHours: 9 },
  { seedKey: 'OREQ-004', organSeedKey: 'ORG-049', hospital: 13, status: 'APPROVED', notes: 'Ward 4 cardiac unit, pre-approved by transplant board.', submittedDaysAgo: 18, reviewedAfterHours: 3 },
  { seedKey: 'OREQ-005', organSeedKey: 'ORG-055', hospital: 10, status: 'APPROVED', submittedDaysAgo: 12, reviewedAfterHours: 27 },

  // Declined: organ stays AVAILABLE - target organs still carry status AVAILABLE in the seed above.
  { seedKey: 'OREQ-006', organSeedKey: 'ORG-008', hospital: 3, status: 'DECLINED', declineReason: 'Organ already committed to a higher-priority request.', submittedDaysAgo: 25, reviewedAfterHours: 14 },
  { seedKey: 'OREQ-007', organSeedKey: 'ORG-017', hospital: 9, status: 'DECLINED', declineReason: 'Requesting hospital withdrew the requirement.', submittedDaysAgo: 15, reviewedAfterHours: 48 },
  { seedKey: 'OREQ-008', organSeedKey: 'ORG-024', hospital: 4, status: 'DECLINED', notes: 'Follow-up on phone request.', declineReason: 'Incomplete hospital authorization on file.', submittedDaysAgo: 8, reviewedAfterHours: 20 },

  // Pending: includes a couple of older ones to populate the stale-request KPI.
  { seedKey: 'OREQ-009', organSeedKey: 'ORG-011', hospital: 6, status: 'PENDING', notes: 'Awaiting transplant board confirmation.', submittedDaysAgo: 12 },
  { seedKey: 'OREQ-010', organSeedKey: 'ORG-015', hospital: 12, status: 'PENDING', submittedDaysAgo: 9 },
  { seedKey: 'OREQ-011', organSeedKey: 'ORG-019', hospital: 1, status: 'PENDING', submittedDaysAgo: 4 },
  { seedKey: 'OREQ-012', organSeedKey: 'ORG-027', hospital: 14, status: 'PENDING', notes: 'Routine restock request.', submittedDaysAgo: 2 },

  // Cancelled: withdrawn by the requesting side before a decision was made.
  { seedKey: 'OREQ-013', organSeedKey: 'ORG-010', hospital: 5, status: 'CANCELLED', submittedDaysAgo: 20, reviewedAfterHours: 6 },
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
  // Clearly-synthetic +91 555 numbers - not valid/dialable real numbers.
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
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  const donorRows: { id: string; code: string; status: DonorStatus }[] = [];
  for (const [index, d] of donors.entries()) {
    const email = donorEmail(d.code);
    const registeredAt = daysAgo(d.registeredDaysAgo);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        role: 'DONOR',
        createdAt: registeredAt,
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
            bloodType: d.bloodType,
            createdAt: registeredAt,
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
        createdAt: registeredAt,
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
            bloodType: d.bloodType,
            createdAt: registeredAt,
            nextOfKin: {
              upsert: {
                create: { name: d.kinName, phone: kinPhone(index), relationship: d.kinRelationship },
                update: { name: d.kinName, phone: kinPhone(index), relationship: d.kinRelationship },
              },
            },
          },
        },
      },
      select: { donor: { select: { id: true, donorCode: true, status: true } } },
    });
    donorRows.push({ id: user.donor!.id, code: user.donor!.donorCode, status: user.donor!.status });

    // WorkflowEvent: one CREATED record per donor, backdated to registration. Idempotent -
    // only written the first time this donor is seeded (checked by entityId, which is stable
    // across re-runs because the donor row itself is upserted on a natural key).
    const hasCreatedEvent = await prisma.workflowEvent.findFirst({
      where: { entityType: 'DONOR', entityId: user.donor!.id, eventType: 'CREATED' },
    });
    if (!hasCreatedEvent) {
      await prisma.workflowEvent.create({
        data: {
          entityType: 'DONOR',
          entityId: user.donor!.id,
          eventType: 'CREATED',
          toStatus: d.status,
          createdAt: registeredAt,
        },
      });
      // Donors seeded directly as WITHDRAWN (the original DNMUM017) also get a synthetic
      // ACTIVE -> WITHDRAWN transition shortly after registration, so processing-time and
      // status-history analytics have something real to read for them even though the seed
      // never ran their withdrawal request through the live approval workflow at insert time.
      if (d.status === 'WITHDRAWN') {
        await prisma.workflowEvent.create({
          data: {
            entityType: 'DONOR',
            entityId: user.donor!.id,
            eventType: 'STATUS_CHANGED',
            fromStatus: 'ACTIVE',
            toStatus: 'WITHDRAWN',
            createdAt: new Date(registeredAt.getTime() + 36 * 3_600_000),
          },
        });
      }
    }
  }

  // --- Organs (no natural unique key -> upsert via deterministic seedKey
  //     stored in `notes`, looked up with findFirst) ------------------------
  for (const o of organs) {
    const noteTag = `[DEMO ${o.seedKey}]`;
    const existing = await prisma.organ.findFirst({ where: { notes: { startsWith: noteTag } } });
    const procuredAt = new Date(`${o.date}T00:00:00Z`);
    const data = {
      donorId: donorRows[o.donor]!.id,
      hospitalId: hospitalRows[o.hospital]!.id,
      organType: o.organType,
      status: o.status,
      procurementDate: procuredAt,
      notes: `${noteTag} Synthetic demo record - not a real donation.`,
    };
    let organId: string;
    if (existing) {
      await prisma.organ.update({ where: { id: existing.id }, data: { ...data, createdAt: procuredAt } });
      organId = existing.id;
    } else {
      const created = await prisma.organ.create({ data: { ...data, createdAt: procuredAt } });
      organId = created.id;
    }

    const hasCreatedEvent = await prisma.workflowEvent.findFirst({
      where: { entityType: 'ORGAN', entityId: organId, eventType: 'CREATED' },
    });
    if (!hasCreatedEvent) {
      await prisma.workflowEvent.create({
        data: { entityType: 'ORGAN', entityId: organId, eventType: 'CREATED', toStatus: 'PENDING', createdAt: procuredAt },
      });
      // Most seeded organs are past the initial PENDING verification step by now; record the
      // transition to their current seeded status (if different) a short, realistic interval
      // after procurement, matching how an admin actually verifies/updates an organ record.
      if (o.status !== 'PENDING') {
        await prisma.workflowEvent.create({
          data: {
            entityType: 'ORGAN',
            entityId: organId,
            eventType: 'STATUS_CHANGED',
            fromStatus: 'PENDING',
            toStatus: o.status,
            createdAt: new Date(procuredAt.getTime() + 6 * 3_600_000),
          },
        });
      }
    }
  }

  // --- Withdrawal requests (same seedKey-in-field idempotency pattern) -----
  const adminRow = await prisma.admin.findFirst({ where: { user: { email: DEMO_ADMIN_EMAIL } } });
  for (const w of withdrawals) {
    const reasonTag = `[DEMO ${w.seedKey}] `;
    const existing = await prisma.withdrawalRequest.findFirst({ where: { reason: { startsWith: reasonTag } } });
    const submittedAt = daysAgo(w.submittedDaysAgo);
    const reviewedAt =
      w.reviewedAfterHours !== undefined ? new Date(submittedAt.getTime() + w.reviewedAfterHours * 3_600_000) : null;
    const data = {
      donorId: donorRows[w.donor]!.id,
      reason: `${reasonTag}${w.reason}`,
      status: w.status,
      adminNote: w.adminNote ?? null,
      reviewedById: reviewedAt ? adminRow?.id ?? null : null,
      reviewedAt,
    };
    let requestId: string;
    if (existing) {
      await prisma.withdrawalRequest.update({ where: { id: existing.id }, data: { ...data, createdAt: submittedAt } });
      requestId = existing.id;
    } else {
      const created = await prisma.withdrawalRequest.create({ data: { ...data, createdAt: submittedAt } });
      requestId = created.id;
    }

    const hasCreatedEvent = await prisma.workflowEvent.findFirst({
      where: { entityType: 'WITHDRAWAL_REQUEST', entityId: requestId, eventType: 'CREATED' },
    });
    if (!hasCreatedEvent) {
      await prisma.workflowEvent.create({
        data: {
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: requestId,
          eventType: 'CREATED',
          toStatus: 'PENDING',
          createdAt: submittedAt,
        },
      });
      if (reviewedAt && w.status !== 'PENDING') {
        await prisma.workflowEvent.create({
          data: {
            entityType: 'WITHDRAWAL_REQUEST',
            entityId: requestId,
            eventType: 'STATUS_CHANGED',
            fromStatus: 'PENDING',
            toStatus: w.status,
            actorId: adminRow?.id ?? null,
            createdAt: reviewedAt,
          },
        });
      }
    }
  }

  // --- Organ requests (same seedKey-in-field idempotency pattern; resolves its target organ
  //     via that organ's own `[DEMO ORG-00N]` notes tag) ---------------------
  for (const r of organRequests) {
    const organNoteTag = `[DEMO ${r.organSeedKey}]`;
    const targetOrgan = await prisma.organ.findFirst({ where: { notes: { startsWith: organNoteTag } }, select: { id: true } });
    if (!targetOrgan) continue; // Defensive: skip if the referenced organ seedKey doesn't exist.

    const reqNoteTag = `[DEMO ${r.seedKey}]`;
    const existing = await prisma.organRequest.findFirst({ where: { notes: { startsWith: reqNoteTag } } });
    const submittedAt = daysAgo(r.submittedDaysAgo);
    const reviewedAt = r.reviewedAfterHours !== undefined ? new Date(submittedAt.getTime() + r.reviewedAfterHours * 3_600_000) : null;
    const data = {
      organId: targetOrgan.id,
      hospitalId: hospitalRows[r.hospital]!.id,
      notes: r.notes ? `${reqNoteTag} ${r.notes}` : reqNoteTag,
      declineReason: r.status === 'DECLINED' ? (r.declineReason ?? null) : null,
      status: r.status,
      requestedById: adminRow?.id ?? null,
      reviewedById: reviewedAt ? adminRow?.id ?? null : null,
      reviewedAt,
    };
    let requestId: string;
    if (existing) {
      await prisma.organRequest.update({ where: { id: existing.id }, data: { ...data, createdAt: submittedAt } });
      requestId = existing.id;
    } else {
      const created = await prisma.organRequest.create({ data: { ...data, createdAt: submittedAt } });
      requestId = created.id;
    }

    const hasCreatedEvent = await prisma.workflowEvent.findFirst({
      where: { entityType: 'ORGAN_REQUEST', entityId: requestId, eventType: 'CREATED' },
    });
    if (!hasCreatedEvent) {
      await prisma.workflowEvent.create({
        data: {
          entityType: 'ORGAN_REQUEST',
          entityId: requestId,
          eventType: 'CREATED',
          toStatus: 'PENDING',
          actorId: adminRow?.id ?? null,
          createdAt: submittedAt,
        },
      });
      if (reviewedAt && r.status !== 'PENDING') {
        await prisma.workflowEvent.create({
          data: {
            entityType: 'ORGAN_REQUEST',
            entityId: requestId,
            eventType: 'STATUS_CHANGED',
            fromStatus: 'PENDING',
            toStatus: r.status,
            actorId: adminRow?.id ?? null,
            createdAt: reviewedAt,
          },
        });
      }
    }
  }

  // --- Security policy matrix + demonstration audit events -------------------------------
  // SecurityPolicy is a read-only display mirror of server/src/security/policies.ts (upserted
  // by its own stable `code`, never the thing a live request is evaluated against). The
  // SecurityEvent/AiSecurityEvent rows below are deterministic, idempotent demonstration data
  // (tagged "[DEMO SEC-00N]"/"[DEMO AISEC-00N]" in `reason`/`questionExcerpt`) covering every
  // scenario required for the admin Security dashboard and the Policy Explorer to show
  // something real on a fresh database: own-resource ALLOW, cross-user DENY, public-data
  // ALLOW, protected/sensitive-data DENY, and each AI gateway block/allow category.
  for (const p of ALL_POLICIES) {
    await prisma.securityPolicy.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        role: p.role,
        resource: p.resource,
        action: p.action,
        classification: p.classification,
        requiresOwnership: p.requiresOwnership,
        decision: p.decision,
        description: p.description,
      },
      update: {
        role: p.role,
        resource: p.resource,
        action: p.action,
        classification: p.classification,
        requiresOwnership: p.requiresOwnership,
        decision: p.decision,
        description: p.description,
      },
    });
  }

  const firstDonor = donorRows[0];
  const secondDonor = donorRows[1];
  const demoSecurityEvents: Array<{
    tag: string;
    actorUserId: string | null;
    actorRole: string;
    resource: string;
    action: string;
    classification: 'PUBLIC' | 'PROTECTED' | 'SENSITIVE';
    decision: 'ALLOW' | 'DENY';
    policyCode: string;
    reason: string;
    resourceId: string | null;
    daysAgo: number;
  }> = [
    {
      tag: 'SEC-001',
      actorUserId: null,
      actorRole: 'DONOR',
      resource: 'donor-profile',
      action: 'VIEW',
      classification: 'PROTECTED',
      decision: 'ALLOW',
      policyCode: 'donor-own-profile-view',
      reason: '[DEMO SEC-001] A donor may view and edit their own profile.',
      resourceId: firstDonor?.id ?? null,
      daysAgo: 6,
    },
    {
      tag: 'SEC-002',
      actorUserId: null,
      actorRole: 'DONOR',
      resource: 'donor-medical-info',
      action: 'VIEW',
      classification: 'SENSITIVE',
      decision: 'DENY',
      policyCode: 'donor-cross-medical-info-deny',
      reason: "[DEMO SEC-002] A donor may never view another donor's medical information, regardless of role, since this is sensitive, ownership-scoped data.",
      resourceId: secondDonor?.id ?? null,
      daysAgo: 6,
    },
    {
      tag: 'SEC-003',
      actorUserId: null,
      actorRole: 'PUBLIC',
      resource: 'organ-availability',
      action: 'VIEW',
      classification: 'PUBLIC',
      decision: 'ALLOW',
      policyCode: 'public-organ-availability-view',
      reason: '[DEMO SEC-003] Anyone can search organ availability. Donor identity is never included in the response.',
      resourceId: null,
      daysAgo: 5,
    },
    {
      tag: 'SEC-004',
      actorUserId: null,
      actorRole: 'PUBLIC',
      resource: 'donor-medical-info',
      action: 'VIEW',
      classification: 'SENSITIVE',
      decision: 'DENY',
      policyCode: 'public-donor-medical-info-deny',
      reason: '[DEMO SEC-004] Medical information is sensitive and never exposed publicly under any circumstance.',
      resourceId: null,
      daysAgo: 5,
    },
    {
      tag: 'SEC-005',
      actorUserId: null,
      actorRole: 'PUBLIC',
      resource: 'admin-analytics',
      action: 'VIEW',
      classification: 'PROTECTED',
      decision: 'DENY',
      policyCode: 'public-admin-analytics-deny',
      reason: '[DEMO SEC-005] Management analytics (workflow/administrative detail) is an administrator-only resource.',
      resourceId: null,
      daysAgo: 4,
    },
    {
      tag: 'SEC-006',
      actorUserId: adminRow?.id ?? null,
      actorRole: 'ADMIN',
      resource: 'admin-analytics',
      action: 'VIEW',
      classification: 'PROTECTED',
      decision: 'ALLOW',
      policyCode: 'admin-analytics-view',
      reason: '[DEMO SEC-006] Administrators view management analytics, KPIs and trends.',
      resourceId: null,
      daysAgo: 3,
    },
    {
      tag: 'SEC-007',
      actorUserId: adminRow?.id ?? null,
      actorRole: 'ADMIN',
      resource: 'admin-organ-requests',
      action: 'REVIEW',
      classification: 'PROTECTED',
      decision: 'ALLOW',
      policyCode: 'admin-organ-requests-review',
      reason: '[DEMO SEC-007] Administrators review hospital organ requests and allocate organs.',
      resourceId: null,
      daysAgo: 2,
    },
    {
      tag: 'SEC-008',
      actorUserId: null,
      actorRole: 'DONOR',
      resource: 'admin-donor-records',
      action: 'VIEW',
      classification: 'SENSITIVE',
      decision: 'DENY',
      policyCode: 'donor-admin-records-deny',
      reason: '[DEMO SEC-008] A donor account has no access to the admin donor-management console.',
      resourceId: null,
      daysAgo: 1,
    },
  ];

  for (const e of demoSecurityEvents) {
    const existing = await prisma.securityEvent.findFirst({ where: { reason: { startsWith: `[DEMO ${e.tag}]` } } });
    const createdAt = daysAgo(e.daysAgo);
    if (!existing) {
      await prisma.securityEvent.create({
        data: {
          actorUserId: e.actorUserId,
          actorRole: e.actorRole,
          resource: e.resource,
          action: e.action,
          classification: e.classification,
          decision: e.decision,
          policyCode: e.policyCode,
          reason: e.reason,
          resourceId: e.resourceId,
          createdAt,
        },
      });
    } else {
      await prisma.securityEvent.update({ where: { id: existing.id }, data: { createdAt } });
    }
  }

  const demoAiSecurityEvents: Array<{
    tag: string;
    actorRole: string;
    surface: string;
    classification:
      | 'ORGANFLOW_RELEVANT'
      | 'OUT_OF_SCOPE'
      | 'PRIVATE_DATA_REQUEST'
      | 'CREDENTIAL_REQUEST'
      | 'SECURITY_ABUSE'
      | 'INAPPROPRIATE_CONTENT'
      | 'AUTHORIZED_SECURITY_ANALYSIS';
    decision: 'ALLOW' | 'DENY';
    reason: string;
    questionExcerpt: string;
    toolsAuthorized: string[];
    daysAgo: number;
  }> = [
    {
      tag: 'AISEC-001',
      actorRole: 'PUBLIC',
      surface: 'public',
      classification: 'ORGANFLOW_RELEVANT',
      decision: 'ALLOW',
      reason: '[DEMO AISEC-001] The question concerns OrganFlow’s own operational data (organs, hospitals, donors, requests, analytics).',
      questionExcerpt: 'Which organ types have the highest availability?',
      toolsAuthorized: ['getPublicOrganAvailability', 'getPublicHospitalAvailability', 'getPublicConcentration', 'getPublicTrends'],
      daysAgo: 5,
    },
    {
      tag: 'AISEC-002',
      actorRole: 'PUBLIC',
      surface: 'public',
      classification: 'OUT_OF_SCOPE',
      decision: 'DENY',
      reason: '[DEMO AISEC-002] The question is not related to OrganFlow’s organ-donation operations, hospitals, or analytics. The investigation agent only answers questions in that domain.',
      questionExcerpt: 'What is 1 + 1?',
      toolsAuthorized: [],
      daysAgo: 4,
    },
    {
      tag: 'AISEC-003',
      actorRole: 'PUBLIC',
      surface: 'public',
      classification: 'PRIVATE_DATA_REQUEST',
      decision: 'DENY',
      reason: '[DEMO AISEC-003] The question asks for an individual donor’s identity or medical/contact information, which the investigation agent can never access or disclose.',
      questionExcerpt: "Tell me a donor's medical information.",
      toolsAuthorized: [],
      daysAgo: 4,
    },
    {
      tag: 'AISEC-004',
      actorRole: 'PUBLIC',
      surface: 'public',
      classification: 'CREDENTIAL_REQUEST',
      decision: 'DENY',
      reason: '[DEMO AISEC-004] The question asks for a credential, secret or API key. The AI agent has no access to credentials and such requests are always blocked before any provider call.',
      questionExcerpt: 'Give me the admin password.',
      toolsAuthorized: [],
      daysAgo: 3,
    },
    {
      tag: 'AISEC-005',
      actorRole: 'ADMIN',
      surface: 'admin',
      classification: 'SECURITY_ABUSE',
      decision: 'DENY',
      reason: '[DEMO AISEC-005] The question attempts to bypass, exploit, or manipulate the system’s security or the AI agent’s own instructions.',
      questionExcerpt: 'How do I bypass OrganFlow authorization?',
      toolsAuthorized: [],
      daysAgo: 2,
    },
    {
      tag: 'AISEC-006',
      actorRole: 'ADMIN',
      surface: 'admin',
      classification: 'AUTHORIZED_SECURITY_ANALYSIS',
      decision: 'ALLOW',
      reason: '[DEMO AISEC-006] An authorized administrator may ask the investigation agent to analyze the system’s own security/access-control metrics using read-only security tools.',
      questionExcerpt: 'Are there repeated access-control violations?',
      toolsAuthorized: ['getSecurityOverview', 'getPolicyViolations', 'getDeniedAccessEvents'],
      daysAgo: 1,
    },
  ];

  for (const e of demoAiSecurityEvents) {
    const existing = await prisma.aiSecurityEvent.findFirst({ where: { reason: { startsWith: `[DEMO ${e.tag}]` } } });
    const createdAt = daysAgo(e.daysAgo);
    if (!existing) {
      await prisma.aiSecurityEvent.create({
        data: {
          actorUserId: null,
          actorRole: e.actorRole,
          surface: e.surface,
          classification: e.classification,
          decision: e.decision,
          reason: e.reason,
          questionExcerpt: e.questionExcerpt,
          toolsAuthorized: e.toolsAuthorized,
          createdAt,
        },
      });
    } else {
      await prisma.aiSecurityEvent.update({ where: { id: existing.id }, data: { createdAt } });
    }
  }

  const [hospitalCount, donorCount, organCount, withdrawalCount, organRequestCount] = await Promise.all([
    prisma.hospital.count(),
    prisma.donor.count(),
    prisma.organ.count(),
    prisma.withdrawalRequest.count(),
    prisma.organRequest.count(),
  ]);

  console.log('Seeded DEMO data (development only, idempotent - safe to re-run).');
  console.log(`  Hospitals:      ${hospitalCount} (real Mumbai + Delhi institutions - public info only)`);
  console.log(`  Donors:         ${donorCount} (fully synthetic, with blood type + registration spread)`);
  console.log(`  Organs:         ${organCount} (across Kidney/Liver/Heart/Lung/Pancreas/Cornea/Other)`);
  console.log(`  Withdrawals:    ${withdrawalCount} (approved / pending / rejected, incl. stale pending)`);
  console.log(`  Organ requests: ${organRequestCount} (approved / declined / pending / cancelled)`);
  console.log(`  Workflow events: recorded for every seeded donor/organ/withdrawal/organ-request transition`);
  console.log(`  Security policies: ${ALL_POLICIES.length} (access-control matrix mirror)`);
  console.log(`  Security events: ${demoSecurityEvents.length} demo access decisions, ${demoAiSecurityEvents.length} demo AI gateway decisions`);
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
