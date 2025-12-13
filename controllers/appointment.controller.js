import * as appointmentService from '../services/appointment.service.js';

/**
 * @route   POST /api/appointments
 * @desc    Create new appointment
 * @access  Private
 */
export const createAppointment = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // Only patients/parents can book appointments (not therapists/doctors booking for themselves)
    if (['therapist', 'doctor'].includes(req.user.role)) {
      // Therapists can't book appointments as patients
      if (!req.body.patientId || req.body.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Therapists and doctors cannot book appointments. They can only receive bookings.',
        });
      }
    }

    const appointment = await appointmentService.createAppointment({
      ...req.body,
      patientId: req.body.patientId || req.user._id,
    });

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/appointments
 * @desc    Get appointments with filters
 * @access  Private
 */
export const getAppointments = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // If user is therapist/doctor, show their appointments
    // If user is parent, show appointments for their children
    // If user is patient, show their appointments
    const filters = {
      ...req.query,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    if (['therapist', 'doctor'].includes(req.user.role)) {
      filters.therapistId = req.user._id;
    } else if (req.user.role === 'parent') {
      // For parents, get appointments for their children
      filters.parentId = req.user._id;
    } else {
      filters.patientId = req.user._id;
    }

    const result = await appointmentService.getAppointments(filters);

    res.json({
      success: true,
      data: result.appointments,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const appointment = await appointmentService.getAppointmentById(req.params.id);

    // Check authorization - only therapist, patient, or admin can view
    const isTherapist = appointment.therapistId._id?.toString() === req.user._id.toString();
    const isPatient = appointment.patientId._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isTherapist && !isPatient && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this appointment',
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    if (error.message === 'Appointment not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment (date/time)
 * @access  Private
 */
export const updateAppointment = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { appointmentDate, appointmentTime } = req.body;

    // Validate required fields
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'appointmentDate and appointmentTime are required',
      });
    }

    console.log('updateAppointment called:', {
      appointmentId: req.params.id,
      appointmentDate,
      appointmentTime,
      userId: req.user._id,
      role: req.user.role,
    });

    const appointment = await appointmentService.updateAppointment(
      req.params.id,
      { appointmentDate, appointmentTime },
      req.user._id,
      req.user.role
    );

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment updated successfully',
    });
  } catch (error) {
    console.error('updateAppointment error:', error);
    next(error);
  }
};

/**
 * @route   PUT /api/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { status, cancellationReason } = req.body;

    const appointment = await appointmentService.updateAppointmentStatus(
      req.params.id,
      status,
      req.user._id,
      req.user.role,
      cancellationReason
    );

    res.json({
      success: true,
      data: appointment,
      message: `Appointment ${status} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/appointments/check-availability
 * @desc    Check availability for a date/time
 * @access  Public
 */
export const checkAvailability = async (req, res, next) => {
  try {
    const { therapistId, date, time } = req.query;

    if (!therapistId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'therapistId, date, and time are required',
      });
    }

    const isAvailable = await appointmentService.checkAvailability(therapistId, date, time);

    res.json({
      success: true,
      data: { available: isAvailable },
    });
  } catch (error) {
    next(error);
  }
};

