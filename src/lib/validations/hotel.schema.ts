import { z } from 'zod';

export const roomTypeSchema = z.enum([
  'single',
  'double',
  'suite',
  'deluxe',
  'presidential',
]);

export const bookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
]);

export const paymentStatusSchema = z.enum(['pending', 'paid', 'refunded']);

// Room type for database (matches convex schema)
export const roomTypeInventorySchema = z.object({
  type: z.string().min(1, 'Room type is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  rate_per_night: z.number().min(0, 'Rate must be positive'),
  total_rooms: z.number().min(1, 'Total rooms must be at least 1'),
  blocked_rooms: z.number().min(0).optional().default(0),
  available_rooms: z.number().min(0).optional().default(0),
});

// Room type detail for hotel details table (legacy - for display purposes)
export const roomTypeDetailSchema = z.object({
  room_type: roomTypeSchema,
  total_rooms: z.number().min(1, 'Must have at least 1 room'),
  rooms_booked: z.number().min(0).optional().default(0),
  rate_per_night: z.number().min(0, 'Rate must be positive'),
});

// Hotel form schema matching database schema (address, phone, email, website)
export const hotelFormSchema = z.object({
  hotel_name: z.string().min(2, 'Hotel name must be at least 2 characters').max(100),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  rating: z.number().min(0).max(5).optional(),
  amenities: z.array(z.string()).optional().default([]),
  room_types: z.array(roomTypeInventorySchema).min(1, 'At least one room type is required'),
});

export const hotelDetailFormSchema = z.object({
  guest_id: z.string().min(1, 'Guest is required'),
  hotel_id: z.string().min(1, 'Hotel is required'),
  room_type: roomTypeSchema,
  room_number: z.string().optional(),
  check_in_date: z.coerce.date(),
  check_out_date: z.coerce.date(),
  rate_per_night: z.number().min(0, 'Rate must be positive'),
  booking_status: bookingStatusSchema.optional().default('pending'),
  booking_confirmation_number: z.string().optional(),
  payment_status: paymentStatusSchema.optional().default('pending'),
  special_requests: z.string().optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.check_out_date > data.check_in_date,
  {
    message: 'Check-out date must be after check-in date',
    path: ['check_out_date'],
  }
);

export type HotelFormValues = z.input<typeof hotelFormSchema>;
export type HotelDetailFormValues = z.input<typeof hotelDetailFormSchema>;
export type RoomTypeDetailValues = z.input<typeof roomTypeDetailSchema>;
export type RoomTypeInventoryValues = z.input<typeof roomTypeInventorySchema>;
