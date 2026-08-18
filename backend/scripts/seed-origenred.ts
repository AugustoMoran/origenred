import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import axios from 'axios';
import { User } from '../src/modules/auth/models/User';
import { MarketplaceCategory } from '../src/modules/marketplace/models/MarketplaceCategory';
import { SellerProfile } from '../src/modules/marketplace/models/SellerProfile';
import { Listing } from '../src/modules/marketplace/models/Listing';
import { computeOrigenRankScore } from '../src/modules/marketplace/services/origenRankService';
import { ensureListingsIndex } from '../src/modules/marketplace/services/meilisearchService';
import { uploadToR2, deleteFromR2, isR2Enabled } from '../src/modules/marketplace/services/r2StorageService';
import { r2Config } from '../src/config/features';

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const DEFAULT_CATEGORIES = [
  { name: 'Electrónica', slug: 'electronica', icon: '💻', displayOrder: 1 },
  { name: 'Ropa y Accesorios', slug: 'ropa-accesorios', icon: '👕', displayOrder: 2 },
  { name: 'Hogar', slug: 'hogar', icon: '🏠', displayOrder: 3 },
  { name: 'Deportes', slug: 'deportes', icon: '⚽', displayOrder: 4 },
  { name: 'Belleza', slug: 'belleza', icon: '💄', displayOrder: 5 },
  { name: 'Juguetes', slug: 'juguetes', icon: '🧸', displayOrder: 6 },
  { name: 'Automotor', slug: 'automotor', icon: '🚗', displayOrder: 7 },
  { name: 'Alimentos', slug: 'alimentos', icon: '🍎', displayOrder: 8 },
  { name: 'Servicios', slug: 'servicios', icon: '🛠️', displayOrder: 9 },
  { name: 'Otros', slug: 'otros', icon: '📦', displayOrder: 99 },
];

const DEMO_SELLERS = [
  {
    email: 'vendedor1@demo.origenred.com.ar',
    password: 'DemoVendedor1!',
    name: 'María Tech Store',
    businessName: 'María Tech Store',
    slug: 'maria-tech-store',
    province: 'Buenos Aires',
    city: 'CABA',
    postalCode: '1425',
    description: 'Electrónica y gadgets con envío a todo el país.',
    reputationScore: 88,
    mercadoPagoConnected: true,
  },
  {
    email: 'vendedor2@demo.origenred.com.ar',
    password: 'DemoVendedor2!',
    name: 'Deportes Pampa',
    businessName: 'Deportes Pampa',
    slug: 'deportes-pampa',
    province: 'Córdoba',
    city: 'Córdoba',
    postalCode: '5000',
    description: 'Indumentaria y equipamiento deportivo.',
    reputationScore: 72,
    mercadoPagoConnected: false,
  },
  {
    email: 'vendedor3@demo.origenred.com.ar',
    password: 'DemoVendedor3!',
    name: 'Hogar & Deco Norte',
    businessName: 'Hogar & Deco Norte',
    slug: 'hogar-deco-norte',
    province: 'Santa Fe',
    city: 'Rosario',
    postalCode: '2000',
    description: 'Decoración, hogar y muebles seleccionados.',
    reputationScore: 91,
    mercadoPagoConnected: true,
  },
  {
    email: 'vendedor4@demo.origenred.com.ar',
    password: 'DemoVendedor4!',
    name: 'Moda Urbana BA',
    businessName: 'Moda Urbana BA',
    slug: 'moda-urbana-ba',
    province: 'Buenos Aires',
    city: 'San Isidro',
    postalCode: '1642',
    description: 'Ropa y accesorios de temporada.',
    reputationScore: 65,
    mercadoPagoConnected: false,
  },
];

type DemoListing = {
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  categorySlug: string;
  brand?: string;
  condition: 'new' | 'used' | 'refurbished';
  freeShipping: boolean;
  imageSeed: string;
  salesCount?: number;
  views?: number;
};

