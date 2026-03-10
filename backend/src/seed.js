/**
 * Database Seed Script - Mongoose/MongoDB
 * Run with: npm run seed
 */

require('dotenv').config();
const { connectDB } = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Settings = require('./models/Settings');

// Sample products
const sampleProducts = [
  {
    sku: 'GRN-001',
    name: 'Basmati Rice 5kg',
    category: 'Grains & Pulses',
    price: 1250.00,
    currentStock: 45,
    reorderPoint: 20,
    reorderQuantity: 100,
    leadTimeDays: 5,
    safetyStock: 15,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'GRN-002',
    name: 'Red Rice 5kg',
    category: 'Grains & Pulses',
    price: 980.00,
    currentStock: 38,
    reorderPoint: 15,
    reorderQuantity: 80,
    leadTimeDays: 5,
    safetyStock: 10,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'GRN-003',
    name: 'Dhal 1kg',
    category: 'Grains & Pulses',
    price: 450.00,
    currentStock: 60,
    reorderPoint: 25,
    reorderQuantity: 100,
    leadTimeDays: 4,
    safetyStock: 20,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'BEV-001',
    name: 'Ceylon Tea 400g',
    category: 'Beverages',
    price: 520.00,
    currentStock: 75,
    reorderPoint: 30,
    reorderQuantity: 150,
    leadTimeDays: 3,
    safetyStock: 25,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'BEV-002',
    name: 'Nescafe Classic 100g',
    category: 'Beverages',
    price: 890.00,
    currentStock: 42,
    reorderPoint: 20,
    reorderQuantity: 80,
    leadTimeDays: 7,
    safetyStock: 15,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'BEV-003',
    name: 'Milo 400g',
    category: 'Beverages',
    price: 1150.00,
    currentStock: 35,
    reorderPoint: 15,
    reorderQuantity: 60,
    leadTimeDays: 7,
    safetyStock: 12,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'DAI-001',
    name: 'Fresh Milk 1L',
    category: 'Dairy',
    price: 320.00,
    currentStock: 28,
    reorderPoint: 20,
    reorderQuantity: 50,
    leadTimeDays: 2,
    safetyStock: 15,
    warehouseLocation: 'Cold Storage',
    status: 'Active'
  },
  {
    sku: 'DAI-002',
    name: 'Curd 400g',
    category: 'Dairy',
    price: 180.00,
    currentStock: 22,
    reorderPoint: 15,
    reorderQuantity: 40,
    leadTimeDays: 2,
    safetyStock: 10,
    warehouseLocation: 'Cold Storage',
    status: 'Active'
  },
  {
    sku: 'OIL-001',
    name: 'Coconut Oil 750ml',
    category: 'Oils & Fats',
    price: 680.00,
    currentStock: 55,
    reorderPoint: 20,
    reorderQuantity: 80,
    leadTimeDays: 5,
    safetyStock: 15,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'OIL-002',
    name: 'Vegetable Oil 1L',
    category: 'Oils & Fats',
    price: 520.00,
    currentStock: 48,
    reorderPoint: 20,
    reorderQuantity: 80,
    leadTimeDays: 5,
    safetyStock: 15,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  },
  {
    sku: 'BAK-001',
    name: 'Bread Loaf',
    category: 'Bakery',
    price: 120.00,
    currentStock: 15,
    reorderPoint: 10,
    reorderQuantity: 30,
    leadTimeDays: 1,
    safetyStock: 8,
    warehouseLocation: 'Fresh Section',
    status: 'Active'
  },
  {
    sku: 'SEA-001',
    name: 'Dried Fish 500g',
    category: 'Seafood',
    price: 750.00,
    currentStock: 25,
    reorderPoint: 10,
    reorderQuantity: 40,
    leadTimeDays: 4,
    safetyStock: 8,
    warehouseLocation: 'Dry Storage',
    status: 'Active'
  }
];

// Sample users
const sampleUsers = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  {
    username: 'store1',
    password: 'store123',
    role: 'store'
  }
];

// Default settings
const defaultSettings = {
  defaultLeadTimeDays: 7,
  defaultSafetyStock: 10,
  forecastWeeks: 4,
  holidays: [
    '2026-01-14', '2026-02-04', '2026-04-13', '2026-04-14',
    '2026-05-01', '2026-05-23', '2026-06-25', '2026-07-20',
    '2026-10-31', '2026-11-14', '2026-12-25'
  ],
  promotions: []
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Settings.deleteMany({});

    // Seed Users
    console.log('Seeding users...');
    for (const userData of sampleUsers) {
      await User.create(userData);
      console.log(`  Created user: ${userData.username}`);
    }

    // Seed Products
    console.log('Seeding products...');
    for (const productData of sampleProducts) {
      await Product.create(productData);
      console.log(`  Created product: ${productData.name}`);
    }

    // Seed Settings
    console.log('Seeding settings...');
    await Settings.create(defaultSettings);
    console.log('  Created default settings');

    console.log('\n✅ Database seeded successfully!');
    console.log(`   - ${sampleUsers.length} users created`);
    console.log(`   - ${sampleProducts.length} products created`);
    console.log(`   - Default settings configured`);
    console.log('\nDefault credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Store: store1 / store123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
