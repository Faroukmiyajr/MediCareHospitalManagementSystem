import express from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import {
  createServiceAppointment,
  confirmServicePayment,
  getServiceAppointments,
  getServiceAppointmentById,
  updateServiceAppointment,
  cancelServiceAppointment,
  getServiceAppointmentStats,
  getServiceAppointmentsByPatient,
} from '../controllers/serviceAppointmentController.js';

const serviceAppointmentRouter = express.Router();

// Public routes
serviceAppointmentRouter.get('/', getServiceAppointments);
serviceAppointmentRouter.get('/stats/summary', getServiceAppointmentStats);
serviceAppointmentRouter.get('/confirm', confirmServicePayment);

// Auth routes
serviceAppointmentRouter.post('/', clerkMiddleware(), requireAuth(), createServiceAppointment);
serviceAppointmentRouter.get('/me', clerkMiddleware(), requireAuth(), getServiceAppointmentsByPatient);

// Specific routes
serviceAppointmentRouter.get('/:id', getServiceAppointmentById);
serviceAppointmentRouter.put('/:id', updateServiceAppointment);
serviceAppointmentRouter.post('/:id/cancel', cancelServiceAppointment);

export default serviceAppointmentRouter;