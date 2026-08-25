const fs = require('fs');
const path = require('path');
require('dotenv').config();

let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
const supabaseKey = process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.trim() : '';

if (supabaseUrl && supabaseKey) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('✅ Supabase Client initialized successfully!');
  } catch (err) {
    console.log('⚠️ Could not initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase environment variables not set. Using in-memory store.');
}

const jsonDbPath = path.join(__dirname, 'database.json');

// Default / In-Memory Store Seed Data
let store = {
  users: [
    {
      id: 1,
      name: "AMKS",
      email: "amks.pk@hotmail.com",
      avatar: "/uploads/amks_logo.png",
      level: "V0",
      rating: 5.0,
      credit_score: 100,
      followers: 1420,
      balance: 205.54,
      pending_balance: 38017.34,
      total_income: 94156.54,
      today_orders: 14,
      today_sales: 5240.00,
      today_profit: 1048.00,
      visitors_today: 1350,
      visitors_7days: 9840,
      visitors_30days: 42100,
      rating_rate: 99.8,
      notice: "Dear users, please pay attention to your payment. Late payments may negatively impact the store's credit score and other aspects."
    }
  ],
  products: [
    {
      id: 101,
      title: "Foursun 1500W Portable Power Station (3000W Peak), 1598.4Wh with 2x 1500W AC Outlets, Wireless Charging, PD 65W, Solar Generator (Solar Panel Not Included) for Home Backup, Emergency, Outdoor Camping",
      spec: "",
      price: 900.38,
      stock: 100,
      sales_count: 22,
      click_count: 529,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/powerstation.png",
      category: "Power"
    },
    {
      id: 102,
      title: "SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Silver PreOrder",
      spec: "",
      price: 1285.22,
      stock: 100,
      sales_count: 18,
      click_count: 480,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/iphone_silver.png",
      category: "Phones"
    },
    {
      id: 103,
      title: "SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Cosmic Orange Pre-Order",
      spec: "",
      price: 1290.00,
      stock: 100,
      sales_count: 12,
      click_count: 450,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/iphone_orange.png",
      category: "Phones"
    },
    {
      id: 104,
      title: "SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Deep Blue Pre-Order",
      spec: "",
      price: 1320.50,
      stock: 100,
      sales_count: 10,
      click_count: 410,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/iphone_blue.png",
      category: "Phones"
    },
    {
      id: 105,
      title: "Portable Thermal Shipping Label Printer 4x6 for Small Business",
      spec: "",
      price: 142.60,
      stock: 100,
      sales_count: 35,
      click_count: 620,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/printer.png",
      category: "Office"
    },
    {
      id: 106,
      title: "Wireless Noise Cancelling Earbuds Pro with Smart Touch Control",
      spec: "",
      price: 89.99,
      stock: 100,
      sales_count: 48,
      click_count: 890,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/earbuds.png",
      category: "Audio"
    },
    {
      id: 107,
      title: "4K Ultra HD Dash Cam Front and Rear with Night Vision & WiFi",
      spec: "",
      price: 115.40,
      stock: 100,
      sales_count: 14,
      click_count: 310,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/dashcam.png",
      category: "Electronics"
    },
    {
      id: 108,
      title: "Smart Watch Ultra 2 with Titanium Case & Cellular Tracking",
      spec: "",
      price: 399.00,
      stock: 100,
      sales_count: 9,
      click_count: 396,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/apple_watch.png",
      category: "Wearables"
    },
    {
      id: 109,
      title: "SIM Free iPhone 17 Pro Max 5G 512GB AI Phone Blue Pre-Order",
      spec: "",
      price: 1238.65,
      stock: 100,
      sales_count: 4,
      click_count: 482,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/iphone_blue.png",
      category: "Phones"
    },
    {
      id: 110,
      title: "SIM Free iPhone 17 Pro Max 5G 512GB AI Phone Blue Pre-Order",
      spec: "",
      price: 1331.85,
      stock: 100,
      sales_count: 5,
      click_count: 542,
      expected_profit: 0,
      is_top10: 1,
      image_url: "/uploads/iphone_blue.png",
      category: "Phones"
    }
  ],
  orders: [
    {
      id: 1001,
      order_no: "2026082522030045253505",
      product_id: 101,
      product_title: "SAMSUNG Galaxy S22 Ultra Phone, Factory Unlocked Android Smartphone, 256GB, 8K...",
      product_image: "/uploads/powerstation.png",
      price: 860.69,
      total_cost: 731.59,
      quantity: 1,
      total_amount: 860.69,
      profit: 129.10,
      status: "To Pickup",
      shipping_address: "Šentrupert Tavcarjeva 62 Slovenia",
      phone_number: "386****005",
      timer_countdown: "08:14:48",
      created_at: "2026-08-25 00:29:28"
    },
    {
      id: 1002,
      order_no: "2026082500000000000000",
      product_id: 102,
      product_title: "SIM Free iPhone Air 5G 512GB AI Phone - Sky Blue Pre-Order",
      product_image: "/uploads/iphone_silver.png",
      price: 1141.45,
      total_cost: 970.23,
      quantity: 1,
      total_amount: 1141.45,
      profit: 171.22,
      status: "To Pickup",
      shipping_address: "SEISENEGG Wurmbrandgasse 85 Austria",
      phone_number: "430****452",
      timer_countdown: "08:12:47",
      created_at: "2026-08-24 11:40:45"
    },
    {
      id: 1003,
      order_no: "2026082488493021948201",
      product_id: 103,
      product_title: "Foursun 1500W Portable Power Station (3000W Peak), 1598.4Wh with 2x 1500W AC Outlets",
      product_image: "/uploads/powerstation.png",
      price: 900.38,
      total_cost: 765.32,
      quantity: 1,
      total_amount: 900.38,
      profit: 135.06,
      status: "To Pickup",
      shipping_address: "Kranj Cesta 1 maja 44 Slovenia",
      phone_number: "386****912",
      timer_countdown: "08:06:51",
      created_at: "2026-08-24 16:30:12"
    },
    {
      id: 1004,
      order_no: "2026082477123984019283",
      product_id: 104,
      product_title: "SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Silver PreOrder",
      product_image: "/uploads/iphone_silver.png",
      price: 1285.22,
      total_cost: 1092.44,
      quantity: 1,
      total_amount: 1285.22,
      profit: 192.78,
      status: "To Pickup",
      shipping_address: "Vienna Mariahilfer Str 12 Austria",
      phone_number: "430****881",
      timer_countdown: "07:47:01",
      created_at: "2026-08-24 14:15:00"
    }
  ],
  transactions: [
    {
      id: 1,
      user_id: 1,
      type: "recharge",
      method: "USDT",
      amount: 500.00,
      status: "approved",
      tx_hash: "0x789...abc",
      created_at: "2026-08-24 10:00:00"
    }
  ],
  messages: [
    {
      id: 1,
      sender: "admin",
      message: "Welcome to TikTok Shop Merchant Support. How can we help you today?",
      image_url: "",
      is_read: 0,
      created_at: "2026-08-24 08:00:00"
    }
  ],
  notifications: [
    {
      id: 1,
      message: "Withdrawal review notification",
      sent_time: "2026-08-24 11:14:02",
      type: "System Message",
      sender: "System",
      is_read: 0
    },
    {
      id: 2,
      message: "Recharge review notification",
      sent_time: "2026-08-24 11:13:37",
      type: "System Message",
      sender: "System",
      is_read: 0
    }
  ],
  faqs: [
    { id: 1, title: "How to process customer orders?", content: "Go to the Order tab, locate orders waiting for pickup, and tap 'Click to Pickup' to proceed with dispatch." },
    { id: 2, title: "When will my wallet earnings settle?", content: "Order profits move from Pending Balance to Available Balance once the buyer confirms delivery or within 7 business days." },
    { id: 3, title: "How do I top up my store account?", content: "Use the Recharge button on the Home tab to deposit via USDT TRC20 transfer." },
    { id: 4, title: "How to withdraw funds to my account?", content: "Tap Withdrawal on the Home tab, enter your withdrawal amount and payout details, and submit for instant review." }
  ],
  settings: {
    pickup_timer_hours: 24,
    order_timers: {}
  }
};

