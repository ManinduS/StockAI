/**
 * Seed script - Replaces all products & sales with user's test data
 * Run with: node src/seed-test-data.js
 */

require('dotenv').config();
const { connectDB } = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const ReorderPlan = require('./models/ReorderPlan');
const ReorderPlanItem = require('./models/ReorderPlanItem');

const testProducts = [
  { sku:'29-205-1132', name:'Sushi Rice', category:'Grains & Pulses', price:1440, cost:1008, currentStock:22, reorderPoint:72, reorderQuantity:142, unit:'pcs', supplier:'Jaxnation', leadTimeDays:3, safetyStock:10 },
  { sku:'40-681-9981', name:'Arabica Coffee', category:'Beverages', price:6400, cost:4480, currentStock:45, reorderPoint:77, reorderQuantity:79, unit:'pcs', supplier:'Feedmix', leadTimeDays:2, safetyStock:10 },
  { sku:'06-955-3428', name:'Black Rice', category:'Grains & Pulses', price:1920, cost:1344, currentStock:30, reorderPoint:38, reorderQuantity:121, unit:'pcs', supplier:'Vinder', leadTimeDays:3, safetyStock:10 },
  { sku:'71-594-6552', name:'Long Grain Rice', category:'Grains & Pulses', price:480, cost:336, currentStock:12, reorderPoint:59, reorderQuantity:121, unit:'pcs', supplier:'Brightbean', leadTimeDays:1, safetyStock:10 },
  { sku:'57-437-1828', name:'Plum', category:'Fruits & Vegetables', price:1280, cost:896, currentStock:37, reorderPoint:30, reorderQuantity:104, unit:'pcs', supplier:'Topicstorm', leadTimeDays:6, safetyStock:10 },
  { sku:'21-120-6238', name:'All-Purpose Flour', category:'Grains & Pulses', price:560, cost:392, currentStock:55, reorderPoint:33, reorderQuantity:47, unit:'pcs', supplier:'Dabjam', leadTimeDays:2, safetyStock:10 },
  { sku:'71-516-1996', name:'Corn Oil', category:'Oils & Fats', price:800, cost:560, currentStock:96, reorderPoint:52, reorderQuantity:68, unit:'pcs', supplier:'Tagfeed', leadTimeDays:6, safetyStock:10 },
  { sku:'39-629-5554', name:'Egg (Goose)', category:'Dairy', price:800, cost:560, currentStock:44, reorderPoint:90, reorderQuantity:107, unit:'pcs', supplier:'Muxo', leadTimeDays:1, safetyStock:10 },
  { sku:'66-268-8345', name:'Greek Yogurt', category:'Dairy', price:960, cost:672, currentStock:91, reorderPoint:84, reorderQuantity:95, unit:'pcs', supplier:'Thoughtstorm', leadTimeDays:6, safetyStock:10 },
  { sku:'46-452-9419', name:'Egg (Duck)', category:'Dairy', price:320, cost:224, currentStock:43, reorderPoint:10, reorderQuantity:25, unit:'pcs', supplier:'Wordify', leadTimeDays:1, safetyStock:10 },
  { sku:'51-469-4611', name:'Long Grain Rice', category:'Grains & Pulses', price:512, cost:358, currentStock:62, reorderPoint:81, reorderQuantity:172, unit:'pcs', supplier:'Fivebridge', leadTimeDays:7, safetyStock:10 },
  { sku:'42-220-9305', name:'White Sugar', category:'Grains & Pulses', price:640, cost:448, currentStock:91, reorderPoint:98, reorderQuantity:104, unit:'pcs', supplier:'Zooxo', leadTimeDays:5, safetyStock:10 },
  { sku:'75-094-1179', name:'Rye Bread', category:'Bakery', price:960, cost:672, currentStock:26, reorderPoint:79, reorderQuantity:110, unit:'pcs', supplier:'Vitz', leadTimeDays:7, safetyStock:10 },
  { sku:'11-073-0189', name:'Plum', category:'Fruits & Vegetables', price:1280, cost:896, currentStock:95, reorderPoint:50, reorderQuantity:126, unit:'pcs', supplier:'Voomm', leadTimeDays:7, safetyStock:10 },
  { sku:'22-621-2774', name:'Strawberries', category:'Fruits & Vegetables', price:1920, cost:1344, currentStock:54, reorderPoint:26, reorderQuantity:42, unit:'pcs', supplier:'Babblestorm', leadTimeDays:7, safetyStock:10 },
  { sku:'39-449-0772', name:'Feta Cheese', category:'Dairy', price:2240, cost:1568, currentStock:94, reorderPoint:13, reorderQuantity:28, unit:'pcs', supplier:'Youfeed', leadTimeDays:6, safetyStock:10 },
  { sku:'55-936-2406', name:'Bread Flour', category:'Grains & Pulses', price:480, cost:336, currentStock:27, reorderPoint:93, reorderQuantity:181, unit:'pcs', supplier:'Mynte', leadTimeDays:2, safetyStock:10 },
  { sku:'82-041-7211', name:'Swiss Cheese', category:'Dairy', price:2560, cost:1792, currentStock:49, reorderPoint:49, reorderQuantity:75, unit:'pcs', supplier:'Reallinks', leadTimeDays:1, safetyStock:10 },
  { sku:'48-414-6162', name:'Arabica Coffee', category:'Beverages', price:6400, cost:4480, currentStock:55, reorderPoint:93, reorderQuantity:177, unit:'pcs', supplier:'Skivee', leadTimeDays:1, safetyStock:10 },
  { sku:'76-854-0095', name:'White Sugar', category:'Grains & Pulses', price:640, cost:448, currentStock:65, reorderPoint:61, reorderQuantity:143, unit:'pcs', supplier:'Mydeo', leadTimeDays:1, safetyStock:10 },
  { sku:'25-349-7974', name:'Spinach', category:'Fruits & Vegetables', price:800, cost:560, currentStock:72, reorderPoint:70, reorderQuantity:169, unit:'pcs', supplier:'Devshare', leadTimeDays:5, safetyStock:10 },
  { sku:'66-627-9752', name:'Trout', category:'Seafood', price:3840, cost:2688, currentStock:49, reorderPoint:73, reorderQuantity:121, unit:'pcs', supplier:'Jabbertype', leadTimeDays:4, safetyStock:10 },
  { sku:'78-614-4402', name:'Green Beans', category:'Fruits & Vegetables', price:640, cost:448, currentStock:81, reorderPoint:99, reorderQuantity:127, unit:'pcs', supplier:'Gigazoom', leadTimeDays:3, safetyStock:10 },
  { sku:'67-025-1245', name:'Cabbage', category:'Fruits & Vegetables', price:320, cost:224, currentStock:88, reorderPoint:46, reorderQuantity:101, unit:'pcs', supplier:'Chatterbridge', leadTimeDays:4, safetyStock:10 },
  { sku:'68-418-6724', name:'Parmesan Cheese', category:'Dairy', price:3840, cost:2688, currentStock:63, reorderPoint:4, reorderQuantity:89, unit:'pcs', supplier:'Feedspan', leadTimeDays:1, safetyStock:10 },
  { sku:'40-795-0753', name:'Raw Sugar', category:'Grains & Pulses', price:480, cost:336, currentStock:31, reorderPoint:43, reorderQuantity:123, unit:'pcs', supplier:'Mydo', leadTimeDays:4, safetyStock:10 },
  { sku:'02-508-3777', name:'Egg (Quail)', category:'Dairy', price:256, cost:179, currentStock:97, reorderPoint:88, reorderQuantity:169, unit:'pcs', supplier:'Realpoint', leadTimeDays:7, safetyStock:10 },
  { sku:'79-741-0770', name:'Mushrooms', category:'Fruits & Vegetables', price:1920, cost:1344, currentStock:72, reorderPoint:87, reorderQuantity:126, unit:'pcs', supplier:'Photospace', leadTimeDays:4, safetyStock:10 },
  { sku:'31-211-5803', name:'Oatmeal Biscuit', category:'Bakery', price:1600, cost:1120, currentStock:16, reorderPoint:9, reorderQuantity:41, unit:'pcs', supplier:'Gigazoom', leadTimeDays:7, safetyStock:10 },
  { sku:'16-499-5059', name:'Pear', category:'Fruits & Vegetables', price:1440, cost:1008, currentStock:77, reorderPoint:20, reorderQuantity:25, unit:'pcs', supplier:'Centizu', leadTimeDays:7, safetyStock:10 },
  { sku:'76-340-4432', name:'Cucumber', category:'Fruits & Vegetables', price:560, cost:392, currentStock:19, reorderPoint:36, reorderQuantity:108, unit:'pcs', supplier:'Brainverse', leadTimeDays:7, safetyStock:10 },
  { sku:'38-732-7667', name:'Pineapple', category:'Fruits & Vegetables', price:1120, cost:784, currentStock:18, reorderPoint:52, reorderQuantity:74, unit:'pcs', supplier:'Photojam', leadTimeDays:5, safetyStock:10 },
  { sku:'04-240-2226', name:'Olive Oil', category:'Oils & Fats', price:1920, cost:1344, currentStock:47, reorderPoint:48, reorderQuantity:121, unit:'pcs', supplier:'Kamba', leadTimeDays:7, safetyStock:10 },
  { sku:'79-136-9840', name:'Herbal Tea', category:'Beverages', price:9600, cost:6720, currentStock:77, reorderPoint:45, reorderQuantity:120, unit:'pcs', supplier:'Pixonyx', leadTimeDays:3, safetyStock:10 },
  { sku:'73-401-5721', name:'Haddock', category:'Seafood', price:2880, cost:2016, currentStock:46, reorderPoint:28, reorderQuantity:101, unit:'pcs', supplier:'Midel', leadTimeDays:4, safetyStock:10 },
  { sku:'91-848-0606', name:'Onion', category:'Fruits & Vegetables', price:640, cost:448, currentStock:39, reorderPoint:22, reorderQuantity:95, unit:'pcs', supplier:'Skyble', leadTimeDays:1, safetyStock:10 },
  { sku:'54-109-8062', name:'Sushi Rice', category:'Grains & Pulses', price:1440, cost:1008, currentStock:75, reorderPoint:69, reorderQuantity:169, unit:'pcs', supplier:'Linklinks', leadTimeDays:1, safetyStock:10 },
  { sku:'70-612-2531', name:'Pineapple', category:'Fruits & Vegetables', price:1104, cost:773, currentStock:48, reorderPoint:48, reorderQuantity:87, unit:'pcs', supplier:'Flipbug', leadTimeDays:2, safetyStock:10 },
  { sku:'26-161-6692', name:'Zucchini', category:'Fruits & Vegetables', price:800, cost:560, currentStock:61, reorderPoint:90, reorderQuantity:116, unit:'pcs', supplier:'Kare', leadTimeDays:6, safetyStock:10 },
  { sku:'43-893-5408', name:'Short Grain Rice', category:'Grains & Pulses', price:960, cost:672, currentStock:60, reorderPoint:90, reorderQuantity:175, unit:'pcs', supplier:'Snaptags', leadTimeDays:7, safetyStock:10 },
  { sku:'11-316-8405', name:'Mango', category:'Fruits & Vegetables', price:1600, cost:1120, currentStock:24, reorderPoint:55, reorderQuantity:106, unit:'pcs', supplier:'Twitternation', leadTimeDays:1, safetyStock:10 },
  { sku:'34-086-3222', name:'Lemon', category:'Fruits & Vegetables', price:736, cost:515, currentStock:12, reorderPoint:7, reorderQuantity:55, unit:'pcs', supplier:'Layo', leadTimeDays:5, safetyStock:10 },
  { sku:'21-816-1004', name:'Black Coffee', category:'Beverages', price:4800, cost:3360, currentStock:84, reorderPoint:13, reorderQuantity:101, unit:'pcs', supplier:'Realpoint', leadTimeDays:4, safetyStock:10 },
  { sku:'43-693-2092', name:'Butter', category:'Dairy', price:960, cost:672, currentStock:51, reorderPoint:100, reorderQuantity:170, unit:'pcs', supplier:'Kayveo', leadTimeDays:1, safetyStock:10 },
  { sku:'63-270-7076', name:'Multigrain Bread', category:'Bakery', price:1120, cost:784, currentStock:65, reorderPoint:36, reorderQuantity:73, unit:'pcs', supplier:'Roombo', leadTimeDays:1, safetyStock:10 },
  { sku:'90-230-9767', name:'Long Grain Rice', category:'Grains & Pulses', price:480, cost:336, currentStock:67, reorderPoint:88, reorderQuantity:120, unit:'pcs', supplier:'Voonyx', leadTimeDays:5, safetyStock:10 },
  { sku:'05-334-2923', name:'Bread Flour', category:'Grains & Pulses', price:480, cost:336, currentStock:14, reorderPoint:74, reorderQuantity:145, unit:'pcs', supplier:'Browsezoom', leadTimeDays:7, safetyStock:10 },
  { sku:'52-481-5224', name:'Kiwi', category:'Fruits & Vegetables', price:1920, cost:1344, currentStock:45, reorderPoint:24, reorderQuantity:85, unit:'pcs', supplier:'Fiveclub', leadTimeDays:1, safetyStock:10 },
  { sku:'11-325-7396', name:'Mango', category:'Fruits & Vegetables', price:1600, cost:1120, currentStock:92, reorderPoint:46, reorderQuantity:59, unit:'pcs', supplier:'Skipfire', leadTimeDays:3, safetyStock:10 },
  { sku:'70-854-6891', name:'Sourdough Bread', category:'Bakery', price:1280, cost:896, currentStock:41, reorderPoint:84, reorderQuantity:174, unit:'pcs', supplier:'Flashspan', leadTimeDays:6, safetyStock:10 },
];

