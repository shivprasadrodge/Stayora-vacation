import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  useAddWishlist, useCancelBooking, useCreateBooking, useCreateHostListing,
  useDeleteAdminProperty, useDeleteHostListing, useGetAdminOverview, useGetAdminProperties, useGetAdminUsers, useGetBookings,
  useGetDestinations, useGetHome, useGetHostBookings, useGetHostListings,
  useGetLatestEvaluation, useGetMe, useGetPreferences, useGetProperties,
  useGetProperty, useGetPropertyReviews, useGetRecommendations, useGetWishlist,
  useRemoveWishlist, useRunEvaluation, useSavePreferences, useUpdateHostListing,
  useUpdateMe, useUpdateUserRole,
  getGetAdminOverviewQueryKey, getGetAdminPropertiesQueryKey, getGetAdminUsersQueryKey, getGetBookingsQueryKey,
  getGetHostBookingsQueryKey, getGetHostListingsQueryKey, getGetLatestEvaluationQueryKey,
  getGetMeQueryKey, getGetPreferencesQueryKey, getGetWishlistQueryKey,
} from '@workspace/api-client-react';
import {
  ArrowDownUp, ArrowLeft, ArrowRight, BadgeCheck, CalendarDays,
  Check, Compass, Heart, Home, MapPin, Menu, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, Star, Users, X,
} from 'lucide-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const clerkAppearance = {
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d66e4d',
    colorForeground: '#243b34',
    colorMutedForeground: '#718078',
    colorDanger: '#b84b40',
    colorBackground: '#fffdf8',
    colorInput: '#fffdf8',
    colorInputForeground: '#243b34',
    colorNeutral: '#ded8cb',
    fontFamily: 'DM Sans',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf8] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#243b34] font-bold',
    headerSubtitle: 'text-[#718078]',
    socialButtonsBlockButtonText: 'text-[#243b34] font-semibold',
    formFieldLabel: 'text-[#40564c] font-semibold',
    footerActionLink: 'text-[#c65f42] font-semibold',
    footerActionText: 'text-[#718078]',
    dividerText: 'text-[#718078]',
    identityPreviewEditButton: 'text-[#c65f42]',
    formFieldSuccessText: 'text-[#426554]',
    alertText: 'text-[#8f3f37]',
    logoBox: 'rounded-xl',
    logoImage: 'rounded-md',
    socialButtonsBlockButton: 'border-[#e1dbce] hover:bg-[#f4efe5]',
    formButtonPrimary: 'bg-[#d66e4d] hover:bg-[#bd583c]',
    formFieldInput: 'border-[#ddd7ca] rounded-xl',
    footerAction: 'text-[#718078]',
    dividerLine: 'bg-[#e4ded2]',
    alert: 'rounded-xl',
    otpCodeFieldInput: 'border-[#ddd7ca] rounded-lg',
    formFieldRow: 'mb-4',
    main: 'gap-4',
  },
};

const money = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;
const displayDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fallbackImage = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85';
const cities = ['Goa', 'Jaipur', 'Udaipur', 'Munnar', 'Alibaug', 'Rishikesh', 'Pondicherry', 'Coorg'];
const types = ['Apartment', 'Villa', 'Cottage', 'Homestay', 'Beach house', 'Luxury stay', 'Unique stay'];
const categories = [
  { label: 'Apartments', propertyType: 'Apartment' },
  { label: 'Villas', propertyType: 'Villa' },
  { label: 'Cottages', propertyType: 'Cottage' },
  { label: 'Unique stays', propertyType: 'Unique stay' },
];
const amenities = ['Wi-Fi', 'Pool', 'Kitchen', 'Air conditioning', 'Workspace', 'Pet friendly', 'Garden', 'Parking'];

function Brand() {
  return <Link href="/" className="brand-mark" data-testid="link-stayora-home"><span className="brand-symbol"><Home size={17} strokeWidth={2.4} /></span><span>stayora</span></Link>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const searchDestination = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const city = destination.trim();
    setLocation(city ? `/explore?city=${encodeURIComponent(city)}` : '/explore');
  };
  const nav = [
    ['Explore', '/explore'], ['Saved', '/wishlist'], ['Your trips', '/bookings'],
    ['Host', '/host'], ['Preferences', '/preferences'], ['Admin', '/admin'],
  ];
  return <header className="stayora-nav" data-testid="site-header">
    <Brand />
    <nav className={`nav-links ${open ? 'mobile-open' : ''}`} aria-label="Main navigation">
      <form onSubmit={searchDestination} role="search" className="nav-search-form" data-testid="form-navbar-search" style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fffdf8', border: '1px solid #e5dfd3', borderRadius: 999, padding: '7px 10px' }}>
        <Search size={15} color="#718078" />
        <input aria-label="Search destination" placeholder="Where to?" value={destination} onChange={e => setDestination(e.target.value)} data-testid="input-navbar-destination" style={{ minWidth: 80, width: 125, border: 0, outline: 0, background: 'transparent', color: '#243b34', font: 'inherit', fontSize: 12 }} />
        <button type="submit" aria-label="Search destinations" data-testid="button-navbar-search" style={{ border: 0, background: 'none', color: '#c65f42', padding: 2, cursor: 'pointer' }}><ArrowRight size={14} /></button>
      </form>
      {nav.map(([label, href]) => <Link key={href} href={href} className="nav-link desktop-link" data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</Link>)}
      <Show when="signed-out">
        <Link href="/sign-in" className="nav-link desktop-link" data-testid="link-sign-in">Sign in</Link>
        <Link href="/sign-up" className="btn-primary" data-testid="link-sign-up">Join Stayora <ArrowRight size={15} /></Link>
      </Show>
      <Show when="signed-in">
        <Link href="/profile" className="nav-link desktop-link" data-testid="link-profile">Account</Link>
        <button className="btn-secondary" data-testid="button-sign-out" onClick={() => signOut({ redirectUrl: basePath || '/' })}>Sign out</button>
      </Show>
    </nav>
    <button className="mobile-menu" aria-label="Toggle navigation" data-testid="button-menu" onClick={() => setOpen(v => !v)}><Menu size={21} /></button>
  </header>;
}

function Layout({ children }: { children: ReactNode }) {
  return <div className="stayora-shell"><Header />{children}<footer className="footer page-wrap"><span>Stayora · A better kind of getting away</span><nav aria-label="Stayora information" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{[['About', '/about'], ['Contact', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Help', '/help']].map(([label, href]) => <Link key={href} href={href} className="nav-link" data-testid={`link-footer-${label.toLowerCase()}`}>{label}</Link>)}</nav><span>Every stay, with a reason behind it.</span></footer></div>;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>;
}

function ErrorState({ message = 'We couldn’t load this just now.', retry }: { message?: string; retry?: () => void }) {
  return <div className="empty-state" data-testid="status-error"><ShieldCheck size={28} style={{ margin: '0 auto 12px' }} /><h3 className="display-font">A small pause in the journey</h3><p>{message}</p>{retry && <button className="btn-secondary" onClick={retry} data-testid="button-retry">Try again</button>}</div>;
}

function LoadingCards() {
  return <div className="property-grid" aria-label="Loading stays">{[0,1,2].map(i => <div key={i}><div className="skeleton property-image-wrap" /><div className="skeleton" style={{ height: 15, width: '72%', marginTop: 13, borderRadius: 6 }} /><div className="skeleton" style={{ height: 12, width: '42%', marginTop: 8, borderRadius: 6 }} /></div>)}</div>;
}

function PropertyCard({ property, reason, score }: { property: any; reason?: string[]; score?: number }) {
  const qc = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const wishlist = useGetWishlist({ query: { enabled: isLoaded && isSignedIn === true } });
  const add = useAddWishlist();
  const remove = useRemoveWishlist();
  const isSaved = Boolean(wishlist.data?.some(p => p.id === property.id));
  const busy = add.isPending || remove.isPending;
  const toggle = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation('/sign-in');
      return;
    }
    const action = isSaved ? remove.mutate({ propertyId: property.id }) : add.mutate({ data: { propertyId: property.id } });
    void action;
    window.setTimeout(() => qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }), 250);
  };
  const cover = property.imageUrls?.[0] || fallbackImage;
  return <article className="property-card" data-testid={`card-property-${property.id}`}>
    <Link href={`/properties/${property.id}`} className="property-image-wrap" data-testid={`link-property-${property.id}`}>
      <img className="property-image" src={cover} alt={property.title} loading="lazy" />
       {reason?.length ? <span className="tag" style={{ position: 'absolute', left: 12, bottom: 12 }}>{typeof score === 'number' ? `${Math.round(score)}% fit` : reason[0]}</span> : null}
    </Link>
    <button className="heart-button" aria-label={isSaved ? 'Remove from saved stays' : 'Save this stay'} data-testid={`button-save-${property.id}`} onClick={toggle} disabled={busy}><Heart size={18} fill={isSaved ? '#d66e4d' : 'none'} color={isSaved ? '#d66e4d' : 'currentColor'} /></button>
    <div className="property-meta"><div><Link href={`/properties/${property.id}`} className="property-title" data-testid={`text-title-${property.id}`}>{property.title}</Link><div className="property-subtitle">{property.city}, {property.country} · {property.propertyType}</div>{reason?.[0] && <div className="property-subtitle" style={{ color: '#4f7161', marginTop: 7 }}><Sparkles size={12} style={{ verticalAlign: '-2px' }} /> {reason[0]}</div>}</div><div style={{ textAlign: 'right' }}><div className="rating-pill"><Star size={12} fill="#d66e4d" color="#d66e4d" /> {Number(property.averageRating) > 0 ? Number(property.averageRating).toFixed(1) : 'New'}</div><div className="property-price" style={{ marginTop: 9 }}>{money(property.pricePerNight)} <span>/ night</span></div></div></div>
  </article>;
}

