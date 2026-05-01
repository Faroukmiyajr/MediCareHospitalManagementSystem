import express from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';

import {
  cancelAppointment,
  createAppointment,
  getAppointments,
  getAppointmentsByDoctor,
  getAppointmentsByPatient,
  getRegisteredUserCount,
  updateAppointment,
  confirmPayment,   
  getStats          
} from '../controllers/appointmentController.js'; 

const appointmentsRouter = express.Router();

// public routes
appointmentsRouter.get('/', getAppointments);
appointmentsRouter.get('/confirm', confirmPayment);
appointmentsRouter.get('/stats/summary', getStats);
appointmentsRouter.get('/patients/count', getRegisteredUserCount); 

// auth routes
appointmentsRouter.post('/', clerkMiddleware(), requireAuth(), createAppointment);
appointmentsRouter.get('/me', clerkMiddleware(), requireAuth(), getAppointmentsByPatient);

// doctor route (placed after fixed routes)
appointmentsRouter.get('/doctor/:doctorId', getAppointmentsByDoctor);

appointmentsRouter.post('/:id/cancel', cancelAppointment);
appointmentsRouter.put('/:id', updateAppointment);

export default appointmentsRouter;