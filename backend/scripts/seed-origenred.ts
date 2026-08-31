import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from '../src/modules/auth/models/User';
import { MarketplaceCategory } from '../src/modules/marketplace/models/MarketplaceCategory';
import { SellerProfile } from '../src/modules/marketplace/models/SellerProfile';
import { Listing } from '../src/modules/marketplace/models/Listing';
import Product from '../src/modules/inventory/models/Product';
import { ensureListingsIndex } from '../src/modules/marketplace/services/meilisearchService';
import {
  syncProductToMarketplaceListing,
  syncAllInventoryProductsToMarketplace,
} from '../src/modules/marketplace/services/productListingSyncService';
import { normalizeMediaUrl } from '../src/shared/utils/mediaUrl';

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

const fallbackImageUrl = () => 'https://origenred.vercel.app/logooficialdefinitivo.png';

async function clearLegacyMarketplaceListings() {
  const demoSlugs = DEMO_SELLERS.map((s) => s.slug);
  const demoSellers = await SellerProfile.find({ slug: { $in: demoSlugs } }).select('_id');
  const demoSellerIds = demoSellers.map((s) => s._id);

  const result = await Listing.deleteMany({
    $or: [
      { seller: { $in: demoSellerIds } },
      { inventoryProductId: { $exists: false } },
      { inventoryProductId: null },
    ],
  });

  console.log(`Publicaciones MP legacy eliminadas: ${result.deletedCount ?? 0}`);
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

async function fixBrokenProductImages() {
  const products = await Product.find({});
  let fixed = 0;
  for (const product of products) {
    const nextUrl = normalizeMediaUrl(product.imageUrl);
    const nextGallery = (product.gallery || []).map((g) => ({
      ...g,
      url: normalizeMediaUrl(g.url),
    }));

    const urlChanged = product.imageUrl !== nextUrl;
    const galleryChanged = JSON.stringify(product.gallery) !== JSON.stringify(nextGallery);

    if (urlChanged || galleryChanged) {
      product.imageUrl = nextUrl;
      product.gallery = nextGallery as any;
      await product.save();
      fixed += 1;
    }
  }
  console.log(`URLs de imagen corregidas en productos: ${fixed}`);
}

async function seedInventoryDemoProducts(adminId: mongoose.Types.ObjectId) {
  if (process.env.SEED_DEMO_DATA === 'false') {
    console.log('SEED_DEMO_DATA=false — omitiendo productos demo');
    return;
  }

  await clearLegacyMarketplaceListings();

  const allItems: DemoListing[] = [];
  for (const sellerSlug of Object.keys(DEMO_LISTINGS)) {
    allItems.push(...(DEMO_LISTINGS[sellerSlug] || []));
  }

  let productsCreated = 0;

  for (const item of allItems) {
    const sku = `DEMO-${slugify(item.title).replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const imageUrl = fallbackImageUrl();
    const productSlug = slugify(item.title);

    let product = await Product.findOne({ sku });
    if (!product) {
      product = await Product.create({
        name: item.title,
        sku,
        slug: productSlug,
        description: item.description,
        commercialDescription: item.description.slice(0, 120),
        price: item.price,
        costPrice: Math.round(item.price * 0.55),
        iva: 21,
        margin: 30,
        stock: item.stock,
        minStock: 2,
        category: item.categorySlug,
        imageUrl,
        gallery: [{ url: imageUrl, alt: item.title }],
        featured: item.freeShipping,
        paused: false,
        isActive: true,
        displayOrder: productsCreated,
      });
      productsCreated += 1;
      console.log(`Producto inventario creado: ${item.title}`);
    } else {
      product.paused = false;
      product.isActive = true;
      product.stock = item.stock;
      product.price = item.price;
      product.category = item.categorySlug;
      if (!product.imageUrl) product.imageUrl = imageUrl;
      await product.save();
    }

    await syncProductToMarketplaceListing(String(product._id), adminId);
  }

  const syncedExisting = await syncAllInventoryProductsToMarketplace(adminId);

  console.log(
    `Productos inventario nuevos: ${productsCreated} · sincronizados al marketplace: ${syncedExisting}`
  );
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
  await fixBrokenProductImages();
  await seedInventoryDemoProducts(admin._id);

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