function SearchBar({ initial = '' }: { initial?: string }) {
  const [, setLocation] = useLocation();
  const [where, setWhere] = useState(initial);
  const [guests, setGuests] = useState('2');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (where.trim()) q.set('city', where.trim());
    if (guests) q.set('guests', guests);
    if (checkIn) q.set('checkIn', checkIn);
    if (checkOut) q.set('checkOut', checkOut);
    setLocation(`/explore${q.size ? `?${q.toString()}` : ''}`);
  };
  return <form className="search-panel" onSubmit={submit} data-testid="form-search">
    <div className="search-field"><label htmlFor="search-destination">Where to?</label><input id="search-destination" placeholder="Try Goa, Jaipur, a feeling…" value={where} onChange={e => setWhere(e.target.value)} list="destination-options" data-testid="input-search-destination" /><datalist id="destination-options">{cities.map(c => <option key={c} value={c} />)}</datalist></div>
    <div className="search-field"><label htmlFor="search-checkin">Check in</label><input id="search-checkin" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} data-testid="input-check-in" /></div>
    <div className="search-field"><label htmlFor="search-checkout">Check out</label><input id="search-checkout" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} data-testid="input-check-out" /></div>
    <div className="search-field"><label htmlFor="search-guests">Guests</label><select id="search-guests" value={guests} onChange={e => setGuests(e.target.value)} data-testid="select-search-guests">{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}</select></div>
    <button className="btn-primary" type="submit" data-testid="button-search"><Search size={17} /> Find stays</button>
  </form>;
}