function saveJsonDb() {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    // Gracefully ignore on read-only environments
  }
}

async function initDb() {
  // Load persisted JSON database if it exists
  try {
    if (fs.existsSync(jsonDbPath)) {
      const raw = fs.readFileSync(jsonDbPath, 'utf8');
      const saved = JSON.parse(raw);
      // Merge saved data into store (don't replace entire store to keep defaults)
      if (saved.users && saved.users.length > 0) store.users = saved.users;
      if (saved.products && saved.products.length > 0) store.products = saved.products;
      if (saved.orders && saved.orders.length > 0) store.orders = saved.orders;
      if (saved.transactions) store.transactions = saved.transactions;
      if (saved.messages) store.messages = saved.messages;
      if (saved.notifications) store.notifications = saved.notifications;
      if (saved.faqs && saved.faqs.length > 0) store.faqs = saved.faqs;
      if (saved.settings) store.settings = Object.assign({ pickup_timer_hours: 24, order_timers: {} }, saved.settings);
    }
  } catch (err) {
    console.log('Could not load database.json, using in-memory defaults:', err.message);
  }
  // Ensure settings always exists
  if (!store.settings) store.settings = { pickup_timer_hours: 24, order_timers: {} };
  if (typeof store.settings.pickup_timer_hours !== 'number') store.settings.pickup_timer_hours = 24;
  if (!store.settings.order_timers || typeof store.settings.order_timers !== 'object') store.settings.order_timers = {};
  return true;
}

