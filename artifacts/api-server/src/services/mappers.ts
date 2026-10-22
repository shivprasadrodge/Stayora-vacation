export type PropertyRecord = {
  id: string;
  hostId: string;
  title: string;
  description: string;
  city: string;
  country: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  pricePerNight: number;
  propertyType: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  imageUrls: string[];
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  host: { name: string };
};

export function toProperty(property: PropertyRecord) {
  return {
    id: property.id,
    hostId: property.hostId,
    hostName: property.host.name,
    title: property.title,
    description: property.description,
    city: property.city,
    country: property.country,
    address: property.address,
    latitude: property.latitude,
    longitude: property.longitude,
    pricePerNight: property.pricePerNight,
    propertyType: property.propertyType,
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    amenities: property.amenities,
    imageUrls: property.imageUrls,
    averageRating: property.averageRating,
    reviewCount: property.reviewCount,
    createdAt: property.createdAt.toISOString(),
  };
}

export type BookingRecord = {
  id: string;
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: "confirmed" | "cancelled" | "completed";
  paymentStatus: string;
  createdAt: Date;
  user: { name: string };
  property: {
    title: string;
    city: string;
    pricePerNight: number;
    imageUrls: string[];
  };
};

export function toBooking(booking: BookingRecord) {
  const checkIn = booking.checkIn.toISOString().slice(0, 10);
  const checkOut = booking.checkOut.toISOString().slice(0, 10);
  const nights = Math.max(
    1,
    Math.round(
      (Date.parse(`${checkOut}T00:00:00.000Z`) -
        Date.parse(`${checkIn}T00:00:00.000Z`)) /
        86_400_000,
    ),
  );
  return {
    id: booking.id,
    propertyId: booking.propertyId,
    propertyTitle: booking.property.title,
    city: booking.property.city,
    coverImage: booking.property.imageUrls[0] ?? "",
    userName: booking.user.name,
    checkIn,
    checkOut,
    guests: booking.guests,
    nights,
    pricePerNight: booking.property.pricePerNight,
    totalPrice: booking.totalPrice,
    status: booking.status,
    paymentStatus: "demo_booking" as const,
    createdAt: booking.createdAt.toISOString(),
  };
}

export function toReview(review: {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: { name: string };
}) {
  return {
    id: review.id,
    userName: review.user.name,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}

export function toPreferences(
  preferences:
    | {
        preferredDestinations: string[];
        preferredPropertyTypes: string[];
        preferredAmenities: string[];
        budgetMin: number;
        budgetMax: number;
        preferredGuests: number;
      }
    | null,
) {
  return {
    preferredDestinations: preferences?.preferredDestinations ?? [],
    preferredPropertyTypes: preferences?.preferredPropertyTypes ?? [],
    preferredAmenities: preferences?.preferredAmenities ?? [],
    budgetMin: preferences?.budgetMin ?? 0,
    budgetMax: preferences?.budgetMax ?? 50000,
    preferredGuests: preferences?.preferredGuests ?? 2,
  };
}

export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function dateFromCalendarDay(value: string | Date): Date {
  const day =
    value instanceof Date ? value.toISOString().slice(0, 10) : value;
  return new Date(`${day}T00:00:00.000Z`);
}