function HomePage() {
  const home = useGetHome();
  const destinations = useGetDestinations();
  const recommendation = home.data?.recommendations || [];
  const featured = home.data?.featured || [];
  return <Layout><main className="page-wrap page-enter">
    <section className="hero-panel" data-testid="home-hero">
      <div className="hero-orbit" />
      <img className="hero-photo" src={featured[0]?.imageUrls?.[0] || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1500&q=90'} alt="A sunlit Indian courtyard stay" />
      <div className="hero-copy"><div className="eyebrow">Stay somewhere that gets you</div><h1 className="display-font" style={{ fontSize: 'clamp(42px,6vw,72px)', lineHeight: 1.02, margin: '18px 0' }}>Find your<br /><span style={{ color: '#d66e4d' }}>kind of away.</span></h1><p style={{ maxWidth: 390, color: '#53685e', lineHeight: 1.75 }}>Find a place that feels like yours. Not just somewhere to stay, but somewhere that fits the way you travel—with every recommendation explained.</p><div style={{ marginTop: 27, display: 'flex', gap: 10, flexWrap: 'wrap' }}><span className="tag"><Sparkles size={12} style={{ verticalAlign: '-2px' }} /> Thoughtful matches</span><span className="tag"><ShieldCheck size={12} style={{ verticalAlign: '-2px' }} /> Clear, honest pricing</span></div></div>
    </section>
    <div style={{ marginTop: -34, position: 'relative', zIndex: 3, padding: '0 26px' }}><SearchBar /></div>
    <SectionTitle eyebrow="A little more you" title="Stays with a good feeling" action={<Link href="/explore" className="btn-secondary" data-testid="link-all-stays">See all stays <ArrowRight size={15} /></Link>} />
    {home.isLoading ? <LoadingCards /> : home.isError ? <ErrorState retry={() => void home.refetch()} /> : <div className="property-grid">{recommendation.length ? recommendation.slice(0,3).map(item => <PropertyCard key={item.property.id} property={item.property} reason={item.reasons} score={item.score} />) : featured.slice(0,3).map(p => <PropertyCard key={p.id} property={p} />)}</div>}
    <SectionTitle eyebrow="Find your kind of stay" title="Browse by style" />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{categories.map(category => <Link key={category.propertyType} href={`/explore?propertyType=${encodeURIComponent(category.propertyType)}`} className="chip" data-testid={`link-category-${category.propertyType.toLowerCase().replaceAll(' ', '-')}`}>{category.label} <ArrowRight size={14} /></Link>)}</div>
    <SectionTitle eyebrow="India, in all its moods" title="Where do you want to feel?" action={<Link href="/explore" className="nav-link" data-testid="link-explore-destinations">Explore every stay <ArrowRight size={14} /></Link>} />
    {destinations.isLoading ? <div className="destination-grid">{[0,1,2,3].map(i => <div key={i} className="skeleton destination-card" />)}</div> : destinations.isError ? <ErrorState retry={() => void destinations.refetch()} /> : <div className="destination-grid">{(destinations.data || []).slice(0,8).map((d, i) => <Link key={d.city} href={`/explore?city=${encodeURIComponent(d.city)}`} className="destination-card" data-testid={`card-destination-${i}`}><img src={d.imageUrl || fallbackImage} alt={`${d.city}, ${d.country}`} loading="lazy" /><div className="destination-caption"><b>{d.city}</b><small>{d.propertyCount} places to stay</small></div></Link>)}</div>}
    <section className="split-feature"><div><div className="eyebrow">A recommendation with reasons</div><h2 className="display-font" style={{ fontSize: 38, lineHeight: 1.12, margin: '13px 0' }}>Your taste has a place here.</h2><p style={{ color: '#607168', lineHeight: 1.75 }}>Tell us what makes a trip feel right. Stayora brings your preferences into the open, so you can see why each place made the list.</p><Link href="/preferences" className="btn-primary" style={{ marginTop: 12 }} data-testid="link-set-preferences">Set your travel style <ArrowRight size={15} /></Link></div><img className="feature-art" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85" alt="A warm, lived-in home interior" loading="lazy" /></section>
    <section style={{ marginTop: 58, padding: '30px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22 }}><div><div className="eyebrow">01 — Tell us what matters</div><p style={{ fontWeight: 700 }}>Your budget, your pace, your kind of place.</p></div><div><div className="eyebrow">02 — See the why</div><p style={{ fontWeight: 700 }}>Each match comes with reasons, not mystery.</p></div><div><div className="eyebrow">03 — Book with clarity</div><p style={{ fontWeight: 700 }}>Straightforward totals. No surprise maths.</p></div></section>
    <section className="split-feature" style={{ marginTop: 56, background: '#e5ece2' }} data-testid="home-host-cta"><div><div className="eyebrow">A place to share</div><h2 className="display-font" style={{ fontSize: 36, lineHeight: 1.12, margin: '12px 0' }}>Have a place guests will love?</h2><p style={{ color: '#607168', lineHeight: 1.75 }}>Create a listing, set your details, and manage your stays from one simple host dashboard.</p><Link href="/host" className="btn-primary" style={{ marginTop: 12 }} data-testid="link-home-host">List your stay <ArrowRight size={15} /></Link></div><div className="feature-art" style={{ height: 240, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#d1dfd0,#f1e5cf)', borderRadius: 16, color: '#42695a' }}><Home size={62} strokeWidth={1.2} /></div></section>
  </main></Layout>;
}

function ExplorePage() {
  const paramsFromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [city, setCity] = useState(paramsFromUrl.get('city') || '');
  const [query, setQuery] = useState(paramsFromUrl.get('q') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [propertyType, setPropertyType] = useState(paramsFromUrl.get('propertyType') || '');
  const [guests, setGuests] = useState(paramsFromUrl.get('guests') || '');
  const [checkIn, setCheckIn] = useState(paramsFromUrl.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(paramsFromUrl.get('checkOut') || '');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [sort, setSort] = useState('relevance');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const apiParams = useMemo(() => ({
    q: query || undefined, city: city || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    propertyType: propertyType || undefined,
    guests: guests ? Number(guests) : undefined,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    bathrooms: bathrooms ? Number(bathrooms) : undefined,
    amenities: selectedAmenities.length ? selectedAmenities : undefined,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    sort: sort as 'relevance' | 'price_asc' | 'price_desc' | 'rating',
  }), [query, city, minPrice, maxPrice, propertyType, guests, bedrooms, bathrooms, selectedAmenities, checkIn, checkOut, sort]);
  const results = useGetProperties(apiParams);
  const recommendation = useGetRecommendations({ limit: 12, guests: guests ? Number(guests) : undefined });
  const toggleAmenity = (a: string) => setSelectedAmenities(v => v.includes(a) ? v.filter(x => x !== a) : [...v, a]);
  const resultsList = results.data?.properties || [];
  return <Layout><main className="page-wrap page-enter">
    <div className="eyebrow">The right place is out there</div><h1 className="display-font" style={{ fontSize: 'clamp(36px,5vw,56px)', margin: '9px 0 12px' }}>Find your somewhere.</h1><p style={{ color: '#738178', margin: '0 0 26px' }}>Thoughtful stays across India, filtered around what matters to you.</p>
    <div style={{ maxWidth: 730 }}><SearchBar initial={city} /></div>
    <SectionTitle eyebrow={`${results.data?.total ?? '—'} stays, with room for your kind of trip`} title={city ? `Around ${city}` : 'Explore stays'} action={<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ArrowDownUp size={15} /><select className="input-control" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 160 }} data-testid="select-sort"><option value="relevance">Recommended</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option></select></label>} />
    <div className="filter-layout">
      <aside className="filter-box" data-testid="panel-filters">
        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong><SlidersHorizontal size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />Your filters</strong><button className="nav-link" style={{ border: 0, background: 'none', cursor: 'pointer' }} onClick={() => { setCity(''); setQuery(''); setMinPrice(''); setMaxPrice(''); setPropertyType(''); setGuests(''); setCheckIn(''); setCheckOut(''); setBedrooms(''); setBathrooms(''); setSelectedAmenities([]); setSort('relevance'); }} data-testid="button-clear-filters">Clear</button></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-city">Destination</label><input id="filter-city" className="input-control" value={city} onChange={e => setCity(e.target.value)} placeholder="Any city" data-testid="input-filter-city" /></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-search">Search</label><input id="filter-search" className="input-control" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or neighbourhood" data-testid="input-filter-search" /></div>
        <div className="filter-group"><span className="field-label">Per night</span><div style={{ display: 'flex', gap: 8 }}><input className="input-control" type="number" min="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min ₹" data-testid="input-min-price" /><input className="input-control" type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max ₹" data-testid="input-max-price" /></div></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-type">Stay type</label><select id="filter-type" className="input-control" value={propertyType} onChange={e => setPropertyType(e.target.value)} data-testid="select-property-type"><option value="">Any type</option>{types.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-guests">Guests</label><select id="filter-guests" className="input-control" value={guests} onChange={e => setGuests(e.target.value)} data-testid="select-filter-guests"><option value="">Any group size</option>{[1,2,3,4,5,6,7,8].map(n => <option value={n} key={n}>{n} guest{n > 1 ? 's' : ''}</option>)}</select></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-checkin">Check in</label><input id="filter-checkin" className="input-control" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} data-testid="input-filter-check-in" /></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-checkout">Check out</label><input id="filter-checkout" className="input-control" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} data-testid="input-filter-check-out" /></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-bedrooms">Bedrooms</label><select id="filter-bedrooms" className="input-control" value={bedrooms} onChange={e => setBedrooms(e.target.value)} data-testid="select-bedrooms"><option value="">Any</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}</select></div>
        <div className="filter-group"><label className="field-label" htmlFor="filter-bathrooms">Bathrooms</label><select id="filter-bathrooms" className="input-control" value={bathrooms} onChange={e => setBathrooms(e.target.value)} data-testid="select-bathrooms"><option value="">Any</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}</select></div>
        <div style={{ gridColumn: '1/-1' }}><span className="field-label">Little comforts</span><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{amenities.map(a => <button key={a} className={`chip ${selectedAmenities.includes(a) ? 'selected' : ''}`} onClick={() => toggleAmenity(a)} data-testid={`button-amenity-${a.toLowerCase().replaceAll(' ', '-')}`}>{a}</button>)}</div></div>
      </aside>
      <div>
        {results.isLoading ? <LoadingCards /> : results.isError ? <ErrorState retry={() => void results.refetch()} /> : resultsList.length ? <div className="property-grid">{resultsList.map(p => <PropertyCard key={p.id} property={p} />)}</div> : <div className="empty-state" data-testid="status-no-results"><Compass size={28} style={{ margin: '0 auto 12px' }} /><h3 className="display-font">No stays in this little corner yet</h3><p>Try opening up the dates, budget, or destination.</p><button className="btn-secondary" onClick={() => { setCity(''); setQuery(''); setMinPrice(''); setMaxPrice(''); setPropertyType(''); setGuests(''); setCheckIn(''); setCheckOut(''); setBedrooms(''); setBathrooms(''); setSelectedAmenities([]); setSort('relevance'); }} data-testid="button-reset-search">Reset your search</button></div>}
        {recommendation.data?.items?.length ? <section style={{ marginTop: 45 }}><div className="eyebrow">A few ideas based on your taste</div><p style={{ color: '#728078', fontSize: 12 }}>{recommendation.data.general ? 'Browse popular stays while your preferences take shape.' : `Recommendations ranked by ${recommendation.data.method}.`}</p><div className="property-grid" style={{ marginTop: 18 }}>{recommendation.data.items.slice(0,3).map(item => <PropertyCard key={item.property.id} property={item.property} score={item.score} reason={item.reasons} />)}</div></section> : null}
      </div>
    </div>
  </main></Layout>;
}

function PropertyPage() {
  const { propertyId = '' } = useParams<{ propertyId: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const property = useGetProperty(propertyId);
  const reviews = useGetPropertyReviews(propertyId);
  const wishlist = useGetWishlist({ query: { enabled: isLoaded && isSignedIn === true } });
  const addWishlist = useAddWishlist();
  const removeWishlist = useRemoveWishlist();
  const createBooking = useCreateBooking();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [success, setSuccess] = useState('');
  const qc = useQueryClient();
  const p = property.data;
  const isSaved = Boolean(wishlist.data?.some(item => item.id === propertyId));
  const wishlistBusy = addWishlist.isPending || removeWishlist.isPending;
  const toggleWishlist = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation('/sign-in');
      return;
    }
    const callbacks = { onSuccess: () => void qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }) };
    if (isSaved) removeWishlist.mutate({ propertyId }, callbacks);
    else addWishlist.mutate({ data: { propertyId } }, callbacks);
  };
  const nights = checkIn && checkOut ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0;
  const book = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation('/sign-in');
      return;
    }
    if (!checkIn || !checkOut || nights < 1) return;
    createBooking.mutate({ data: { propertyId, checkIn, checkOut, guests } }, {
      onSuccess: booking => {
        setSuccess(`Your ${booking.nights}-night stay is confirmed. We’ve saved the details in Your trips.`);
        void qc.invalidateQueries({ queryKey: getGetBookingsQueryKey() });
      },
    });
  };
  if (property.isLoading) return <Layout><main className="page-wrap"><div className="skeleton" style={{ height: 360, borderRadius: 20 }} /><div className="skeleton" style={{ height: 35, width: 340, marginTop: 24, borderRadius: 8 }} /></main></Layout>;
  if (property.isError || !p) return <Layout><main className="page-wrap"><ErrorState message="This stay may have moved, but there are plenty more to find." retry={() => void property.refetch()} /></main></Layout>;
  const photos = p.imageUrls?.length ? [...p.imageUrls, ...p.imageUrls, ...p.imageUrls].slice(0, 5) : [fallbackImage, fallbackImage, fallbackImage, fallbackImage, fallbackImage];
  return <Layout><main className="page-wrap page-enter">
    <Link href="/explore" className="nav-link" data-testid="link-back-explore"><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Back to explore</Link>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, margin: '22px 0 18px', flexWrap: 'wrap' }}><div><div className="eyebrow">{p.propertyType} · {p.city}, {p.country}</div><h1 className="display-font" style={{ fontSize: 'clamp(32px,4vw,47px)', margin: '8px 0' }} data-testid="text-property-title">{p.title}</h1><span className="rating-pill"><Star size={13} fill="#d66e4d" color="#d66e4d" /> {Number(p.averageRating) > 0 ? Number(p.averageRating).toFixed(1) : 'New'} · {p.reviewCount} reviews <MapPin size={13} style={{ marginLeft: 8 }} /> {p.address}</span></div><div style={{ display: 'flex', gap: 8 }}><button className="btn-secondary" onClick={() => navigator.share?.({ title: p.title, url: window.location.href })} data-testid="button-share-property">Share stay</button><button className="btn-secondary" onClick={toggleWishlist} disabled={!isLoaded || wishlistBusy} data-testid="button-property-wishlist"><Heart size={15} fill={isSaved ? '#d66e4d' : 'none'} color={isSaved ? '#d66e4d' : 'currentColor'} /> {isSaved ? 'Saved' : 'Add to wishlist'}</button></div></div>
    <div className="detail-photos" data-testid="property-gallery">{photos.map((src, i) => <img key={`${src}-${i}`} src={src} alt={`${p.title}, view ${i + 1}`} />)}</div>
    <div className="detail-grid" style={{ marginTop: 35 }}>
      <div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottom: '1px solid #e5dfd3' }}><div><h2 className="display-font" style={{ fontSize: 24, margin: 0 }}>Hosted by {p.hostName}</h2><p style={{ color: '#718078', fontSize: 13, marginBottom: 0 }}>{p.maxGuests} guests · {p.bedrooms} bedrooms · {p.bathrooms} bathrooms</p></div><span className="tag"><BadgeCheck size={13} style={{ verticalAlign: '-2px' }} /> Stayora host</span></div>
        <h3 className="display-font" style={{ fontSize: 23, marginTop: 26 }}>A place to settle in</h3><p style={{ lineHeight: 1.8, color: '#64746b', whiteSpace: 'pre-line' }}>{p.description}</p>
        <h3 className="display-font" style={{ fontSize: 23, marginTop: 30 }}>The little comforts</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 13 }}>{p.amenities.map(a => <div key={a} style={{ fontSize: 13, color: '#51685d' }}><Check size={15} style={{ color: '#d66e4d', marginRight: 8, verticalAlign: '-3px' }} />{a}</div>)}</div>
        <h3 className="display-font" style={{ fontSize: 23, marginTop: 36 }}>Guest notes <span style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#7a857d' }}>({p.reviewCount})</span></h3>
        {reviews.isLoading ? <div className="skeleton" style={{ height: 90, borderRadius: 12 }} /> : reviews.isError ? <ErrorState retry={() => void reviews.refetch()} /> : reviews.data?.length ? reviews.data.map(r => <article key={r.id} style={{ padding: '18px 0', borderBottom: '1px solid #e7e1d7' }} data-testid={`review-${r.id}`}><div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{r.userName}</b><span className="rating-pill"><Star size={12} fill="#d66e4d" color="#d66e4d" />{r.rating}</span></div><p style={{ color: '#66756d', lineHeight: 1.7, marginBottom: 6 }}>{r.comment}</p><small style={{ color: '#879189' }}>{displayDate(r.createdAt)}</small></article>) : <p style={{ color: '#718078' }}>The first guest note is still waiting to be written.</p>}
      </div>
      <form className="booking-card" onSubmit={book} data-testid="form-booking"><div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}><strong style={{ fontSize: 24 }}>{money(p.pricePerNight)}</strong><span style={{ color: '#718078', fontSize: 12 }}>per night</span></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}><label className="field-label">Check in<input className="input-control" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required data-testid="input-booking-check-in" /></label><label className="field-label">Check out<input className="input-control" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required data-testid="input-booking-check-out" /></label></div><label className="field-label" style={{ marginTop: 14 }}>Guests<select className="input-control" value={guests} onChange={e => setGuests(Number(e.target.value))} data-testid="select-booking-guests">{Array.from({ length: Math.min(p.maxGuests, 8) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}</select></label>
        {nights > 0 && <div className="booking-total"><span>{money(p.pricePerNight)} × {nights} nights</span><span>{money(p.pricePerNight * nights)}</span></div>}
        {success ? <div className="notice" role="status" data-testid="status-booking-success">{success}<Link href="/bookings" className="nav-link" style={{ display: 'block', marginTop: 8 }}>View your trips <ArrowRight size={13} /></Link></div> : <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={createBooking.isPending} data-testid="button-confirm-booking">{createBooking.isPending ? 'Confirming…' : 'Reserve this stay'} <ArrowRight size={15} /></button>}
        {createBooking.isError && <p style={{ color: '#ae4a3c', fontSize: 12 }} role="alert" data-testid="status-booking-error">{(createBooking.error as any)?.message || 'Booking could not be completed. Please try again.'}</p>}
        <p style={{ fontSize: 11, color: '#76847b', textAlign: 'center' }}>You won’t be charged yet. Clear totals, always.</p>
      </form>
    </div>
  </main></Layout>;
}

function WishlistPage() {
  const wishlist = useGetWishlist();
  return <Layout><main className="page-wrap page-enter"><div className="eyebrow">Your little shortlist</div><h1 className="display-font" style={{ fontSize: 48, margin: '8px 0' }}>Saved for later.</h1><p style={{ color: '#728078' }}>The places you can’t stop thinking about.</p>{wishlist.isLoading ? <LoadingCards /> : wishlist.isError ? <ErrorState retry={() => void wishlist.refetch()} /> : wishlist.data?.length ? <div className="property-grid" style={{ marginTop: 32 }}>{wishlist.data.map(p => <PropertyCard key={p.id} property={p} />)}</div> : <div className="empty-state" style={{ marginTop: 32 }} data-testid="status-wishlist-empty"><Heart size={27} style={{ margin: '0 auto 12px' }} /><h2 className="display-font">Your next favourite is out there</h2><p>Tap the heart on a stay to keep it close.</p><Link href="/explore" className="btn-primary" data-testid="link-browse-stays">Find your stay <ArrowRight size={15} /></Link></div>}</main></Layout>;
}

function BookingsPage() {
  const bookings = useGetBookings();
  const cancel = useCancelBooking();
  const qc = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const confirmCancel = (id: string) => {
    if (cancelId !== id) { setCancelId(id); return; }
    cancel.mutate({ bookingId: id }, { onSuccess: () => { setCancelId(null); void qc.invalidateQueries({ queryKey: getGetBookingsQueryKey() }); } });
  };
  return <Layout><main className="page-wrap page-enter"><div className="eyebrow">All the good things ahead</div><h1 className="display-font" style={{ fontSize: 48, margin: '8px 0' }}>Your trips.</h1><p style={{ color: '#728078' }}>Every booking, in one easy place.</p>
    {bookings.isLoading ? <div style={{ marginTop: 28 }}>{[1,2].map(i => <div className="skeleton" key={i} style={{ height: 155, marginBottom: 15, borderRadius: 17 }} />)}</div> : bookings.isError ? <ErrorState retry={() => void bookings.refetch()} /> : bookings.data?.length ? <div style={{ display: 'grid', gap: 16, marginTop: 30 }}>{bookings.data.map(b => <article key={b.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 22, alignItems: 'center', background: '#fffdf8', border: '1px solid #e6dfd1', borderRadius: 18, padding: 14 }} data-testid={`card-booking-${b.id}`}><img src={b.coverImage || fallbackImage} alt={b.propertyTitle} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12 }} /><div><span className="tag" data-testid={`status-booking-${b.id}`}>{b.status} · {b.paymentStatus.replaceAll('_', ' ')}</span><h2 className="display-font" style={{ fontSize: 22, margin: '9px 0 4px' }}>{b.propertyTitle}</h2><p style={{ color: '#718078', margin: 0, fontSize: 13 }}>{b.city} · {displayDate(b.checkIn)} – {displayDate(b.checkOut)}</p><p style={{ fontSize: 12, color: '#718078' }}>{b.guests} guests · {b.nights} nights · {money(b.totalPrice)} total</p><Link href={`/properties/${b.propertyId}`} className="nav-link" data-testid={`link-booking-property-${b.id}`}>View stay <ArrowRight size={13} /></Link></div><div>{b.status === 'confirmed' && <button className="btn-secondary" onClick={() => confirmCancel(b.id)} disabled={cancel.isPending} data-testid={`button-cancel-booking-${b.id}`}>{cancelId === b.id ? 'Confirm cancel' : 'Cancel booking'}</button>}{cancelId === b.id && <button className="nav-link" onClick={() => setCancelId(null)} style={{ display: 'block', margin: '10px auto', border: 0, background: 'none', cursor: 'pointer' }}>Keep this trip</button>}</div></article>)}</div> : <div className="empty-state" style={{ marginTop: 30 }} data-testid="status-bookings-empty"><CalendarDays size={28} style={{ margin: '0 auto 12px' }} /><h2 className="display-font">Your calendar is wide open</h2><p>Let’s find somewhere worth putting on it.</p><Link href="/explore" className="btn-primary" data-testid="link-find-trip">Explore stays <ArrowRight size={15} /></Link></div>}
  </main></Layout>;
}