// User & Store Balances
async function getUser() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', 1).single();
      if (!error && data) {
        Object.assign(store.users[0], data);
        return data;
      }
    } catch (e) {
      console.error('Supabase getUser error:', e.message);
    }
  }
  return store.users[0];
}

async function updateUser(fields) {
  Object.assign(store.users[0], fields);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').update(fields).eq('id', 1).select().single();
      if (!error && data) {
        Object.assign(store.users[0], data);
        return data;
      }
    } catch (e) {
      console.error('Supabase updateUser error:', e.message);
    }
  }
  return store.users[0];
}

// Products
async function getProducts() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*').order('is_top10', { ascending: false }).order('id', { ascending: true });
      if (!error && data && data.length > 0) {
        store.products = data;
        return data;
      }
    } catch (e) {
      console.error('Supabase getProducts error:', e.message);
    }
  }
  return store.products;
}

async function getProductById(id) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch (e) {}
  }
  return store.products.find(p => p.id == id);
}

async function updateProduct(id, fields) {
  const p = store.products.find(x => x.id == id);
  if (p) Object.assign(p, fields);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').update(fields).eq('id', id).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase updateProduct error:', e.message);
    }
  }
  return p;
}

async function createProduct(prod) {
  prod.id = prod.id || Date.now();
  store.products.push(prod);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').insert([prod]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase createProduct error:', e.message);
    }
  }
  return prod;
}

// Orders
async function getOrders(statusFilter) {
  if (supabase) {
    try {
      let query = supabase.from('orders').select('*').order('id', { ascending: false });
      if (statusFilter && statusFilter !== 'All') {
        query = query.ilike('status', statusFilter);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.error('Supabase getOrders error:', e.message);
    }
  }

  if (!statusFilter || statusFilter === 'All') return store.orders;
  return store.orders.filter(o => o.status.toLowerCase() === statusFilter.toLowerCase());
}

async function createOrder(orderData) {
  const newId = orderData.id || Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const order_no = orderData.order_no || `ORD-${dateStr}-${randomSuffix}`;
  const d = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const price = parseFloat(orderData.price) || 0;
  const quantity = parseInt(orderData.quantity) || 1;
  const total_amount = parseFloat(orderData.total_amount) || (price * quantity);
  const profit = parseFloat(orderData.profit) || (total_amount * 0.15);

  const order = {
    id: newId,
    order_no: order_no,
    product_id: orderData.product_id || 101,
    product_title: orderData.product_title || 'New Product Order',
    product_image: orderData.product_image || '/uploads/powerstation.png',
    price: price,
    quantity: quantity,
    total_amount: total_amount,
    profit: profit,
    status: orderData.status || 'To Pickup',
    created_at: orderData.created_at || timestamp
  };

  store.orders.unshift(order);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('orders').insert([order]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase createOrder error:', e.message);
    }
  }
  return order;
}

async function deleteOrder(orderId) {
  const idx = store.orders.findIndex(x => x.id == orderId);
  if (idx !== -1) {
    store.orders.splice(idx, 1);
    saveJsonDb();
  }

  if (supabase) {
    try {
      await supabase.from('orders').delete().eq('id', orderId);
    } catch (e) {
      console.error('Supabase deleteOrder error:', e.message);
    }
  }
  return true;
}

async function updateOrderStatus(orderId, status) {
  const o = store.orders.find(x => x.id == orderId);
  if (o) o.status = status;
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase updateOrderStatus error:', e.message);
    }
  }
  return o || { id: orderId, status };
}

async function updateOrderFields(orderId, fields) {
  const o = store.orders.find(x => x.id == orderId);
  if (o) Object.assign(o, fields);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('orders').update(fields).eq('id', orderId).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase updateOrderFields error:', e.message);
    }
  }
  return o || { id: orderId, ...fields };
}


// Transactions
async function getTransactions() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('id', { ascending: false });
      if (!error && data) {
        store.transactions = data;
        return data;
      }
    } catch (e) {
      console.error('Supabase getTransactions error:', e.message);
    }
  }
  return store.transactions;
}

async function createTransaction(tx) {
  tx.id = tx.id || Date.now();
  tx.created_at = tx.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19);
  tx.status = tx.status || 'pending';

  store.transactions.unshift(tx);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('transactions').insert([tx]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase createTransaction error:', e.message);
    }
  }
  return tx;
}

