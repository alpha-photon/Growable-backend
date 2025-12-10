import MedicationReminder from '../models/MedicationReminder.model.js';
import * as childService from './child.service.js';

export const createMedication = async (childId, medicationData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  // Generate logs for each scheduled dose
  const logs = [];
  if (medicationData.times && medicationData.times.length > 0) {
    const startDate = new Date(medicationData.startDate);
    const endDate = medicationData.endDate ? new Date(medicationData.endDate) : null;
    const daysToGenerate = endDate 
      ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      : 30; // Default 30 days if no end date

    for (let day = 0; day < daysToGenerate; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);

      for (const time of medicationData.times) {
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(time.hour, time.minute, 0, 0);

        logs.push({
          scheduledTime,
          status: 'pending',
        });
      }
    }
  }

  const medication = await MedicationReminder.create({
    ...medicationData,
    childId,
    createdBy: userId,
    logs,
  });

  return await MedicationReminder.findById(medication._id)
    .populate('createdBy', 'name email')
    .populate('prescribedBy', 'name email');
};

export const getMedications = async (childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  return await MedicationReminder.find({ childId, isActive: true })
    .populate('createdBy', 'name email')
    .populate('prescribedBy', 'name email')
    .sort({ startDate: -1 });
};

export const updateMedication = async (medicationId, childId, updateData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const medication = await MedicationReminder.findOne({ _id: medicationId, childId });
  if (!medication) {
    throw new Error('Medication not found');
  }

  Object.assign(medication, updateData);
  await medication.save();

  return await MedicationReminder.findById(medication._id)
    .populate('createdBy', 'name email')
    .populate('prescribedBy', 'name email');
};

export const logMedicationDose = async (medicationId, childId, logData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const medication = await MedicationReminder.findOne({ _id: medicationId, childId });
  if (!medication) {
    throw new Error('Medication not found');
  }

  const log = {
    ...logData,
    loggedBy: userId,
    loggedAt: new Date(),
  };

  medication.logs.push(log);
  await medication.save();

  return medication;
};

export const deleteMedication = async (medicationId, childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const medication = await MedicationReminder.findOne({ _id: medicationId, childId });
  if (!medication) {
    throw new Error('Medication not found');
  }

  medication.isActive = false;
  await medication.save();
  
  return { message: 'Medication deleted successfully' };
};

