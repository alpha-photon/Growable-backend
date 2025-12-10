import Appointment from '../models/Appointment.model.js';
import TherapistProfile from '../models/TherapistProfile.model.js';
import User from '../models/User.model.js';
import Child from '../models/Child.model.js';
import * as childService from './child.service.js';
import * as notificationService from './notification.service.js';

/**
 * Create new appointment
 */
export const createAppointment = async (appointmentData) => {
  const { therapistId, patientId, appointmentDate, appointmentTime, consultationType } =
    appointmentData;

  // Validate therapist exists
  const therapist = await User.findById(therapistId);
  if (!therapist || !['therapist', 'doctor'].includes(therapist.role)) {
    throw new Error('Therapist not found');
  }

  // Validate patient exists
  const patient = await User.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Check therapist availability
  const profile = await TherapistProfile.findOne({ userId: therapistId });
  if (!profile || !profile.isActive) {
    throw new Error('Therapist profile not active');
  }

  // Check if slot is available
  const appointmentDateTime = new Date(appointmentDate);
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  if (appointmentDateTime < new Date()) {
    throw new Error('Cannot book appointment in the past');
  }

  // Check for existing appointment at same time
  const existingAppointment = await Appointment.findOne({
    therapistId,
    appointmentDate: {
      $gte: new Date(appointmentDateTime.getTime() - 30 * 60 * 1000), // 30 min before
      $lte: new Date(appointmentDateTime.getTime() + 30 * 60 * 1000), // 30 min after
    },
    status: { $in: ['pending', 'confirmed'] },
  });

  if (existingAppointment) {
    throw new Error('Time slot already booked');
  }

  // Get consultation fee from profile
  const consultationFee =
    consultationType === 'online'
      ? profile.consultationFee?.online || 0
      : profile.consultationFee?.offline || 0;

  const appointment = new Appointment({
    ...appointmentData,
    consultationFee,
    duration: profile.sessionDuration || 60,
  });

  await appointment.save();

  // Update therapist stats
  profile.totalAppointments += 1;
  await profile.save();

  // Auto-assign child to therapist/doctor if childId is provided
  if (appointmentData.childId) {
    try {
      const therapistRole = therapist.role; // 'therapist' or 'doctor'
      
      // Check if already assigned
      const child = await Child.findById(appointmentData.childId);
      
      if (child) {
        // Check if not already assigned
        if (therapistRole === 'doctor') {
          const isAlreadyAssigned = child.assignedDoctors?.some(
            (doc) => doc.doctorId?.toString() === therapistId.toString() && doc.isActive
          );
          if (!isAlreadyAssigned && child.primaryDoctor?.toString() !== therapistId.toString()) {
            // Add to assigned list or share
            await childService.addAssignedProfessional(
              appointmentData.childId,
              therapistId,
              'doctor'
            );
          }
        } else if (therapistRole === 'therapist') {
          const isAlreadyAssigned = child.assignedTherapists?.some(
            (therapist) => therapist.therapistId?.toString() === therapistId.toString() && therapist.isActive
          );
          if (!isAlreadyAssigned && child.primaryTherapist?.toString() !== therapistId.toString()) {
            // Add to assigned list or share
            await childService.addAssignedProfessional(
              appointmentData.childId,
              therapistId,
              'therapist'
            );
          }
        }
      }
    } catch (error) {
      // Log error but don't fail appointment creation
      console.error('Error auto-assigning child to professional:', error.message);
    }
  }

  await appointment.populate('therapistId', 'name email avatar role');
  await appointment.populate('patientId', 'name email avatar');
  if (appointment.childId) {
    await appointment.populate('childId', 'name dateOfBirth gender profilePhoto');
  }

  // Send notification to therapist
  try {
    await notificationService.notifyAppointmentCreated(
      therapistId,
      patientId,
      appointment._id,
      appointmentDate
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't fail the appointment creation if notification fails
  }
  
  return appointment;
};

/**
 * Get appointments with filters
 */
export const getAppointments = async (filters = {}, options = {}) => {
  const {
    therapistId,
    patientId,
    status,
    startDate,
    endDate,
    consultationType,
    page = 1,
    limit = 20,
  } = filters;

  const query = {};

  if (therapistId) query.therapistId = therapistId;
  if (patientId) query.patientId = patientId;
  if (status) {
    // Handle comma-separated status values
    if (status.includes(',')) {
      query.status = { $in: status.split(',').map(s => s.trim()) };
    } else {
      query.status = status;
    }
  }
  if (consultationType) query.consultationType = consultationType;

  if (startDate || endDate) {
    query.appointmentDate = {};
    if (startDate) query.appointmentDate.$gte = new Date(startDate);
    if (endDate) query.appointmentDate.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const appointments = await Appointment.find(query)
    .populate('therapistId', 'name email avatar role')
    .populate('patientId', 'name email avatar')
    .populate('childId', 'name dateOfBirth gender profilePhoto')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Appointment.countDocuments(query);

  return {
    appointments,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update appointment status
 */
export const updateAppointmentStatus = async (appointmentId, status, userId, role, cancellationReason) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate('therapistId')
    .populate('patientId');

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Authorization check
  const isTherapist = appointment.therapistId._id.toString() === userId.toString();
  const isPatient = appointment.patientId._id.toString() === userId.toString();
  const isAdmin = role === 'admin';

  if (!isTherapist && !isPatient && !isAdmin) {
    throw new Error('Not authorized to update this appointment');
  }

  // Validate status transition
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled', 'no-show'],
    completed: [],
    cancelled: [],
    'no-show': [],
  };

  if (!validTransitions[appointment.status]?.includes(status)) {
    throw new Error(`Cannot change status from ${appointment.status} to ${status}`);
  }

  const previousStatus = appointment.status;
  appointment.status = status;

  if (status === 'cancelled') {
    appointment.cancelledBy = isTherapist ? 'therapist' : isPatient ? 'patient' : 'system';
    appointment.cancelledAt = new Date();
    if (cancellationReason) {
      appointment.cancellationReason = cancellationReason;
    }
  }

  if (status === 'completed') {
    appointment.completedAt = new Date();
  }

  await appointment.save();

  // Send notification when appointment is confirmed
  if (status === 'confirmed' && previousStatus === 'pending') {
    try {
      await notificationService.notifyAppointmentConfirmed(
        appointment.patientId._id,
        appointment.therapistId._id,
        appointment._id,
        appointment.appointmentDate
      );
    } catch (error) {
      console.error('Error sending notification:', error);
      // Don't fail the status update if notification fails
    }
  }

  return appointment;
};

/**
 * Cancel appointment
 */
export const cancelAppointment = async (appointmentId, userId, role, reason) => {
  return await updateAppointmentStatus(appointmentId, 'cancelled', userId, role, reason);
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate('therapistId', 'name email avatar role')
    .populate('patientId', 'name email avatar')
    .populate('childId', 'name dateOfBirth gender profilePhoto')
    .populate('sessionNotesId')
    .lean();

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  return appointment;
};

/**
 * Check availability for a specific date and time
 */
export const checkAvailability = async (therapistId, date, time) => {
  const appointmentDateTime = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  const conflictingAppointment = await Appointment.findOne({
    therapistId,
    appointmentDate: {
      $gte: new Date(appointmentDateTime.getTime() - 30 * 60 * 1000),
      $lte: new Date(appointmentDateTime.getTime() + 30 * 60 * 1000),
    },
    status: { $in: ['pending', 'confirmed'] },
  });

  return !conflictingAppointment;
};