// Sales data - maps sku → [{ quantity, price, date }]
const testSales = [
  { sku:'29-205-1132', quantity:5, price:1440, date:'2025-01-02' },
  { sku:'40-681-9981', quantity:2, price:6400, date:'2025-01-03' },
  { sku:'06-955-3428', quantity:4, price:1920, date:'2025-01-04' },
  { sku:'71-594-6552', quantity:6, price:480, date:'2025-01-05' },
  { sku:'57-437-1828', quantity:3, price:1280, date:'2025-01-06' },
  { sku:'21-120-6238', quantity:8, price:560, date:'2025-01-07' },
  { sku:'71-516-1996', quantity:2, price:800, date:'2025-01-08' },
  { sku:'39-629-5554', quantity:6, price:800, date:'2025-01-09' },
  { sku:'66-268-8345', quantity:3, price:960, date:'2025-01-10' },
  { sku:'46-452-9419', quantity:9, price:320, date:'2025-01-11' },
  { sku:'29-205-1132', quantity:4, price:1440, date:'2025-01-12' },
  { sku:'40-681-9981', quantity:3, price:6400, date:'2025-01-13' },
  { sku:'06-955-3428', quantity:2, price:1920, date:'2025-01-14' },
  { sku:'71-594-6552', quantity:7, price:480, date:'2025-01-15' },
  { sku:'57-437-1828', quantity:5, price:1280, date:'2025-01-16' },
  { sku:'21-120-6238', quantity:4, price:560, date:'2025-01-17' },
  { sku:'71-516-1996', quantity:6, price:800, date:'2025-01-18' },
  { sku:'39-629-5554', quantity:5, price:800, date:'2025-01-19' },
  { sku:'66-268-8345', quantity:2, price:960, date:'2025-01-20' },
  { sku:'46-452-9419', quantity:7, price:320, date:'2025-01-21' },
  { sku:'29-205-1132', quantity:6, price:1440, date:'2025-01-22' },
  { sku:'40-681-9981', quantity:1, price:6400, date:'2025-01-23' },
  { sku:'06-955-3428', quantity:3, price:1920, date:'2025-01-24' },
  { sku:'71-594-6552', quantity:8, price:480, date:'2025-01-25' },
  { sku:'57-437-1828', quantity:4, price:1280, date:'2025-01-26' },
  { sku:'21-120-6238', quantity:6, price:560, date:'2025-01-27' },
  { sku:'71-516-1996', quantity:3, price:800, date:'2025-01-28' },
  { sku:'39-629-5554', quantity:7, price:800, date:'2025-01-29' },
  { sku:'66-268-8345', quantity:5, price:960, date:'2025-01-30' },
  { sku:'46-452-9419', quantity:8, price:320, date:'2025-01-31' },
  { sku:'29-205-1132', quantity:2, price:1440, date:'2025-02-01' },
  { sku:'40-681-9981', quantity:4, price:6400, date:'2025-02-02' },
  { sku:'06-955-3428', quantity:6, price:1920, date:'2025-02-03' },
  { sku:'71-594-6552', quantity:5, price:480, date:'2025-02-04' },
  { sku:'57-437-1828', quantity:7, price:1280, date:'2025-02-05' },
  { sku:'21-120-6238', quantity:4, price:560, date:'2025-02-06' },
  { sku:'71-516-1996', quantity:3, price:800, date:'2025-02-07' },
  { sku:'39-629-5554', quantity:6, price:800, date:'2025-02-08' },
  { sku:'66-268-8345', quantity:5, price:960, date:'2025-02-09' },
  { sku:'46-452-9419', quantity:9, price:320, date:'2025-02-10' },
  { sku:'29-205-1132', quantity:4, price:1440, date:'2025-02-11' },
  { sku:'40-681-9981', quantity:2, price:6400, date:'2025-02-12' },
  { sku:'06-955-3428', quantity:5, price:1920, date:'2025-02-13' },
  { sku:'71-594-6552', quantity:7, price:480, date:'2025-02-14' },
  { sku:'57-437-1828', quantity:3, price:1280, date:'2025-02-15' },
  { sku:'21-120-6238', quantity:6, price:560, date:'2025-02-16' },
  { sku:'71-516-1996', quantity:4, price:800, date:'2025-02-17' },
  { sku:'39-629-5554', quantity:8, price:800, date:'2025-02-18' },
  { sku:'66-268-8345', quantity:3, price:960, date:'2025-02-19' },
  { sku:'46-452-9419', quantity:6, price:320, date:'2025-02-20' },
  { sku:'29-205-1132', quantity:7, price:1440, date:'2025-02-21' },
  { sku:'40-681-9981', quantity:3, price:6400, date:'2025-02-22' },
  { sku:'06-955-3428', quantity:4, price:1920, date:'2025-02-23' },
  { sku:'71-594-6552', quantity:5, price:480, date:'2025-02-24' },
  { sku:'57-437-1828', quantity:6, price:1280, date:'2025-02-25' },
  { sku:'21-120-6238', quantity:2, price:560, date:'2025-02-26' },
  { sku:'71-516-1996', quantity:7, price:800, date:'2025-02-27' },
  { sku:'39-629-5554', quantity:4, price:800, date:'2025-02-28' },
  { sku:'66-268-8345', quantity:3, price:960, date:'2025-03-01' },
  { sku:'46-452-9419', quantity:8, price:320, date:'2025-03-02' },
  { sku:'29-205-1132', quantity:5, price:1440, date:'2025-03-03' },
  { sku:'40-681-9981', quantity:2, price:6400, date:'2025-03-04' },
  { sku:'06-955-3428', quantity:6, price:1920, date:'2025-03-05' },
  { sku:'71-594-6552', quantity:4, price:480, date:'2025-03-06' },
  { sku:'57-437-1828', quantity:3, price:1280, date:'2025-03-07' },
  { sku:'21-120-6238', quantity:7, price:560, date:'2025-03-08' },
  { sku:'71-516-1996', quantity:5, price:800, date:'2025-03-09' },
  { sku:'39-629-5554', quantity:6, price:800, date:'2025-03-10' },
  { sku:'66-268-8345', quantity:4, price:960, date:'2025-03-11' },
  { sku:'46-452-9419', quantity:9, price:320, date:'2025-03-12' },
  { sku:'29-205-1132', quantity:3, price:1440, date:'2025-03-13' },
  { sku:'40-681-9981', quantity:2, price:6400, date:'2025-03-14' },
  { sku:'06-955-3428', quantity:5, price:1920, date:'2025-03-15' },
  { sku:'71-594-6552', quantity:6, price:480, date:'2025-03-16' },
  { sku:'57-437-1828', quantity:7, price:1280, date:'2025-03-17' },
  { sku:'21-120-6238', quantity:3, price:560, date:'2025-03-18' },
  { sku:'71-516-1996', quantity:4, price:800, date:'2025-03-19' },
  { sku:'39-629-5554', quantity:5, price:800, date:'2025-03-20' },
  { sku:'66-268-8345', quantity:6, price:960, date:'2025-03-21' },
  { sku:'46-452-9419', quantity:7, price:320, date:'2025-03-22' },
  { sku:'29-205-1132', quantity:4, price:1440, date:'2025-03-23' },
  { sku:'40-681-9981', quantity:3, price:6400, date:'2025-03-24' },
  { sku:'06-955-3428', quantity:5, price:1920, date:'2025-03-25' },
  { sku:'71-594-6552', quantity:6, price:480, date:'2025-03-26' },
  { sku:'57-437-1828', quantity:4, price:1280, date:'2025-03-27' },
  { sku:'21-120-6238', quantity:7, price:560, date:'2025-03-28' },
  { sku:'71-516-1996', quantity:3, price:800, date:'2025-03-29' },
  { sku:'39-629-5554', quantity:5, price:800, date:'2025-03-30' },
  { sku:'66-268-8345', quantity:4, price:960, date:'2025-03-31' },
];