function PreferencesPage() {
  const prefs = useGetPreferences();
  const save = useSavePreferences();
  const qc = useQueryClient();
  const [destinations, setDestinations] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState(1000);
  const [budgetMax, setBudgetMax] = useState(12000);
  const [guests, setGuests] = useState(2);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (prefs.data && !initialized) {
      setDestinations(prefs.data.preferredDestinations || []);
      setPropertyTypes(prefs.data.preferredPropertyTypes || []);
      setSelectedAmenities(prefs.data.preferredAmenities || []);
      setBudgetMin(prefs.data.budgetMin);
      setBudgetMax(prefs.data.budgetMax);
      setGuests(prefs.data.preferredGuests);
      setInitialized(true);
    }
  }, [prefs.data, initialized]);
  const flip = (list: string[], setList: (v: string[]) => void, value: string) => setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ data: { preferredDestinations: destinations, preferredPropertyTypes: propertyTypes, preferredAmenities: selectedAmenities, budgetMin, budgetMax, preferredGuests: guests } }, { onSuccess: () => void qc.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }) });
  };
  return <Layout><main className="page-wrap page-enter" style={{ maxWidth: 920 }}><div className="eyebrow">A profile for your way of travelling</div><h1 className="display-font" style={{ fontSize: 48, margin: '8px 0' }}>What feels like you?</h1><p style={{ color: '#728078', maxWidth: 560, lineHeight: 1.7 }}>A few thoughtful details help us show you stays with a reason to be there. Change these whenever your travel mood does.</p>
    {prefs.isLoading ? <div className="skeleton" style={{ height: 400, borderRadius: 20 }} /> : prefs.isError ? <ErrorState retry={() => void prefs.refetch()} /> : <form onSubmit={submit} style={{ background: '#fffdf8', border: '1px solid #e6dfd1', borderRadius: 20, padding: 28, marginTop: 28 }} data-testid="form-preferences">
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 27px' }}><legend className="display-font" style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>Places on your mind</legend><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{cities.map(c => <button type="button" key={c} className={`chip ${destinations.includes(c) ? 'selected' : ''}`} onClick={() => flip(destinations, setDestinations, c)} data-testid={`button-preference-city-${c.toLowerCase()}`}>{c}</button>)}</div></fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 27px' }}><legend className="display-font" style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>The kind of stay</legend><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{types.map(t => <button type="button" key={t} className={`chip ${propertyTypes.includes(t) ? 'selected' : ''}`} onClick={() => flip(propertyTypes, setPropertyTypes, t)} data-testid={`button-preference-type-${t.toLowerCase()}`}>{t}</button>)}</div></fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 27px' }}><legend className="display-font" style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>The little comforts</legend><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{amenities.map(a => <button type="button" key={a} className={`chip ${selectedAmenities.includes(a) ? 'selected' : ''}`} onClick={() => flip(selectedAmenities, setSelectedAmenities, a)} data-testid={`button-preference-amenity-${a.toLowerCase().replaceAll(' ', '-')}`}>{a}</button>)}</div></fieldset>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15 }}><label className="field-label">Minimum budget / night<input className="input-control" type="number" min="0" value={budgetMin} onChange={e => setBudgetMin(Number(e.target.value))} data-testid="input-preference-budget-min" /></label><label className="field-label">Maximum budget / night<input className="input-control" type="number" min="0" value={budgetMax} onChange={e => setBudgetMax(Number(e.target.value))} data-testid="input-preference-budget-max" /></label><label className="field-label">Your usual crew<select className="input-control" value={guests} onChange={e => setGuests(Number(e.target.value))} data-testid="select-preference-guests">{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}</select></label></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, flexWrap: 'wrap', gap: 12 }}><span className="notice"><Sparkles size={14} style={{ verticalAlign: '-3px', marginRight: 5 }} /> We’ll show the reasons behind your matches.</span><button className="btn-primary" type="submit" disabled={save.isPending} data-testid="button-save-preferences">{save.isPending ? 'Saving your style…' : 'Save my travel style'} <ArrowRight size={15} /></button></div>
      {save.isSuccess && <p style={{ color: '#426554' }} role="status" data-testid="status-preferences-saved">Your preferences are saved. Your recommendations will feel a little more like you.</p>}
    </form>}</main></Layout>;
}