const DEMO_LISTINGS: Record<string, DemoListing[]> = {
  'maria-tech-store': [
    {
      title: 'Auriculares Bluetooth Pro X',
      description: 'Cancelación de ruido activa, 30h de batería y estuche de carga rápida.',
      price: 45999,
      compareAtPrice: 59999,
      stock: 24,
      categorySlug: 'electronica',
      brand: 'SoundMax',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'auriculares-pro',
      salesCount: 12,
      views: 340,
    },
    {
      title: 'Smartwatch Fitness 2',
      description: 'Monitoreo de salud, GPS y resistencia al agua 5ATM.',
      price: 38900,
      stock: 15,
      categorySlug: 'electronica',
      brand: 'FitPulse',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'smartwatch-fitness',
      salesCount: 8,
      views: 210,
    },
    {
      title: 'Teclado mecánico RGB',
      description: 'Switches red, retroiluminación RGB y cable desmontable USB-C.',
      price: 28500,
      compareAtPrice: 32000,
      stock: 10,
      categorySlug: 'electronica',
      brand: 'KeyPro',
      condition: 'new',
      freeShipping: false,
      imageSeed: 'teclado-mecanico',
      views: 95,
    },
    {
      title: 'Parlante portátil 40W',
      description: 'Bluetooth 5.3, IPX7 y 12 horas de autonomía.',
      price: 21999,
      stock: 30,
      categorySlug: 'electronica',
      brand: 'BoomBox',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'parlante-portatil',
      salesCount: 5,
      views: 180,
    },
  ],
  'deportes-pampa': [
    {
      title: 'Pelota de fútbol profesional',
      description: 'Tamaño 5, cosida a mano, ideal para cancha y entrenamiento.',
      price: 12500,
      stock: 40,
      categorySlug: 'deportes',
      brand: 'PampaSport',
      condition: 'new',
      freeShipping: false,
      imageSeed: 'pelota-futbol',
      salesCount: 20,
      views: 420,
    },
    {
      title: 'Bicicleta mountain bike 29"',
      description: 'Suspensión delantera, 21 velocidades, frenos a disco.',
      price: 289000,
      compareAtPrice: 320000,
      stock: 3,
      categorySlug: 'deportes',
      brand: 'TrailRide',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'bicicleta-mtb',
      salesCount: 2,
      views: 150,
    },
    {
      title: 'Set de pesas ajustables 20kg',
      description: 'Mancuernas regulables con barras y discos incluidos.',
      price: 34500,
      stock: 12,
      categorySlug: 'deportes',
      brand: 'IronFit',
      condition: 'new',
      freeShipping: false,
      imageSeed: 'pesas-gym',
      views: 88,
    },
  ],
  'hogar-deco-norte': [
    {
      title: 'Lámpara de pie nordic',
      description: 'Diseño escandinavo, luz cálida regulable con dimmer.',
      price: 18900,
      stock: 8,
      categorySlug: 'hogar',
      brand: 'NordLight',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'lampara-nordic',
      salesCount: 6,
      views: 200,
    },
    {
      title: 'Set de ollas acero 5 piezas',
      description: 'Acero inoxidable 18/10, apto inducción, incluye tapas.',
      price: 42000,
      compareAtPrice: 48000,
      stock: 14,
      categorySlug: 'hogar',
      brand: 'ChefHome',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'ollas-acero',
      salesCount: 9,
      views: 310,
    },
    {
      title: 'Alfombra shaggy 160x230',
      description: 'Pelo largo suave, antideslizante, varios colores.',
      price: 27500,
      stock: 6,
      categorySlug: 'hogar',
      condition: 'new',
      freeShipping: false,
      imageSeed: 'alfombra-shaggy',
      views: 70,
    },
  ],
  'moda-urbana-ba': [
    {
      title: 'Campera jean oversize',
      description: 'Denim premium, corte unisex, temporada otoño/invierno.',
      price: 15900,
      compareAtPrice: 19900,
      stock: 22,
      categorySlug: 'ropa-accesorios',
      brand: 'UrbanWear',
      condition: 'new',
      freeShipping: false,
      imageSeed: 'campera-jean',
      salesCount: 14,
      views: 280,
    },
    {
      title: 'Zapatillas urbanas blancas',
      description: 'Suela de goma, plantilla memory foam, tallas 36 a 45.',
      price: 22900,
      stock: 18,
      categorySlug: 'ropa-accesorios',
      brand: 'StepCity',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'zapatillas-urbanas',
      salesCount: 11,
      views: 350,
    },
    {
      title: 'Bolso tote canvas',
      description: 'Lona resistente, bolsillos internos, ideal día a día.',
      price: 8900,
      stock: 35,
      categorySlug: 'ropa-accesorios',
      brand: 'CanvasCo',
      condition: 'new',
      freeShipping: false,
      imageSeed: 'bolso-tote',
      views: 120,
    },
    {
      title: 'Reloj minimalista cuero',
      description: 'Correa de cuero genuino, movimiento quartz, unisex.',
      price: 11200,
      stock: 9,
      categorySlug: 'ropa-accesorios',
      brand: 'TimeLine',
      condition: 'new',
      freeShipping: true,
      imageSeed: 'reloj-cuero',
      salesCount: 4,
      views: 90,
    },
  ],
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const fallbackImageUrl = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`;

const isR2HostedImage = (url: string) => {
  if (!url) return false;
  if (r2Config.publicUrl && url.startsWith(r2Config.publicUrl)) return true;
  if (url.includes('r2.cloudflarestorage.com')) return true;
  if (url.includes('.r2.dev')) return true;
  return false;
};

const listingNeedsR2Image = (listing: { images?: { url: string; key?: string }[] }) => {
  const img = listing.images?.[0];
  if (!img) return true;
  if (img.key && isR2HostedImage(img.url)) return false;
  if (img.url.includes('picsum.photos')) return true;
  return !isR2HostedImage(img.url);
};

async function uploadDemoImageToR2(imageSeed: string, alt: string) {
  const sourceUrl = fallbackImageUrl(imageSeed);
  const response = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
    timeout: 45000,
    maxRedirects: 5,
  });
  const buffer = Buffer.from(response.data);
  const uploaded = await uploadToR2({
    buffer,
    originalName: `${imageSeed}.jpg`,
    mimeType: 'image/jpeg',
    folder: 'seed/listings',
  });
  return { url: uploaded.url, key: uploaded.key, alt };
}

async function buildListingImage(item: DemoListing) {
  if (!isR2Enabled()) {
    return { url: fallbackImageUrl(item.imageSeed), alt: item.title };
  }
  return await uploadDemoImageToR2(item.imageSeed, item.title);
}

async function syncDemoListingImagesToR2() {
  if (!isR2Enabled()) {
    console.log('R2 no configurado — imágenes quedan en picsum.photos');
    return;
  }

  if (!r2Config.publicUrl) {
    console.warn(
      'R2_PUBLIC_URL vacío: las imágenes se suben pero pueden no verse en el browser. ' +
        'En Cloudflare R2 habilitá Public Access y pegá la URL en R2_PUBLIC_URL.'
    );
  }

  let uploaded = 0;

  for (const sellerData of DEMO_SELLERS) {
    const listings = DEMO_LISTINGS[sellerData.slug] || [];
    for (const item of listings) {
      const baseSlug = slugify(item.title);
      const listing = await Listing.findOne({ slug: baseSlug });
      if (!listing) continue;

      const force = process.env.SEED_FORCE_R2_IMAGES === 'true';
      if (!force && !listingNeedsR2Image(listing)) continue;

      const oldKey = listing.images?.[0]?.key;
      console.log(`R2 upload: ${item.title}`);
      try {
        const image = await uploadDemoImageToR2(item.imageSeed, item.title);
        listing.images = [image];
        await listing.save();

        if (oldKey && oldKey !== image.key) {
          await deleteFromR2(oldKey).catch(() => undefined);
        }
        uploaded += 1;
      } catch (err) {
        console.error(`Error R2 (${item.title}):`, (err as Error).message);
        console.error('Ejecutá: npm run r2:bootstrap — y verificá permisos del token S3 en Cloudflare R2');
      }
    }
  }

  console.log(`Imágenes en R2 actualizadas: ${uploaded}`);
}

async function ensureAdmin() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@origenred.com.ar';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'OrigenRed2026!';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const hash = await bcrypt.hash(adminPassword, 10);
    admin = await User.create({
      name: 'Administrador OrigenRed',
      email: adminEmail,
      password: hash,
      roles: ['admin', 'comprador'],
      permissions: {},
    });
    console.log(`Admin creado: ${adminEmail} / ${adminPassword}`);
  } else {
    if (!admin.roles.includes('admin')) {
      admin.roles = [...admin.roles, 'admin'];
      await admin.save();
      console.log(`Rol admin agregado a: ${adminEmail}`);
    } else {
      console.log(`Admin ya existe: ${adminEmail}`);
    }
  }

  return { admin, adminEmail, adminPassword };
}

async function seedCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    await MarketplaceCategory.findOneAndUpdate(
      { slug: cat.slug },
      { ...cat, isActive: true },
      { upsert: true, new: true }
    );
  }
  console.log(`Categorías: ${DEFAULT_CATEGORIES.length} procesadas`);
}

async function seedDemoMarketplace(adminId: mongoose.Types.ObjectId) {
  if (process.env.SEED_DEMO_DATA === 'false') {
    console.log('SEED_DEMO_DATA=false — omitiendo vendedores y productos demo');
    return;
  }

  const categoryBySlug = new Map(
    (await MarketplaceCategory.find({ isActive: true })).map((c) => [c.slug, c])
  );

  let listingsCreated = 0;

  for (const sellerData of DEMO_SELLERS) {
    let user = await User.findOne({ email: sellerData.email });
    if (!user) {
      const hash = await bcrypt.hash(sellerData.password, 10);
      user = await User.create({
        name: sellerData.name,
        email: sellerData.email,
        password: hash,
        roles: ['vendedor', 'comprador'],
        permissions: {},
      });
      console.log(`Usuario demo: ${sellerData.email} / ${sellerData.password}`);
    }

    let seller = await SellerProfile.findOne({ user: user._id });
    if (!seller) {
      seller = await SellerProfile.create({
        user: user._id,
        businessName: sellerData.businessName,
        slug: sellerData.slug,
        description: sellerData.description,
        status: 'approved',
        province: sellerData.province,
        city: sellerData.city,
        postalCode: sellerData.postalCode,
        reputationScore: sellerData.reputationScore,
        mercadoPagoConnected: sellerData.mercadoPagoConnected,
        approvedAt: new Date(),
        approvedBy: adminId,
        listingCount: 0,
      });
      console.log(`Vendedor aprobado: ${sellerData.businessName}`);
    } else if (seller.status !== 'approved') {
      seller.status = 'approved';
      seller.approvedAt = new Date();
      seller.approvedBy = adminId;
      await seller.save();
    }

    const listings = DEMO_LISTINGS[sellerData.slug] || [];
    for (const item of listings) {
      const category = categoryBySlug.get(item.categorySlug);
      if (!category) continue;

      const baseSlug = slugify(item.title);
      const existing = await Listing.findOne({ slug: baseSlug });
      if (existing) continue;

      const image = await buildListingImage(item);

      const listing = await Listing.create({
        seller: seller._id,
        title: item.title,
        slug: baseSlug,
        description: item.description,
        shortDescription: item.description.slice(0, 120),
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        currency: 'ARS',
        stock: item.stock,
        category: category._id,
        brand: item.brand,
        condition: item.condition,
        images: [image],
        freeShipping: item.freeShipping,
        allowPickup: true,
        province: sellerData.province,
        city: sellerData.city,
        postalCode: sellerData.postalCode,
        status: 'active',
        views: item.views ?? 0,
        salesCount: item.salesCount ?? 0,
        moderated: false,
        origenRankScore: 0,
      });

      listing.origenRankScore = computeOrigenRankScore({ listing, seller });
      await listing.save();
      listingsCreated += 1;
    }

    const activeCount = await Listing.countDocuments({ seller: seller._id, status: 'active' });
    await SellerProfile.findByIdAndUpdate(seller._id, { listingCount: activeCount });
  }

  for (const cat of categoryBySlug.values()) {
    const count = await Listing.countDocuments({
      category: cat._id,
      status: 'active',
      moderated: { $ne: true },
    });
    await MarketplaceCategory.findByIdAndUpdate(cat._id, { listingCount: count });
  }

  console.log(`Productos demo creados: ${listingsCreated} (omitidos si ya existían por slug)`);
  await syncDemoListingImagesToR2();
}

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI no configurado');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Conectado a MongoDB');

  const { admin } = await ensureAdmin();
  await seedCategories();
  await seedDemoMarketplace(admin._id);

  const promoteEmail = process.env.SEED_PROMOTE_EMAIL?.trim().toLowerCase();
  if (promoteEmail) {
    const user = await User.findOne({ email: promoteEmail });
    if (user && !user.roles.includes('admin')) {
      user.roles = [...user.roles, 'admin'];
      await user.save();
      console.log(`Rol admin agregado a: ${promoteEmail}`);
    } else if (user) {
      console.log(`Ya es admin: ${promoteEmail}`);
    } else {
      console.log(`SEED_PROMOTE_EMAIL no encontrado: ${promoteEmail}`);
    }
  }

  try {
    await ensureListingsIndex();
    console.log('Índice Meilisearch preparado (si está configurado)');
  } catch {
    console.log('Meilisearch no disponible — se omitió índice');
  }

  await mongoose.disconnect();
  console.log('Seed completado');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