async function seedTestData() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    // Clear existing products, sales, reorder plans
    console.log('Clearing existing products, sales, and reorder data...');
    await ReorderPlanItem.deleteMany({});
    await ReorderPlan.deleteMany({});
    await Sale.deleteMany({});
    await Product.deleteMany({});

    // Ensure admin user exists
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({ username: 'admin', password: 'admin123', role: 'admin' });
      console.log('  Created admin user');
    }

    // Seed Products
    console.log('Seeding products...');
    const productMap = {};
    for (const p of testProducts) {
      const product = await Product.create({
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: p.price,
        currentStock: p.currentStock,
        reorderPoint: p.reorderPoint,
        reorderQuantity: p.reorderQuantity,
        leadTimeDays: p.leadTimeDays,
        safetyStock: p.safetyStock,
        warehouseLocation: 'Main Warehouse',
        status: 'Active'
      });
      productMap[p.sku] = product._id;
      console.log(`  Created: ${p.sku} - ${p.name} (stock: ${p.currentStock}, lead: ${p.leadTimeDays}d)`);
    }

    // Seed Sales
    console.log('Seeding sales...');
    let salesCreated = 0;
    for (const s of testSales) {
      const productId = productMap[s.sku];
      if (!productId) {
        console.log(`  SKIP: Product ${s.sku} not found`);
        continue;
      }
      await Sale.create({
        product: productId,
        quantity: s.quantity,
        unitPrice: s.price,
        totalAmount: s.quantity * s.price,
        saleType: 'sale',
        saleDate: new Date(s.date),
        recordedBy: adminUser._id,
        notes: 'Seeded test data'
      });
      salesCreated++;
    }

    console.log(`\n✅ Test data seeded successfully!`);
    console.log(`   - ${testProducts.length} products created`);
    console.log(`   - ${salesCreated} sales records created`);
    console.log(`\nYou can now train the ML model from the Admin panel.`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedTestData();