function ProfilePage() {
  const me = useGetMe();
  const update = useUpdateMe();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (me.data && !editing) setName(me.data.name); }, [me.data, editing]);
  const submit = (e: FormEvent) => { e.preventDefault(); update.mutate({ data: { name } }, { onSuccess: () => { setEditing(false); void qc.invalidateQueries({ queryKey: getGetMeQueryKey() }); } }); };
  return <Layout><main className="page-wrap page-enter" style={{ maxWidth: 800 }}><div className="eyebrow">A little home base</div><h1 className="display-font" style={{ fontSize: 48, margin: '8px 0' }}>Your account.</h1><p style={{ color: '#728078' }}>The details that make your Stayora yours.</p>{me.isLoading ? <div className="skeleton" style={{ height: 250, borderRadius: 20 }} /> : me.isError ? <div className="empty-state"><h2 className="display-font">Sign in to see your account</h2><p>Your profile lives safely with your Stayora account.</p><Link href="/sign-in" className="btn-primary" data-testid="link-profile-sign-in">Sign in</Link></div> : <form onSubmit={submit} style={{ background: '#fffdf8', border: '1px solid #e6dfd1', borderRadius: 20, padding: 28, marginTop: 28 }} data-testid="form-profile"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}><label className="field-label">Your name<input className="input-control" value={name} onChange={e => setName(e.target.value)} disabled={!editing} data-testid="input-profile-name" /></label><label className="field-label">Email address<input className="input-control" value={me.data?.email || ''} disabled data-testid="input-profile-email" /></label></div><div style={{ marginTop: 20 }}><span className="field-label">Account type</span><span className="tag" data-testid="text-profile-role">{me.data?.role}</span></div><p style={{ color: '#728078', fontSize: 12 }}>With Stayora since {displayDate(me.data?.createdAt)}</p>{editing ? <div style={{ display: 'flex', gap: 10 }}><button className="btn-primary" type="submit" disabled={update.isPending} data-testid="button-save-profile">{update.isPending ? 'Saving…' : 'Save changes'}</button><button className="btn-secondary" type="button" onClick={() => { setEditing(false); setName(me.data?.name || ''); }} data-testid="button-cancel-profile">Cancel</button></div> : <button type="button" className="btn-secondary" onClick={() => setEditing(true)} data-testid="button-edit-profile">Edit your details</button>}{update.isSuccess && <span role="status" style={{ marginLeft: 12, color: '#426554' }} data-testid="status-profile-saved">Saved</span>}</form>}</main></Layout>;
}

