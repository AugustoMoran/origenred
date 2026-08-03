import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from '../src/modules/auth/models/User';
import { MarketplaceCategory } from '../src/modules/marketplace/models/MarketplaceCategory';
import { ensureListingsIndex } from '../src/modules/marketplace/services/meilisearchService';

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

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI no configurado');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Conectado a MongoDB');

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
    console.log(`Admin ya existe: ${adminEmail}`);
  }

  for (const cat of DEFAULT_CATEGORIES) {
    await MarketplaceCategory.findOneAndUpdate(
      { slug: cat.slug },
      { ...cat, isActive: true },
      { upsert: true, new: true }
    );
  }
  console.log(`Categorías: ${DEFAULT_CATEGORIES.length} procesadas`);

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
