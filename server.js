const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');

const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// 1. User & Store Stats
app.get('/api/user', async (req, res) => {
  try {
    const user = await db.getUser();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/user', async (req, res) => {
  try {
    const updated = await db.updateUser(req.body);
    io.emit('user_updated', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Products
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const prod = await db.createProduct(req.body);
    io.emit('products_updated', prod);
    res.json({ success: true, data: prod });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const prod = await db.updateProduct(req.params.id, req.body);
    io.emit('products_updated', prod);
    res.json({ success: true, data: prod });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await db.deleteProduct(req.params.id);
    io.emit('products_updated', result);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// File Upload endpoint for product images and receipts
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Orders
app.get('/api/orders', async (req, res) => {
  try {
    const status = req.query.status;
    const orders = await db.getOrders(status);
    
    // Calculate pipeline badge counts
    const allOrders = await db.getOrders('All');
    const counts = {
      'To pay': allOrders.filter(o => o.status === 'To pay').length,
      'To Pickup': allOrders.filter(o => o.status === 'To Pickup').length,
      'Shipped': allOrders.filter(o => o.status === 'Shipped').length,
      'Received': allOrders.filter(o => o.status === 'Received').length,
      'Completed': allOrders.filter(o => o.status === 'Completed').length
    };

    res.json({ success: true, data: orders, counts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = await db.createOrder(req.body);
    io.emit('orders_updated', order);
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await db.updateOrderStatus(req.params.id, status);
    io.emit('orders_updated', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await db.deleteOrder(req.params.id);
    io.emit('orders_updated');
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id/timer', async (req, res) => {
  try {
    const { timer_hours } = req.body;
    const hours = parseFloat(timer_hours);
    if (isNaN(hours) || hours < 0.1) {
      return res.status(400).json({ success: false, error: 'Invalid timer_hours value' });
    }
    // Store in settings.order_timers so it persists independently of the orders table
    const currentSettings = await db.getSettings();
    const orderTimers = Object.assign({}, currentSettings.order_timers || {});
    orderTimers[String(req.params.id)] = hours;
    const updated = await db.updateSettings({ order_timers: orderTimers });
    io.emit('settings_updated', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image uploaded' });
  }
  res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
});

// 4. Transactions (Recharge & Withdrawal)
app.get('/api/transactions', async (req, res) => {
  try {
    const list = await db.getTransactions();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/recharge', upload.single('receipt'), async (req, res) => {
  try {
    const { method, amount, tx_hash } = req.body;
    const receipt_image = req.file ? `/uploads/${req.file.filename}` : '';
    
    const tx = await db.createTransaction({
      type: 'recharge',
      method: method || 'USDT',
      amount: parseFloat(amount),
      tx_hash: tx_hash || '',
      receipt_image
    });

    res.json({ success: true, data: tx, message: 'Recharge request submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/withdrawal', async (req, res) => {
  try {
    const { method, amount, full_name, bank_name, iban } = req.body;
    const user = await db.getUser();
    const withdrawAmount = parseFloat(amount);
    
    if (withdrawAmount > user.balance) {
      return res.status(400).json({ success: false, error: 'Insufficient Balance!' });
    }

    // Deduct requested amount from user balance
    const newBalance = Math.max(0, user.balance - withdrawAmount);
    const updatedUser = await db.updateUser({ balance: newBalance });
    io.emit('user_updated', updatedUser);

    const tx = await db.createTransaction({
      type: 'withdrawal',
      method: method || 'Bank Card',
      amount: withdrawAmount,
      full_name: full_name || '',
      bank_name: bank_name || '',
      iban: iban || ''
    });

    res.json({ success: true, data: tx, message: 'Withdrawal request has been submitted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/transactions/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.updateTransactionStatus(req.params.id, status);
    
    // Broadcast updated user info over sockets
    const updatedUser = await db.getUser();
    io.emit('user_updated', updatedUser);

    // Build notification message matching screenshot format (e.g. "Withdrawal review notification" / "Recharge review notification")
    const txType = (result && result.type) ? (result.type.charAt(0).toUpperCase() + result.type.slice(1)) : 'Transaction';
    const notifMessage = `${txType} review notification`;

    const notif = await db.createNotification({
      message: notifMessage,
      type: 'System Message',
      sender: 'System'
    });

    // Broadcast new notification over socket to user homepage notification center
    io.emit('new_notification', notif);

    res.json({ success: true, data: result, notification: notif });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. FAQs
app.get('/api/faqs', async (req, res) => {
  try {
    const faqs = await db.getFaqs();
    res.json({ success: true, data: faqs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Messages / Chat
app.get('/api/messages', async (req, res) => {
  try {
    const msgs = await db.getMessages();
    res.json({ success: true, data: msgs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { sender, message, image_url } = req.body;
    const newMsg = await db.createMessage({
      sender: sender || 'client',
      message: message || '',
      image_url: image_url || ''
    });
    if (io) {
      io.to('chat_room').emit('receive_message', newMsg);
    }
    res.json({ success: true, data: newMsg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/messages', async (req, res) => {
  try {
    await db.clearMessages();
    if (io) io.emit('messages_cleared', []);
    res.json({ success: true, data: [], message: 'All chat messages deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/messages/clear', async (req, res) => {
  try {
    await db.clearMessages();
    if (io) io.emit('messages_cleared', []);
    res.json({ success: true, data: [], message: 'All chat messages deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/upload-chat-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// 7. Notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const filter = req.query.filter;
    const list = await db.getNotifications(filter);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const notif = await db.createNotification(req.body);
    if (io) io.emit('new_notification', notif);
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/notifications/read', async (req, res) => {
  try {
    await db.markNotificationsRead();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    io.emit('settings_updated', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Admin Authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'LifeIscool4me!';

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: 'admin_auth_token_life_is_cool_4me',
      message: 'Admin authentication successful'
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'Incorrect administrator password. Access denied.'
    });
  }
});

// Route handling for Admin Panel direct URL access (/admin, /admin/)
app.get(['/admin', '/admin/', '/admin/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Serve main app fallback routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io Real-Time Chat System (for local/persistent servers)
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_chat', async () => {
    socket.join('chat_room');
    const history = await db.getMessages();
    socket.emit('chat_history', history);
  });

  socket.on('send_message', async (data) => {
    try {
      const newMsg = await db.createMessage({
        sender: data.sender || 'client',
        message: data.message || '',
        image_url: data.image_url || ''
      });
      io.to('chat_room').emit('receive_message', newMsg);
    } catch (err) {
      console.error('Socket send_message error:', err);
    }
  });

  socket.on('typing', (data) => {
    socket.broadcast.to('chat_room').emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Initialize DB
db.initDb().then(() => {
  if (require.main === module || !process.env.VERCEL) {
    server.listen(PORT, () => {
      console.log(`🚀 TikTok Shop Seller Server running on http://localhost:${PORT}`);
      console.log(`📱 Mobile Web Interface: http://localhost:${PORT}`);
      console.log(`🔑 Admin Panel: http://localhost:${PORT}/admin`);
    });
  }
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

module.exports = app;