async function updateTransactionStatus(txId, status) {
  let tx = store.transactions.find(t => t.id == txId);
  if (tx) {
    tx.status = status;
    if (status === 'approved') {
      const user = store.users[0];
      if (tx.type === 'recharge') {
        user.balance += parseFloat(tx.amount);
        user.total_income += parseFloat(tx.amount);
      } else if (tx.type === 'withdrawal') {
        user.balance = Math.max(0, user.balance - parseFloat(tx.amount));
      }
    }
    saveJsonDb();
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('transactions').update({ status }).eq('id', txId).select().single();
      if (!error && data) {
        tx = data;
        if (status === 'approved') {
          const user = await getUser();
          let newBal = user.balance;
          let newInc = user.total_income;
          if (tx.type === 'recharge') {
            newBal += parseFloat(tx.amount);
            newInc += parseFloat(tx.amount);
          } else if (tx.type === 'withdrawal') {
            newBal = Math.max(0, newBal - parseFloat(tx.amount));
          }
          await updateUser({ balance: newBal, total_income: newInc });
        }
        return tx;
      }
    } catch (e) {
      console.error('Supabase updateTransactionStatus error:', e.message);
    }
  }
  return tx;
}

// Messages / Chat
async function getMessages() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('messages').select('*').order('id', { ascending: true });
      if (!error && data) {
        store.messages = data;
        return data;
      }
    } catch (e) {
      console.error('Supabase getMessages error:', e.message);
    }
  }
  return store.messages;
}

async function createMessage(msg) {
  msg.id = msg.id || Date.now();
  msg.created_at = msg.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19);

  store.messages.push(msg);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('messages').insert([msg]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase createMessage error:', e.message);
    }
  }
  return msg;
}

async function clearMessages() {
  store.messages = [];
  saveJsonDb();

  if (supabase) {
    try {
      await supabase.from('messages').delete().neq('id', 0);
    } catch (e) {
      console.error('Supabase clearMessages error:', e.message);
    }
  }
  return [];
}

// Notifications
async function getNotifications(filter) {
  if (supabase) {
    try {
      let query = supabase.from('notifications').select('*').order('id', { ascending: false });
      if (filter === 'Read') query = query.eq('is_read', 1);
      if (filter === 'Unread') query = query.eq('is_read', 0);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase getNotifications error:', e.message);
    }
  }

  let list = store.notifications || [];
  if (filter === 'Read') list = list.filter(n => n.is_read === 1);
  if (filter === 'Unread') list = list.filter(n => n.is_read === 0);
  return list;
}

async function createNotification(n) {
  const newId = Date.now();
  const d = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const notif = {
    id: newId,
    message: n.message || 'System Notification',
    sent_time: n.sent_time || timestamp,
    type: n.type || 'System Message',
    sender: n.sender || 'System',
    is_read: 0
  };

  if (!store.notifications) store.notifications = [];
  store.notifications.unshift(notif);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('notifications').insert([notif]).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase createNotification error:', e.message);
    }
  }
  return notif;
}

async function markNotificationsRead() {
  if (store.notifications) {
    store.notifications.forEach(n => n.is_read = 1);
    saveJsonDb();
  }

  if (supabase) {
    try {
      await supabase.from('notifications').update({ is_read: 1 }).eq('is_read', 0);
    } catch (e) {
      console.error('Supabase markNotificationsRead error:', e.message);
    }
  }
  return true;
}

// FAQs
async function getFaqs() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('faqs').select('*').order('id', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  return store.faqs;
}

// Settings
async function getSettings() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (!error && data) {
        Object.assign(store.settings, data);
        return data;
      }
    } catch (e) {
      // Supabase settings table may not exist, fall through to local store
    }
  }
  return store.settings;
}

async function updateSettings(fields) {
  Object.assign(store.settings, fields);
  saveJsonDb();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('settings').update(fields).eq('id', 1).select().single();
      if (!error && data) {
        Object.assign(store.settings, data);
        return data;
      }
    } catch (e) {
      // Fall through to local store result
    }
  }
  return store.settings;
}

module.exports = {
  initDb,
  getUser,
  updateUser,
  getProducts,
  getProductById,
  updateProduct,
  createProduct,
  getOrders,
  createOrder,
  updateOrderStatus,
  updateOrderFields,
  deleteOrder,
  getTransactions,
  createTransaction,
  updateTransactionStatus,
  getMessages,
  createMessage,
  clearMessages,
  getFaqs,
  getNotifications,
  createNotification,
  markNotificationsRead,
  getSettings,
  updateSettings
};