const emptyListing = { title: '', description: '', city: '', country: 'India', address: '', pricePerNight: 3500, propertyType: 'Homestay', maxGuests: 2, bedrooms: 1, bathrooms: 1, amenities: 'Wi-Fi, Kitchen', imageUrls: '' };
function HostPage() {
  const listings = useGetHostListings();
  const bookings = useGetHostBookings();
  const create = useCreateHostListing();
  const update = useUpdateHostListing();
  const remove = useDeleteHostListing();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyListing);
  const [editingId, setEditingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const setField = (key: keyof typeof emptyListing, value: string | number) => setForm(v => ({ ...v, [key]: value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const data = { ...form, pricePerNight: Number(form.pricePerNight), maxGuests: Number(form.maxGuests), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), amenities: form.amenities.split(',').map(x => x.trim()).filter(Boolean), imageUrls: form.imageUrls.split(',').map(x => x.trim()).filter(Boolean) };
    const finish = () => { setShowForm(false); setEditingId(''); setForm(emptyListing); void qc.invalidateQueries({ queryKey: getGetHostListingsQueryKey() }); };
    if (editingId) update.mutate({ propertyId: editingId, data }, { onSuccess: finish });
    else create.mutate({ data: { ...data, latitude: null, longitude: null } }, { onSuccess: finish });
  };
  const beginEdit = (p: any) => { setEditingId(p.id); setShowForm(true); setForm({ title: p.title, description: p.description, city: p.city, country: p.country, address: p.address, pricePerNight: p.pricePerNight, propertyType: p.propertyType, maxGuests: p.maxGuests, bedrooms: p.bedrooms, bathrooms: p.bathrooms, amenities: p.amenities.join(', '), imageUrls: p.imageUrls.join(', ') }); };
  const deleteListing = (id: string) => { if (window.confirm('Remove this listing from Stayora?')) remove.mutate({ propertyId: id }, { onSuccess: () => void qc.invalidateQueries({ queryKey: getGetHostListingsQueryKey() }) }); };
  return <Layout><main className="page-wrap page-enter"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 14, flexWrap: 'wrap' }}><div><div className="eyebrow">Make room for a good story</div><h1 className="display-font" style={{ fontSize: 48, margin: '8px 0' }}>Host corner.</h1><p style={{ color: '#728078' }}>Your spaces, your upcoming guests, all together.</p></div><button className="btn-primary" onClick={() => { setEditingId(''); setForm(emptyListing); setShowForm(v => !v); }} data-testid="button-new-listing">{showForm ? <X size={15} /> : <Home size={15} />}{showForm ? 'Close form' : 'Add a listing'}</button></div>
    {showForm && <form onSubmit={submit} style={{ background: '#fffdf8', border: '1px solid #e6dfd1', borderRadius: 20, padding: 24, margin: '24px 0' }} data-testid="form-host-listing"><h2 className="display-font" style={{ marginTop: 0 }}>{editingId ? 'Edit your listing' : 'Tell us about your place'}</h2><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>{(['title','city','country','address','propertyType','pricePerNight','maxGuests','bedrooms','bathrooms'] as (keyof typeof emptyListing)[]).map(k => <label className="field-label" key={k}>{k.replace(/[A-Z]/g, c => ` ${c.toLowerCase()}`)}<input className="input-control" required value={form[k]} onChange={e => setField(k, ['pricePerNight','maxGuests','bedrooms','bathrooms'].includes(k) ? Number(e.target.value) : e.target.value)} data-testid={`input-listing-${k}`} /></label>)}<label className="field-label" style={{ gridColumn: '1/-1' }}>Description<textarea className="input-control" required minLength={20} rows={4} value={form.description} onChange={e => setField('description', e.target.value)} data-testid="input-listing-description" /></label><label className="field-label">Amenities, separated by commas<input className="input-control" value={form.amenities} onChange={e => setField('amenities', e.target.value)} data-testid="input-listing-amenities" /></label><label className="field-label" style={{ gridColumn: 'span 2' }}>Image URLs, separated by commas<input className="input-control" value={form.imageUrls} onChange={e => setField('imageUrls', e.target.value)} placeholder="https://…" data-testid="input-listing-images" /></label></div><button className="btn-primary" style={{ marginTop: 15 }} disabled={create.isPending || update.isPending} data-testid="button-submit-listing">{create.isPending || update.isPending ? 'Saving…' : editingId ? 'Save listing' : 'Publish listing'} <ArrowRight size={15} /></button></form>}
    <SectionTitle eyebrow="Your spaces" title="Listings" />
    {listings.isLoading ? <LoadingCards /> : listings.isError ? <ErrorState retry={() => void listings.refetch()} /> : listings.data?.length ? <div className="property-grid">{listings.data.map(p => <div key={p.id}><PropertyCard property={p} /><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button className="btn-secondary" onClick={() => beginEdit(p)} data-testid={`button-edit-listing-${p.id}`}>Edit details</button><button className="btn-secondary" onClick={() => deleteListing(p.id)} disabled={remove.isPending} data-testid={`button-delete-listing-${p.id}`}>Remove listing</button></div></div>)}</div> : <div className="empty-state"><Home size={26} style={{ margin: '0 auto 12px' }} /><h3 className="display-font">Your first listing starts here</h3><p>Share what makes your space special.</p><button className="btn-primary" onClick={() => setShowForm(true)} data-testid="button-empty-add-listing">Create a listing</button></div>}
    <SectionTitle eyebrow="Arrivals and getaways" title="Guest bookings" />
    {bookings.isLoading ? <div className="skeleton" style={{ height: 120, borderRadius: 17 }} /> : bookings.isError ? <ErrorState retry={() => void bookings.refetch()} /> : bookings.data?.length ? <div className="table-wrap"><table className="data-table" data-testid="table-host-bookings"><thead><tr><th>Guest</th><th>Stay</th><th>Dates</th><th>Guests</th><th>Status</th><th>Total</th></tr></thead><tbody>{bookings.data.map(b => <tr key={b.id} data-testid={`row-host-booking-${b.id}`}><td>{b.userName}</td><td>{b.propertyTitle}<div style={{ color: '#7b887f' }}>{b.city}</div></td><td>{displayDate(b.checkIn)} – {displayDate(b.checkOut)}</td><td>{b.guests}</td><td><span className="tag">{b.status}</span></td><td>{money(b.totalPrice)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><Users size={25} style={{ margin: '0 auto 10px' }} /><p>No guest bookings to see just yet.</p></div>}
  </main></Layout>;
}

function AdminPage() {
  const overview = useGetAdminOverview();
  const properties = useGetAdminProperties();
  const users = useGetAdminUsers();
  const latest = useGetLatestEvaluation();
  const runEval = useRunEvaluation();
  const deleteProperty = useDeleteAdminProperty();
  const updateRole = useUpdateUserRole();
  const qc = useQueryClient();
  const stat = overview.data;
  const [adminActionError, setAdminActionError] = useState('');
  const [adminActionNotice, setAdminActionNotice] = useState('');
  const startEvaluation = () => runEval.mutate(undefined, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetLatestEvaluationQueryKey() }); } });
  const changeRole = (userId: string, role: 'guest' | 'host' | 'admin') => {
    setAdminActionError('');
    setAdminActionNotice('');
    updateRole.mutate({ userId, data: { role } }, {
      onSuccess: (user) => {
        setAdminActionNotice(`${user.name || user.email} is now a ${user.role}.`);
        void qc.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
      },
      onError: () => setAdminActionError('That role could not be changed. Please try again.'),
    });
  };
  const moderateProperty = (propertyId: string, title: string) => {
    if (!window.confirm(`Remove “${title}” from Stayora?`)) return;
    setAdminActionError('');
    setAdminActionNotice('');
    deleteProperty.mutate({ propertyId }, {
      onSuccess: () => {
        setAdminActionNotice(`${title} was removed from the marketplace.`);
        void qc.invalidateQueries({ queryKey: getGetAdminPropertiesQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
      },
      onError: () => setAdminActionError('This stay could not be removed. It may have booking history, or the server may be unavailable.'),
    });
  };
  return <Layout><main className="page-wrap page-enter"><div className="eyebrow">Behind the good stays</div><h1 className="display-font" style={{ fontSize: 48, margin: '8px 0' }}>Stayora, in view.</h1><p style={{ color: '#728078' }}>A clear-eyed look at the marketplace and how well the matches are working.</p>
    {overview.isLoading ? <div className="dashboard-stats">{[1,2,3,4].map(i => <div key={i} className="skeleton stat-card" style={{ height: 115 }} />)}</div> : overview.isError ? <ErrorState retry={() => void overview.refetch()} /> : <><div className="dashboard-stats" style={{ marginTop: 28 }}>{[['Guests',stat?.userCount],['Stays',stat?.propertyCount],['Bookings',stat?.bookingCount],['Guest notes',stat?.reviewCount]].map(([label,value]) => <div className="stat-card" key={label as string} data-testid={`stat-${String(label).toLowerCase().replaceAll(' ','-')}`}><span className="eyebrow">{label}</span><div className="stat-value">{value}</div><span style={{ color: '#78847c', fontSize: 11 }}>Across Stayora</span></div>)}</div>
    <SectionTitle eyebrow="The marketplace at a glance" title="Booking rhythm" />
    <div style={{ background: '#fffdf8', border: '1px solid #e6dfd1', borderRadius: 18, padding: 18, height: 250 }} data-testid="chart-booking-trend" role="img" aria-label="Booking trends over the last six months"><ResponsiveContainer width="100%" height="100%"><BarChart data={stat?.bookingTrend || []} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}><CartesianGrid stroke="#e8e1d6" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6dfd1', background: '#fffdf8' }} /><Bar dataKey="bookings" name="Bookings" fill="#42695a" radius={[7, 7, 0, 0]} maxBarSize={46} /></BarChart></ResponsiveContainer></div>
    </>
    }
    <SectionTitle eyebrow="Trust, measured" title="Recommendation research" action={<button className="btn-primary" onClick={startEvaluation} disabled={runEval.isPending} data-testid="button-run-evaluation">{runEval.isPending ? 'Running evaluation…' : 'Run evaluation'} <Sparkles size={15} /></button>} />
    {latest.isLoading ? <div className="skeleton" style={{ height: 190, borderRadius: 18 }} /> : latest.isError ? <div className="notice" data-testid="status-no-evaluation">No evaluation has been run yet. Run one to see how personalized matches compare with the baseline.</div> : latest.data && <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }} data-testid="panel-latest-evaluation">{[['Personalized precision@5',latest.data.personalizedPrecisionAt5],['Baseline precision@5',latest.data.baselinePrecisionAt5],['Personalized NDCG@5',latest.data.personalizedNdcgAt5],['Baseline NDCG@5',latest.data.baselineNdcgAt5],['Average ranker time',`${latest.data.averageRecommendationMs.toFixed(2)} ms`],['Synthetic users',latest.data.usersEvaluated],['Properties evaluated',latest.data.propertiesEvaluated],['Evaluated',displayDate(latest.data.evaluatedAt)]].map(([l,v]) => <div className="stat-card" key={String(l)}><span className="eyebrow">{l}</span><div className="stat-value" style={{ fontSize: 23 }}>{typeof v === 'number' ? v.toFixed(3) : v}</div></div>)}</div>}
    {latest.data && <section style={{ marginTop: 26 }} data-testid="evaluation-comparison">
      <SectionTitle eyebrow="Research comparison" title="Personalized ranking vs rating baseline" />
      <div style={{ background: '#fffdf8', border: '1px solid #e6dfd1', borderRadius: 18, padding: 18, height: 275 }} data-testid="chart-recommendation-comparison" role="img" aria-label="Precision and nDCG comparison between personalized ranking and rating baseline"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ metric: 'Precision@5', personalized: latest.data.personalizedPrecisionAt5, baseline: latest.data.baselinePrecisionAt5 }, { metric: 'nDCG@5', personalized: latest.data.personalizedNdcgAt5, baseline: latest.data.baselineNdcgAt5 }]} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid stroke="#e8e1d6" vertical={false} /><XAxis dataKey="metric" tickLine={false} axisLine={false} fontSize={12} /><YAxis domain={[0, 1]} allowDecimals tickLine={false} axisLine={false} fontSize={11} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6dfd1', background: '#fffdf8' }} /><Legend /><Bar dataKey="personalized" name="Personalized" fill="#42695a" radius={[7, 7, 0, 0]} maxBarSize={48} /><Bar dataKey="baseline" name="Rating baseline" fill="#d66e4d" radius={[7, 7, 0, 0]} maxBarSize={48} /></BarChart></ResponsiveContainer></div>
      <div className="table-wrap" style={{ marginTop: 16 }}><table className="data-table" data-testid="table-evaluation-results"><thead><tr><th>Method</th><th>Precision@5</th><th>nDCG@5</th><th>Average ranker time</th></tr></thead><tbody><tr><th>Personalized weighted ranker</th><td>{latest.data.personalizedPrecisionAt5.toFixed(3)}</td><td>{latest.data.personalizedNdcgAt5.toFixed(3)}</td><td>{latest.data.averageRecommendationMs.toFixed(2)} ms</td></tr><tr><th>Rating / review-count baseline</th><td>{latest.data.baselinePrecisionAt5.toFixed(3)}</td><td>{latest.data.baselineNdcgAt5.toFixed(3)}</td><td>Not measured</td></tr></tbody></table></div>
    </section>}
    {latest.data && <p style={{ color: '#77847b', fontSize: 11 }}>Precision: {latest.data.precisionConvention} · Relevance: {latest.data.relevanceScale} · {latest.data.syntheticData ? 'Synthetic evaluation data' : 'Live marketplace data'} · {latest.data.usersEvaluated} travelers, {latest.data.propertiesEvaluated} stays</p>}
    {runEval.isError && <p role="alert" style={{ color: '#ae4a3c' }} data-testid="status-evaluation-error">Evaluation could not complete. Please try again.</p>}
    <SectionTitle eyebrow="On the map" title="Popular stays" />
    {properties.isLoading ? <LoadingCards /> : properties.isError ? <ErrorState retry={() => void properties.refetch()} /> : <div className="property-grid">{(properties.data || []).slice(0,6).map(p => <PropertyCard key={p.id} property={p} />)}</div>}

    <SectionTitle eyebrow="People who make this place" title="User management" />
    {adminActionNotice && <div className="notice" role="status" style={{ marginBottom: 14 }} data-testid="status-admin-action-success">{adminActionNotice}</div>}
    {adminActionError && <div className="notice" role="alert" style={{ marginBottom: 14, background: '#f8e9e4', color: '#923f35' }} data-testid="status-admin-action-error">{adminActionError}</div>}
    {users.isLoading ? <div className="skeleton" style={{ height: 210, borderRadius: 17 }} data-testid="loading-admin-users" /> : users.isError ? <ErrorState message="We couldn’t load the user directory." retry={() => void users.refetch()} /> : users.data?.length ? <div className="table-wrap"><table className="data-table" data-testid="table-admin-users"><thead><tr><th>Person</th><th>Email</th><th>Joined</th><th>Stayora role</th></tr></thead><tbody>{users.data.map(user => <tr key={user.id} data-testid={`row-admin-user-${user.id}`}><td data-testid={`text-admin-user-name-${user.id}`}>{user.name}</td><td>{user.email}</td><td>{displayDate(user.createdAt)}</td><td><select className="input-control" value={user.role} disabled={updateRole.isPending} aria-label={`Change role for ${user.name}`} onChange={e => changeRole(user.id, e.target.value as 'guest' | 'host' | 'admin')} data-testid={`select-admin-user-role-${user.id}`}><option value="guest">Guest</option><option value="host">Host</option><option value="admin">Admin</option></select></td></tr>)}</tbody></table>{updateRole.isPending && <p style={{ padding: '0 17px', color: '#718078', fontSize: 12 }} role="status" data-testid="status-admin-role-saving">Updating account role…</p>}</div> : <div className="empty-state" data-testid="status-admin-users-empty"><Users size={25} style={{ margin: '0 auto 10px' }} /><p>No users to manage yet.</p></div>}

    <SectionTitle eyebrow="Marketplace stewardship" title="Property moderation" />
    {properties.isLoading ? <div className="skeleton" style={{ height: 210, borderRadius: 17 }} data-testid="loading-admin-properties" /> : properties.isError ? <ErrorState message="We couldn’t load the property review list." retry={() => void properties.refetch()} /> : properties.data?.length ? <div className="table-wrap"><table className="data-table" data-testid="table-admin-properties"><thead><tr><th>Stay</th><th>Host</th><th>Location</th><th>Nightly price</th><th>Rating</th><th>Moderation</th></tr></thead><tbody>{properties.data.map(property => <tr key={property.id} data-testid={`row-admin-property-${property.id}`}><td><Link href={`/properties/${property.id}`} className="nav-link" data-testid={`link-admin-property-${property.id}`}>{property.title}</Link></td><td>{property.hostName}</td><td>{property.city}, {property.country}</td><td>{money(property.pricePerNight)}</td><td><span className="rating-pill"><Star size={12} fill="#d66e4d" color="#d66e4d" /> {Number(property.averageRating) > 0 ? Number(property.averageRating).toFixed(1) : 'New'}</span></td><td><button className="btn-secondary" onClick={() => moderateProperty(property.id, property.title)} disabled={deleteProperty.isPending} data-testid={`button-moderate-property-${property.id}`}>{deleteProperty.isPending ? 'Working…' : 'Remove stay'}</button></td></tr>)}</tbody></table>{deleteProperty.isPending && <p style={{ padding: '0 17px', color: '#718078', fontSize: 12 }} role="status" data-testid="status-admin-property-removing">Updating the marketplace…</p>}</div> : <div className="empty-state" data-testid="status-admin-properties-empty"><Home size={25} style={{ margin: '0 auto 10px' }} /><p>No properties need review.</p></div>}
  </main></Layout>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <Layout><main className="page-wrap"><div className="skeleton" style={{ height: 220, borderRadius: 18 }} role="status" aria-label="Checking your account" /></main></Layout>;
  }
  if (!isSignedIn) {
    return <Layout><main className="page-wrap page-enter"><div className="empty-state"><ShieldCheck size={28} style={{ margin: '0 auto 12px' }} /><h1 className="display-font">Sign in to make this yours.</h1><p>Your saved stays, trips, and travel style are available with a Stayora account.</p><Link href="/sign-in" className="btn-primary" data-testid="link-access-sign-in">Sign in <ArrowRight size={15} /></Link></div></main></Layout>;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useGetMe({ query: { enabled: isLoaded && isSignedIn === true } });
  if (!isLoaded || (isSignedIn && me.isLoading)) {
    return <Layout><main className="page-wrap"><div className="skeleton" style={{ height: 220, borderRadius: 18 }} role="status" aria-label="Checking administrator access" /></main></Layout>;
  }
  if (!isSignedIn) {
    return <Layout><main className="page-wrap page-enter"><div className="empty-state"><ShieldCheck size={28} style={{ margin: '0 auto 12px' }} /><h1 className="display-font">Administrator sign-in required.</h1><p>Sign in with an administrator account to continue.</p><Link href="/sign-in" className="btn-primary" data-testid="link-admin-sign-in">Sign in <ArrowRight size={15} /></Link></div></main></Layout>;
  }
  if (me.isError) {
    return <Layout><main className="page-wrap"><ErrorState message="We couldn’t verify administrator access." retry={() => void me.refetch()} /></main></Layout>;
  }
  if (me.data?.role !== 'admin') {
    return <Layout><main className="page-wrap page-enter"><div className="empty-state" role="alert" data-testid="status-admin-forbidden"><ShieldCheck size={28} style={{ margin: '0 auto 12px' }} /><h1 className="display-font">This area is for administrators.</h1><p>Your account does not have administrator access.</p></div></main></Layout>;
  }
  return <>{children}</>;
}

