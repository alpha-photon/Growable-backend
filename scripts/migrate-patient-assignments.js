/**
 * Migration Script: Convert legacy assignment structure to unified assignments array
 * 
 * This script migrates:
 * - onboardedBy + onboardedByRole -> assignments with type 'onboarded'
 * - primaryDoctor -> assignments with type 'primary' and role 'doctor'
 * - primaryTherapist -> assignments with type 'primary' and role 'therapist'
 * - assignedDoctors -> assignments with type 'assigned' and role 'doctor'
 * - assignedTherapists -> assignments with type 'assigned' and role 'therapist'
 * 
 * Run: node backend/scripts/migrate-patient-assignments.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Patient from '../models/Patient.model.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory (parent of scripts)
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/specialable';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function migrateAssignments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const patients = await Patient.find({});
    console.log(`Found ${patients.length} patients to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const patient of patients) {
      try {
        // Skip if already migrated (has assignments array with data)
        if (patient.assignments && patient.assignments.length > 0) {
          console.log(`Skipping patient ${patient._id} - already has assignments`);
          skipped++;
          continue;
        }

        const assignments = [];

        // 1. Add onboardedBy as 'onboarded' assignment
        if (patient.onboardedBy) {
          assignments.push({
            professionalId: patient.onboardedBy,
            role: patient.onboardedByRole || 'therapist',
            assignmentType: 'onboarded',
            assignedAt: patient.createdAt || new Date(),
            isActive: true,
          });
        }

        // 2. Add primary doctor as 'primary' assignment
        if (patient.primaryDoctor) {
          // Check if already added as onboarded
          const isOnboarded = assignments.some(
            a => a.professionalId?.toString() === patient.primaryDoctor.toString() && a.role === 'doctor'
          );
          
          if (!isOnboarded) {
            assignments.push({
              professionalId: patient.primaryDoctor,
              role: 'doctor',
              assignmentType: 'primary',
              assignedAt: patient.createdAt || new Date(),
              isActive: true,
            });
          } else {
            // Upgrade onboarded to primary
            const onboardedAssignment = assignments.find(
              a => a.professionalId?.toString() === patient.primaryDoctor.toString()
            );
            if (onboardedAssignment) {
              onboardedAssignment.assignmentType = 'primary';
            }
          }
        }

        // 3. Add primary therapist as 'primary' assignment
        if (patient.primaryTherapist) {
          // Check if already added as onboarded
          const isOnboarded = assignments.some(
            a => a.professionalId?.toString() === patient.primaryTherapist.toString() && a.role === 'therapist'
          );
          
          if (!isOnboarded) {
            assignments.push({
              professionalId: patient.primaryTherapist,
              role: 'therapist',
              assignmentType: 'primary',
              assignedAt: patient.createdAt || new Date(),
              isActive: true,
            });
          } else {
            // Upgrade onboarded to primary
            const onboardedAssignment = assignments.find(
              a => a.professionalId?.toString() === patient.primaryTherapist.toString()
            );
            if (onboardedAssignment) {
              onboardedAssignment.assignmentType = 'primary';
            }
          }
        }

        // 4. Add assigned doctors
        if (patient.assignedDoctors && patient.assignedDoctors.length > 0) {
          patient.assignedDoctors.forEach(doc => {
            // Check if already exists (as onboarded or primary)
            const exists = assignments.some(
              a => a.professionalId?.toString() === doc.doctorId?.toString() && a.role === 'doctor'
            );
            
            if (!exists) {
              assignments.push({
                professionalId: doc.doctorId,
                role: 'doctor',
                assignmentType: 'assigned',
                specialization: doc.specialization,
                assignedAt: doc.assignedAt || patient.createdAt || new Date(),
                isActive: doc.isActive !== false, // Default to true
                removedAt: doc.isActive === false ? (doc.removedAt || new Date()) : undefined,
              });
            }
          });
        }

        // 5. Add assigned therapists
        if (patient.assignedTherapists && patient.assignedTherapists.length > 0) {
          patient.assignedTherapists.forEach(therapist => {
            // Check if already exists (as onboarded or primary)
            const exists = assignments.some(
              a => a.professionalId?.toString() === therapist.therapistId?.toString() && a.role === 'therapist'
            );
            
            if (!exists) {
              assignments.push({
                professionalId: therapist.therapistId,
                role: 'therapist',
                assignmentType: 'assigned',
                specialization: therapist.specialization,
                assignedAt: therapist.assignedAt || patient.createdAt || new Date(),
                isActive: therapist.isActive !== false, // Default to true
                removedAt: therapist.isActive === false ? (therapist.removedAt || new Date()) : undefined,
              });
            }
          });
        }

        // Update patient with assignments
        if (assignments.length > 0) {
          patient.assignments = assignments;
          await patient.save();
          migrated++;
          console.log(`✓ Migrated patient ${patient._id} - ${assignments.length} assignments`);
        } else {
          skipped++;
          console.log(`- Skipped patient ${patient._id} - no assignments to migrate`);
        }
      } catch (error) {
        errors++;
        console.error(`✗ Error migrating patient ${patient._id}:`, error.message);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total patients: ${patients.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('\nMigration completed!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateAssignments();

