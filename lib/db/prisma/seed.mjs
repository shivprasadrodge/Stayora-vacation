import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const image = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

const properties = [
  {
    slug: "pune-sunlit-loft",
    title: "A sunlit loft above the old city",
    description:
      "A thoughtful, airy loft with a long balcony, a proper work desk, and a quiet corner for slow mornings. Walk to bakeries and the riverfront.",
    city: "Pune",
    propertyType: "Apartment",
    pricePerNight: 4200,
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Kitchen", "Workspace", "Air conditioning", "Balcony"],
    rating: 4.91,
    images: ["photo-1600210492486-724fe5c67fb0", "photo-1600607687939-ce8a6c25118c"],
  },
  {
    slug: "pune-banyan-courtyard",
    title: "Banyan courtyard house",
    description:
      "A restored home around a leafy inner courtyard, with handmade details and room for the whole family to gather over dinner.",
    city: "Pune",
    propertyType: "Homestay",
    pricePerNight: 6800,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Kitchen", "Garden", "Parking", "Washer"],
    rating: 4.88,
    images: ["photo-1600585154340-be6161a56a0c", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "pune-japanese-garden-flat",
    title: "Quiet design apartment by the garden",
    description:
      "An artful apartment with warm timber, a deep soaking tub, and a small Japanese-inspired garden just outside the living room.",
    city: "Pune",
    propertyType: "Apartment",
    pricePerNight: 5100,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Kitchen", "Air conditioning", "Bathtub", "Garden"],
    rating: 4.96,
    images: ["photo-1600566753086-00f18fb6b3ea", "photo-1600607687939-ce8a6c25118c"],
  },
  {
    slug: "pune-hillview-villa",
    title: "Hillview villa with a long pool",
    description:
      "A generous modern villa with a private pool, wide windows, and a terrace for sunset dinners. A calm base for exploring the hills.",
    city: "Pune",
    propertyType: "Villa",
    pricePerNight: 14500,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    amenities: ["Pool", "Wi-Fi", "Kitchen", "Parking", "BBQ grill", "Garden"],
    rating: 4.93,
    images: ["photo-1613490493576-7fde63acd811", "photo-1600585154340-be6161a56a0c"],
  },
  {
    slug: "mumbai-sea-window",
    title: "The sea-window studio",
    description:
      "A bright, compact studio with an uninterrupted view of the Arabian Sea, soft linen, and easy access to the city's cafés.",
    city: "Mumbai",
    propertyType: "Apartment",
    pricePerNight: 7600,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Air conditioning", "Sea view", "Workspace", "Elevator"],
    rating: 4.82,
    images: ["photo-1600607687939-ce8a6c25118c", "photo-1600210492486-724fe5c67fb0"],
  },
  {
    slug: "mumbai-art-deco-retreat",
    title: "Art Deco retreat in the heart of town",
    description:
      "A carefully restored Art Deco home with original floors, a small reading room, and a host who knows the neighborhood well.",
    city: "Mumbai",
    propertyType: "Homestay",
    pricePerNight: 8900,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Kitchen", "Workspace", "Air conditioning", "Washer"],
    rating: 4.89,
    images: ["photo-1600566753086-00f18fb6b3ea", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "mumbai-skyline-penthouse",
    title: "Skyline penthouse with a private deck",
    description:
      "A top-floor escape with a broad city view, a private deck for evening drinks, and a full kitchen for longer stays.",
    city: "Mumbai",
    propertyType: "Luxury stay",
    pricePerNight: 18500,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Kitchen", "Air conditioning", "Balcony", "Gym", "Elevator"],
    rating: 4.95,
    images: ["photo-1600607687939-ce8a6c25118c", "photo-1613977257363-707ba9348227"],
  },
  {
    slug: "mumbai-bandra-townhouse",
    title: "A little townhouse in Bandra",
    description:
      "A characterful two-floor home tucked on a leafy lane, close to independent shops, good coffee, and the seafront promenade.",
    city: "Mumbai",
    propertyType: "Unique stay",
    pricePerNight: 11000,
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Kitchen", "Washer", "Workspace", "Balcony"],
    rating: 4.9,
    images: ["photo-1600585154340-be6161a56a0c", "photo-1600210492486-724fe5c67fb0"],
  },
  {
    slug: "goa-coconut-house",
    title: "Coconut House by the quiet beach",
    description:
      "A breezy coastal home shaded by palms, with a slow-living kitchen and an easy walk to a quieter stretch of sand.",
    city: "Goa",
    propertyType: "Beach house",
    pricePerNight: 9400,
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Kitchen", "Beach access", "Garden", "Outdoor shower"],
    rating: 4.94,
    images: ["photo-1613490493576-7fde63acd811", "photo-1600585154340-be6161a56a0c"],
  },
  {
    slug: "goa-saltwater-villa",
    title: "Saltwater villa with a plunge pool",
    description:
      "A private villa with a plunge pool, a shaded courtyard, and a kitchen stocked for relaxed dinners after the beach.",
    city: "Goa",
    propertyType: "Villa",
    pricePerNight: 16800,
    maxGuests: 7,
    bedrooms: 3,
    bathrooms: 3,
    amenities: ["Pool", "Wi-Fi", "Kitchen", "Air conditioning", "Garden", "Parking"],
    rating: 4.97,
    images: ["photo-1613977257363-707ba9348227", "photo-1613490493576-7fde63acd811"],
  },
  {
    slug: "goa-palm-roof-cottage",
    title: "Palm-roof cottage near the lagoon",
    description:
      "A simple, lovely cottage made for barefoot days, with an open-air verandah and a lagoon trail just beyond the garden gate.",
    city: "Goa",
    propertyType: "Cottage",
    pricePerNight: 5600,
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Kitchen", "Garden", "Beach access", "Pet-friendly"],
    rating: 4.86,
    images: ["photo-1600585154340-be6161a56a0c", "photo-1600566753086-00f18fb6b3ea"],
  },
  {
    slug: "goa-old-port-homestay",
    title: "Old Port homestay with breakfast",
    description:
      "A welcoming family-run stay in a restored Portuguese-era home, with a generous breakfast and a shaded shared courtyard.",
    city: "Goa",
    propertyType: "Homestay",
    pricePerNight: 3900,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Breakfast", "Garden", "Air conditioning", "Parking"],
    rating: 4.9,
    images: ["photo-1600566753086-00f18fb6b3ea", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "lonavala-mistwood-cottage",
    title: "Mistwood cottage above the valley",
    description:
      "A timber cottage with a fireplace and a deep green valley view. Bring a book, take the forest path, and let the day slow down.",
    city: "Lonavala",
    propertyType: "Cottage",
    pricePerNight: 7200,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Fireplace", "Kitchen", "Valley view", "Parking"],
    rating: 4.92,
    images: ["photo-1600585154340-be6161a56a0c", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "lonavala-cloudline-villa",
    title: "Cloudline villa with an infinity pool",
    description:
      "A hillside villa with long views, an infinity pool, and multiple outdoor spaces for family meals, games, and quiet afternoons.",
    city: "Lonavala",
    propertyType: "Villa",
    pricePerNight: 19900,
    maxGuests: 10,
    bedrooms: 5,
    bathrooms: 4,
    amenities: ["Pool", "Wi-Fi", "Kitchen", "BBQ grill", "Garden", "Parking"],
    rating: 4.98,
    images: ["photo-1613977257363-707ba9348227", "photo-1613490493576-7fde63acd811"],
  },
  {
    slug: "lonavala-stone-house",
    title: "Stone house and herb garden",
    description:
      "A small stone retreat with a private herb garden, outdoor table, and an open living room that frames the monsoon clouds.",
    city: "Lonavala",
    propertyType: "Unique stay",
    pricePerNight: 6100,
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Kitchen", "Garden", "Pet-friendly", "Parking"],
    rating: 4.84,
    images: ["photo-1600607687920-4e2a09cf159d", "photo-1600585154340-be6161a56a0c"],
  },
  {
    slug: "lonavala-lake-view-home",
    title: "Lake-view home for long weekends",
    description:
      "A comfortable family home near the lake with a broad verandah, a well-equipped kitchen, and plenty of room to settle in.",
    city: "Lonavala",
    propertyType: "Homestay",
    pricePerNight: 8300,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Kitchen", "Lake view", "Washer", "Parking"],
    rating: 4.87,
    images: ["photo-1600607687939-ce8a6c25118c", "photo-1600566753086-00f18fb6b3ea"],
  },
  {
    slug: "jaipur-haveli-courtyard",
    title: "A haveli room around the courtyard",
    description:
      "An intimate stay in a restored haveli, with hand-painted details, a calm courtyard, and a rooftop view of the old city.",
    city: "Jaipur",
    propertyType: "Homestay",
    pricePerNight: 4800,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Breakfast", "Courtyard", "Air conditioning", "Rooftop"],
    rating: 4.95,
    images: ["photo-1600566753086-00f18fb6b3ea", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "jaipur-desert-rose-villa",
    title: "Desert Rose villa with rooftop dining",
    description:
      "A spacious villa with a private rooftop, shaded pool, and warm rooms designed around the pink hues of the old city.",
    city: "Jaipur",
    propertyType: "Villa",
    pricePerNight: 13800,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 4,
    amenities: ["Pool", "Wi-Fi", "Kitchen", "Air conditioning", "Rooftop", "Parking"],
    rating: 4.9,
    images: ["photo-1613977257363-707ba9348227", "photo-1600585154340-be6161a56a0c"],
  },
  {
    slug: "jaipur-blue-door-apartment",
    title: "Blue Door apartment in the old quarter",
    description:
      "A playful, light-filled apartment close to the bazaars, with a small balcony and a local guidebook made by your host.",
    city: "Jaipur",
    propertyType: "Apartment",
    pricePerNight: 3600,
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Kitchen", "Air conditioning", "Balcony", "Workspace"],
    rating: 4.83,
    images: ["photo-1600210492486-724fe5c67fb0", "photo-1600607687939-ce8a6c25118c"],
  },
  {
    slug: "jaipur-saffron-suite",
    title: "Saffron suite with a private plunge pool",
    description:
      "A refined suite in a small boutique residence, with a private plunge pool, a generous bath, and a quiet garden entrance.",
    city: "Jaipur",
    propertyType: "Luxury stay",
    pricePerNight: 17200,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 2,
    amenities: ["Pool", "Wi-Fi", "Breakfast", "Air conditioning", "Bathtub", "Garden"],
    rating: 4.99,
    images: ["photo-1613490493576-7fde63acd811", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "bengaluru-greenhouse-flat",
    title: "Greenhouse flat in a quiet lane",
    description:
      "A calm city apartment with a plant-filled sunroom, desk, fast Wi-Fi, and a neighborhood coffee shop around the corner.",
    city: "Bengaluru",
    propertyType: "Apartment",
    pricePerNight: 3900,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Workspace", "Kitchen", "Washer", "Balcony"],
    rating: 4.88,
    images: ["photo-1600210492486-724fe5c67fb0", "photo-1600566753086-00f18fb6b3ea"],
  },
  {
    slug: "bengaluru-jackfruit-homestay",
    title: "Jackfruit tree homestay",
    description:
      "A bright home with a garden breakfast table, a friendly resident dog, and a host happy to point you toward local favorites.",
    city: "Bengaluru",
    propertyType: "Homestay",
    pricePerNight: 3100,
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Breakfast", "Garden", "Pet-friendly", "Parking"],
    rating: 4.94,
    images: ["photo-1600585154340-be6161a56a0c", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "bengaluru-modern-villa",
    title: "Modern villa with a courtyard pool",
    description:
      "A modern, light-filled villa with a courtyard pool, generous common spaces, and easy access to restaurants and parks.",
    city: "Bengaluru",
    propertyType: "Villa",
    pricePerNight: 12700,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    amenities: ["Pool", "Wi-Fi", "Kitchen", "Air conditioning", "Garden", "Parking"],
    rating: 4.91,
    images: ["photo-1613977257363-707ba9348227", "photo-1613490493576-7fde63acd811"],
  },
  {
    slug: "bengaluru-terrace-penthouse",
    title: "Terrace penthouse under the trees",
    description:
      "A top-floor home with a private green terrace, outdoor dining, and room for a small group to gather after a day in the city.",
    city: "Bengaluru",
    propertyType: "Luxury stay",
    pricePerNight: 15400,
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Kitchen", "Workspace", "Terrace", "Air conditioning"],
    rating: 4.96,
    images: ["photo-1600607687939-ce8a6c25118c", "photo-1613977257363-707ba9348227"],
  },
];

const syntheticProfiles = [
  {
    email: "anika.research@stayora.test",
    name: "Anika Rao",
    destinations: ["Goa", "Lonavala"],
    types: ["Cottage", "Beach house"],
    amenities: ["Beach access", "Garden", "Wi-Fi"],
    min: 3500,
    max: 10000,
    guests: 2,
  },
  {
    email: "rohan.research@stayora.test",
    name: "Rohan Mehta",
    destinations: ["Pune", "Mumbai"],
    types: ["Apartment", "Unique stay"],
    amenities: ["Workspace", "Wi-Fi", "Air conditioning"],
    min: 3000,
    max: 9000,
    guests: 2,
  },
  {
    email: "meera.research@stayora.test",
    name: "Meera Shah",
    destinations: ["Jaipur"],
    types: ["Homestay", "Luxury stay"],
    amenities: ["Breakfast", "Courtyard", "Air conditioning"],
    min: 4000,
    max: 18000,
    guests: 2,
  },
  {
    email: "arjun.research@stayora.test",
    name: "Arjun Nair",
    destinations: ["Lonavala", "Pune"],
    types: ["Villa", "Cottage"],
    amenities: ["Pool", "Garden", "Parking"],
    min: 6000,
    max: 20000,
    guests: 6,
  },
  {
    email: "sana.research@stayora.test",
    name: "Sana Iyer",
    destinations: ["Bengaluru"],
    types: ["Apartment", "Homestay"],
    amenities: ["Workspace", "Wi-Fi", "Kitchen"],
    min: 2500,
    max: 7000,
    guests: 2,
  },
  {
    email: "kabir.research@stayora.test",
    name: "Kabir Desai",
    destinations: ["Goa", "Mumbai"],
    types: ["Villa", "Beach house"],
    amenities: ["Pool", "Beach access", "Kitchen"],
    min: 8000,
    max: 22000,
    guests: 5,
  },
];

async function main() {
  const host = await prisma.user.upsert({
    where: { email: "demo-host@stayora.test" },
    update: { name: "Stayora Demo Host", role: "host" },
    create: {
      email: "demo-host@stayora.test",
      name: "Stayora Demo Host",
      role: "host",
    },
  });

  const propertyIds = new Map();
  for (const entry of properties) {
    const property = await prisma.property.upsert({
      where: { slug: entry.slug },
      update: {
        hostId: host.id,
        title: entry.title,
        description: entry.description,
        city: entry.city,
        country: "India",
        address: `${entry.city}, India`,
        pricePerNight: entry.pricePerNight,
        propertyType: entry.propertyType,
        maxGuests: entry.maxGuests,
        bedrooms: entry.bedrooms,
        bathrooms: entry.bathrooms,
        amenities: entry.amenities,
        imageUrls: entry.images.map((id) => image(id)),
        averageRating: 0,
      },
      create: {
        slug: entry.slug,
        hostId: host.id,
        title: entry.title,
        description: entry.description,
        city: entry.city,
        country: "India",
        address: `${entry.city}, India`,
        pricePerNight: entry.pricePerNight,
        propertyType: entry.propertyType,
        maxGuests: entry.maxGuests,
        bedrooms: entry.bedrooms,
        bathrooms: entry.bathrooms,
        amenities: entry.amenities,
        imageUrls: entry.images.map((id) => image(id)),
        averageRating: 0,
      },
    });
    propertyIds.set(entry.slug, property.id);
  }

  const profiles = [];
  for (const profile of syntheticProfiles) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { name: profile.name, role: "guest" },
      create: { email: profile.email, name: profile.name, role: "guest" },
    });
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        preferredDestinations: profile.destinations,
        preferredPropertyTypes: profile.types,
        preferredAmenities: profile.amenities,
        budgetMin: profile.min,
        budgetMax: profile.max,
        preferredGuests: profile.guests,
      },
      create: {
        userId: user.id,
        preferredDestinations: profile.destinations,
        preferredPropertyTypes: profile.types,
        preferredAmenities: profile.amenities,
        budgetMin: profile.min,
        budgetMax: profile.max,
        preferredGuests: profile.guests,
      },
    });
    profiles.push(user);
  }

  const reviewSeeds = [
    ["anika.research@stayora.test", "goa-coconut-house", 5, "Thoughtful details and a lovely walk to the water. We would happily return."],
    ["rohan.research@stayora.test", "pune-sunlit-loft", 4, "Bright, quiet, and exactly as described. The balcony was a perfect start to the day."],
    ["meera.research@stayora.test", "jaipur-haveli-courtyard", 5, "A beautiful courtyard and a genuinely helpful host made this stay special."],
    ["arjun.research@stayora.test", "lonavala-mistwood-cottage", 4, "The valley view was wonderful, and the cottage was comfortable for our weekend."],
    ["sana.research@stayora.test", "bengaluru-greenhouse-flat", 5, "Fast Wi-Fi, a good desk, and a great neighborhood café nearby."],
    ["kabir.research@stayora.test", "goa-saltwater-villa", 4, "Spacious, private, and a great pool for a group. The kitchen was well equipped."],
  ];

  for (const [email, slug, rating, comment] of reviewSeeds) {
    const reviewer = profiles.find((profile) => profile.email === email);
    if (!reviewer) continue;
    const propertyId = propertyIds.get(slug);
    await prisma.review.upsert({
      where: { userId_propertyId: { userId: reviewer.id, propertyId } },
      update: { rating, comment },
      create: { userId: reviewer.id, propertyId, rating, comment },
    });
    await prisma.property.update({
      where: { id: propertyId },
      data: { averageRating: rating, reviewCount: 1 },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    process.stderr.write(`${error?.message ?? String(error)}\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