const infoPages = {
  '/about': {
    eyebrow: 'About Stayora',
    title: 'A more personal way to find a stay.',
    paragraphs: [
      'Stayora is a vacation-rental marketplace project built around clear preferences, transparent prices, and recommendations with reasons.',
      'Its matching system is a deterministic weighted scoring method, not a machine-learning or generative AI model.',
    ],
  },
  '/contact': {
    eyebrow: 'Contact',
    title: 'A demo without a support inbox.',
    paragraphs: [
      'This Replit project does not collect or send contact requests. For project questions, contact the project owner through the workspace.',
      'Do not enter payment details or sensitive personal information; Stayora does not process payments.',
    ],
  },
  '/privacy': {
    eyebrow: 'Privacy',
    title: 'What this demo stores.',
    paragraphs: [
      'Clerk manages authentication. Stayora stores the application profile, saved preferences, wishlists, bookings, and reviews in its development database.',
      'Demo properties and research profiles are synthetic. Avoid using sensitive personal information in this project.',
    ],
  },
  '/terms': {
    eyebrow: 'Terms',
    title: 'A project demo, not a real reservation service.',
    paragraphs: [
      'Listings, reservations, and prices are demonstrations. A booking is stored with a demo payment status; no payment is taken and no stay is arranged.',
      'Property photos are external demo image URLs. This project does not provide image uploads or verify real-world accommodation.',
    ],
  },
  '/help': {
    eyebrow: 'Help',
    title: 'Finding your way around.',
    paragraphs: [
      'Search stays by destination, dates, guests, nightly price, stay type, bedrooms, bathrooms, and amenities. Sign in to save stays, preferences, and demo bookings.',
      'Hosts can create and manage their own listings. Administrator access is assigned to a verified Clerk account using the project’s Replit Secrets configuration.',
    ],
  },
} as const;

function InfoPage() {
  const [path] = useLocation();
  const page = infoPages[path as keyof typeof infoPages] ?? infoPages['/help'];
  return <Layout><main className="page-wrap page-enter" style={{ maxWidth: 850, minHeight: '55vh' }}><Link href="/" className="nav-link" data-testid="link-info-home"><ArrowLeft size={14} /> Back to stays</Link><div className="eyebrow" style={{ marginTop: 36 }}>{page.eyebrow}</div><h1 className="display-font" style={{ fontSize: 'clamp(36px,5vw,54px)', margin: '8px 0 20px' }}>{page.title}</h1>{page.paragraphs.map((paragraph, index) => <p key={index} style={{ color: '#64746b', lineHeight: 1.85, maxWidth: 700 }}>{paragraph}</p>)}</main></Layout>;
}

function ProtectedWishlistPage() { return <RequireAuth><WishlistPage /></RequireAuth>; }
function ProtectedBookingsPage() { return <RequireAuth><BookingsPage /></RequireAuth>; }
function ProtectedHostPage() { return <RequireAuth><HostPage /></RequireAuth>; }
function ProtectedAdminPage() { return <RequireAdmin><AdminPage /></RequireAdmin>; }
function ProtectedProfilePage() { return <RequireAuth><ProfilePage /></RequireAuth>; }
function ProtectedPreferencesPage() { return <RequireAuth><PreferencesPage /></RequireAuth>; }

function LandingRedirect() {
  return <><Show when="signed-in"><Redirect to="/bookings" /></Show><Show when="signed-out"><HomePage /></Show></>;
}

function SignInPage() {
  return <div className="auth-page"><div className="auth-aside"><Brand /><p className="eyebrow" style={{ marginTop: 90 }}>Good places remember you</p><h1 className="display-font">Make room<br />for your next<br /><span style={{ color: '#d66e4d' }}>good story.</span></h1><p>Your kind of stay is closer than you think.</p></div><div className="auth-form"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div></div>;
}
function SignUpPage() {
  return <div className="auth-page"><div className="auth-aside"><Brand /><p className="eyebrow" style={{ marginTop: 90 }}>Come find your somewhere</p><h1 className="display-font">Travel like<br />you already<br /><span style={{ color: '#d66e4d' }}>belong.</span></h1><p>Tell us what feels right. We’ll help you find it.</p></div><div className="auth-form"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div></div>;
}

function CacheInvalidator() {
  const { isLoaded, userId } = useAuth();
  const qc = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    const currentUserId = userId ?? null;
    if (
      previousUserId.current !== undefined &&
      previousUserId.current !== currentUserId
    ) {
      qc.clear();
    }
    previousUserId.current = currentUserId;
  }, [isLoaded, userId, qc]);
  return null;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome back', subtitle: 'Your next somewhere is waiting.' } },
      signUp: { start: { title: 'A little more you', subtitle: 'Start finding stays that feel like yours.' } },
    }}
    routerPush={(to: string) => setLocation(stripBase(to))}
    routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <CacheInvalidator />
      <Switch>
        <Route path="/" component={LandingRedirect} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/properties/:propertyId" component={PropertyPage} />
        <Route path="/wishlist" component={ProtectedWishlistPage} />
        <Route path="/bookings" component={ProtectedBookingsPage} />
        <Route path="/host" component={ProtectedHostPage} />
        <Route path="/admin" component={ProtectedAdminPage} />
        <Route path="/profile" component={ProtectedProfilePage} />
        <Route path="/preferences" component={ProtectedPreferencesPage} />
        <Route path="/about" component={InfoPage} />
        <Route path="/contact" component={InfoPage} />
        <Route path="/privacy" component={InfoPage} />
        <Route path="/terms" component={InfoPage} />
        <Route path="/help" component={InfoPage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><ClerkRoutes /></WouterRouter>;
}

export default App;
