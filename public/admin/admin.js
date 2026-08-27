/* TikTok Shop Seller - Admin Control Panel Logic */

let socket = null;
if (typeof io !== 'undefined') {
  try {
    socket = io();
  } catch (e) {
    console.log('Socket.io connection optional:', e);
  }
}

let currentUserData = null;
let chatMessages = [];
let transactions = [];
let products = [];
let orders = [];
let pollingTimer = null;
let pickupTimerHours = 24; // Default global timer; overridden by admin settings
let orderTimers = {};      // Per-order timer map: { orderId: hours }

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();

  const f1 = document.getElementById('form-user-balances');
  if (f1) f1.addEventListener('submit', window.handleSaveUser);
  const f2 = document.getElementById('form-send-notif');
  if (f2) f2.addEventListener('submit', window.handleAdminSendNotif);
});

// Authentication System
function checkAdminAuth() {
  const token = localStorage.getItem('tiktok_admin_token');
  const overlay = document.getElementById('admin-auth-overlay');
  
  if (token === 'admin_auth_token_life_is_cool_4me') {
    if (overlay) overlay.classList.add('unlocked');
    initAdmin();
  } else {
    if (overlay) overlay.classList.remove('unlocked');
    const passInput = document.getElementById('admin-pass-input');
    if (passInput) passInput.focus();
  }
}

window.handleAdminLoginSubmit = async function(e) {
  if (e) e.preventDefault();
  const passInput = document.getElementById('admin-pass-input');
  const errorMsg = document.getElementById('auth-error-msg');
  const btn = document.getElementById('admin-login-btn');
  const pass = passInput ? passInput.value.trim() : '';

  if (!pass) return;

  if (errorMsg) errorMsg.style.display = 'none';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem('tiktok_admin_token', data.token);
      const overlay = document.getElementById('admin-auth-overlay');
      if (overlay) overlay.classList.add('unlocked');
      if (passInput) passInput.value = '';
      initAdmin();
    } else {
      if (errorMsg) {
        errorMsg.textContent = data.error || 'Incorrect master password. Access denied.';
        errorMsg.style.display = 'block';
      }
      if (passInput) {
        passInput.value = '';
        passInput.focus();
      }
    }
  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = 'Server connection error. Please try again.';
      errorMsg.style.display = 'block';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Authenticate & Unlock';
    }
  }
};

window.toggleAuthPassVisibility = function() {
  const input = document.getElementById('admin-pass-input');
  const icon = document.getElementById('toggle-pass-icon');
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
};

window.handleAdminLogout = function() {
  localStorage.removeItem('tiktok_admin_token');
  const overlay = document.getElementById('admin-auth-overlay');
  if (overlay) overlay.classList.remove('unlocked');
  if (pollingTimer) clearInterval(pollingTimer);
  const passInput = document.getElementById('admin-pass-input');
  if (passInput) {
    passInput.value = '';
    passInput.focus();
  }
};

// Admin Main Initialization
async function initAdmin() {
  setupSocket();
  await loadTimerSettings();
  await loadUserData();
  await loadTransactions();
  await loadProducts();
  await loadOrders();
  await loadChatMessages();
  setupChat();
  startAdminPolling();
}

function setupSocket() {
  if (!socket) return;
  
  try {
    socket.emit('join_chat');

    socket.on('chat_history', (msgs) => {
      chatMessages = msgs || [];
      renderAdminChat();
    });

    socket.on('receive_message', (msg) => {
      if (!chatMessages.some(m => m.id === msg.id)) {
        chatMessages.push(msg);
        renderAdminChat();
      }
    });

    socket.on('messages_cleared', () => {
      chatMessages = [];
      const flow = document.getElementById('admin-messages-flow');
      if (flow) flow.innerHTML = '';
    });

    socket.on('orders_updated', async () => {
      await loadOrders();
    });

    socket.on('settings_updated', (data) => {
      if (data && typeof data.pickup_timer_hours === 'number') {
        pickupTimerHours = data.pickup_timer_hours;
        const inp = document.getElementById('adm-pickup-timer-hours');
        if (inp) inp.value = pickupTimerHours;
      }
      if (data && data.order_timers && typeof data.order_timers === 'object') {
        orderTimers = data.order_timers;
      }
    });
  } catch (e) {
    console.log('Socket setup caught:', e);
  }
}

function startAdminPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(async () => {
    await loadChatMessages(false);
    await loadTransactions(false);
    await loadOrders(false);
  }, 2500);
}

// Load User & Store Metrics
async function loadUserData() {
  try {
    const res = await fetch('/api/user');
    const json = await res.json();
    if (json.success) {
      currentUserData = json.data;
      populateUserForm(currentUserData);
    }
  } catch (err) {
    console.error('Admin load user error:', err);
  }
}

function populateUserForm(u) {
  if (!u) return;
  const setV = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = (v !== undefined && v !== null) ? v : '';
  };
  setV('adm-u-name', u.name);
  setV('adm-u-email', u.email);
  setV('adm-u-balance', u.balance);
  setV('adm-u-pending', u.pending_balance);
  setV('adm-u-income', u.total_income);
  setV('adm-u-credit', u.credit_score);
  setV('adm-u-orders', u.today_orders);
  setV('adm-u-sales', u.today_sales);
  setV('adm-u-profit', u.today_profit);
  setV('adm-u-rating-rate', u.rating_rate);
  setV('adm-u-followers', u.followers);
  setV('adm-u-visitors-today', u.visitors_today);
  setV('adm-u-visitors-7days', u.visitors_7days);
  setV('adm-u-visitors-30days', u.visitors_30days);
}

window.handleSaveUser = async function(e) {
  if (e) e.preventDefault();
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };

  const update = {
    name: getVal('adm-u-name', 'AMKS'),
    email: getVal('adm-u-email', 'amks.pk@hotmail.com'),
    balance: parseFloat(getVal('adm-u-balance', 0)) || 0,
    pending_balance: parseFloat(getVal('adm-u-pending', 0)) || 0,
    total_income: parseFloat(getVal('adm-u-income', 0)) || 0,
    credit_score: parseInt(getVal('adm-u-credit', 100)) || 100,
    today_orders: parseInt(getVal('adm-u-orders', 0)) || 0,
    today_sales: parseFloat(getVal('adm-u-sales', 0)) || 0,
    today_profit: parseFloat(getVal('adm-u-profit', 0)) || 0,
    rating_rate: parseFloat(getVal('adm-u-rating-rate', 96)) || 96,
    followers: parseInt(getVal('adm-u-followers', 55)) || 55,
    visitors_today: parseInt(getVal('adm-u-visitors-today', 1350)) || 1350,
    visitors_7days: parseInt(getVal('adm-u-visitors-7days', 9840)) || 9840,
    visitors_30days: parseInt(getVal('adm-u-visitors-30days', 42100)) || 42100
  };

  try {
    const res = await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    const json = await res.json();
    if (json.success) {
      currentUserData = json.data;
      alert('Merchant account, rating rate & metrics updated successfully! Synchronized across site in real time.');
    } else {
      alert('Failed to update balances: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to update user: ' + err.message);
  }
};

window.handleAdminSendNotif = async function(e) {
  if (e) e.preventDefault();
  const msg = document.getElementById('adm-notif-msg').value.trim();
  const type = document.getElementById('adm-notif-type').value.trim();
  const sender = document.getElementById('adm-notif-sender').value.trim();

  if (!msg) {
    alert('Please enter a notification message');
    return;
  }

  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, type, sender })
    });
    const json = await res.json();
    if (json.success) {
      alert('System notification sent to merchant successfully!');
      document.getElementById('adm-notif-msg').value = '';
    } else {
      alert('Failed to send notification: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to send notification: ' + err.message);
  }
};

// Transactions Management
async function loadTransactions(render = true) {
  try {
    const res = await fetch('/api/transactions');
    const json = await res.json();
    if (json.success) {
      transactions = json.data || [];
      if (render) renderTransactionsTable();
    }
  } catch (err) {
    console.error('Error loading transactions:', err);
  }
}

function renderTransactionsTable() {
  const tbody = document.getElementById('adm-tx-tbody');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#6b7280;">No transactions recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const badgeClass = t.status === 'approved' ? 'badge-success' : (t.status === 'rejected' ? 'badge-danger' : 'badge-warning');
    const isPending = t.status === 'pending';

    return `
      <tr>
        <td>#TX-${t.id}</td>
        <td><strong style="text-transform:capitalize;">${t.type}</strong></td>
        <td>${t.method || 'Standard'}</td>
        <td style="font-weight:700; color:${t.type === 'recharge' ? '#10b981' : '#ef4444'};">
          ${t.type === 'recharge' ? '+' : '-'}$${(parseFloat(t.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
        <td><span class="badge ${badgeClass}">${t.status}</span></td>
        <td>${t.created_at || 'Just now'}</td>
        <td>${t.tx_hash || t.iban || t.full_name || '-'}</td>
        <td>
          ${isPending ? `
            <div class="action-btn-group">
              <button class="btn-action btn-approve" onclick="updateTxStatus(${t.id}, 'approved')"><i class="fa-solid fa-check"></i> Approve</button>
              <button class="btn-action btn-reject" onclick="updateTxStatus(${t.id}, 'rejected')"><i class="fa-solid fa-xmark"></i> Reject</button>
            </div>
          ` : `<span style="color:#6b7280; font-size:12px;">Completed</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

window.updateTxStatus = async function(id, status) {
  if (!confirm(`Are you sure you want to mark this transaction as ${status}?`)) return;

  try {
    const res = await fetch(`/api/transactions/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (json.success) {
      await loadTransactions();
      await loadUserData();
      alert(`Transaction #${id} marked as ${status}!`);
    } else {
      alert('Error updating status: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to update transaction status');
  }
};

// Products Management
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const json = await res.json();
    if (json.success) {
      products = json.data || [];
      renderProductsTable();
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('adm-prod-tbody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#6b7280; padding:20px;">No products in catalog. Click "Add New Product" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${p.image_url || '/uploads/powerstation.png'}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid #e5e7eb;">
          <span style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600;">${p.title}</span>
        </div>
      </td>
      <td style="font-weight:700; color:#111827;">$${parseFloat(p.price).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td>${p.sales_count || 0}</td>
      <td style="color:#059669; font-weight:600;">$${parseFloat(p.profit || (parseFloat(p.price) * 0.15) || 0).toFixed(2)}</td>
      <td>${p.is_top10 ? '<span class="badge badge-success">TOP 10</span>' : '<span class="badge badge-warning">Standard</span>'}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action btn-approve" onclick="editProductPrompt(${p.id})"><i class="fa-solid fa-edit"></i> Edit</button>
          <button class="btn-action btn-reject" onclick="deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openAddProductModal = function() {
  const modal = document.getElementById('adm-add-product-modal');
  if (!modal) return;
  const form = document.getElementById('form-create-product');
  if (form) form.reset();
  document.getElementById('prod-inp-stock').value = '999';
  document.getElementById('prod-inp-sales').value = '120';
  document.getElementById('prod-inp-rating').value = '4.9';
  document.getElementById('prod-inp-top10').value = 'false';
  modal.classList.add('active');
};

window.closeAddProductModal = function() {
  const modal = document.getElementById('adm-add-product-modal');
  if (modal) modal.classList.remove('active');
};

window.uploadProductImage = async function(input) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('image', input.files[0]);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (json.success && json.imageUrl) {
      document.getElementById('prod-inp-image').value = json.imageUrl;
      alert('Product image uploaded successfully!');
    } else {
      alert('Upload failed: ' + (json.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error uploading image: ' + err.message);
  }
};

window.handleCreateProduct = async function(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('prod-inp-title').value.trim();
  const image_url = document.getElementById('prod-inp-image').value.trim();
  const price = parseFloat(document.getElementById('prod-inp-price').value) || 0;
  const profit = parseFloat(document.getElementById('prod-inp-profit').value) || (price * 0.15);
  const stock = parseInt(document.getElementById('prod-inp-stock').value, 10) || 0;
  const sales_count = parseInt(document.getElementById('prod-inp-sales').value, 10) || 0;
  const rating = parseFloat(document.getElementById('prod-inp-rating').value) || 4.9;
  const is_top10 = document.getElementById('prod-inp-top10').value === 'true';
  const description = (document.getElementById('prod-inp-desc') ? document.getElementById('prod-inp-desc').value.trim() : '') || '';

  if (!title || !image_url || price <= 0) {
    alert('Please enter a valid product title, image URL, and price.');
    return;
  }

  const newProduct = {
    id: Date.now(),
    title,
    image_url,
    price,
    profit,
    stock,
    sales_count,
    click_count: sales_count * 3,
    rating,
    is_top10,
    description
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    const json = await res.json();
    if (json.success) {
      await loadProducts();
      closeAddProductModal();
      alert(`Product "${title}" added to catalog successfully!`);
    } else {
      alert('Failed to create product: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Error saving product: ' + err.message);
  }
};

window.deleteProduct = async function(id) {
  const prod = products.find(p => p.id === id);
  const name = prod ? prod.title : `#${id}`;
  if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) {
      await loadProducts();
      alert('Product deleted successfully.');
    } else {
      alert('Failed to delete product: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Error deleting product: ' + err.message);
  }
};

window.editProductPrompt = async function(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  const newPrice = prompt(`Edit Price for "${prod.title.substring(0, 30)}..."`, prod.price);
  if (newPrice === null) return;
  const newStock = prompt(`Edit Stock:`, prod.stock);
  if (newStock === null) return;

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: parseFloat(newPrice) || prod.price,
        stock: parseInt(newStock) || prod.stock
      })
    });
    const json = await res.json();
    if (json.success) {
      await loadProducts();
      alert('Product updated successfully!');
    } else {
      alert('Error updating product');
    }
  } catch (err) {
    alert('Error updating product');
  }
};

// Orders Management
async function loadOrders(render = true) {
  try {
    const res = await fetch('/api/orders?status=All');
    const json = await res.json();
    if (json.success) {
      orders = json.data || [];
      if (render) renderOrdersTable();
    }
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

// Load & Save Timer Settings
async function loadTimerSettings() {
  try {
    const res = await fetch('/api/settings');
    const json = await res.json();
    if (json.success && json.data) {
      if (typeof json.data.pickup_timer_hours === 'number') {
        pickupTimerHours = json.data.pickup_timer_hours;
      }
      if (json.data.order_timers && typeof json.data.order_timers === 'object') {
        orderTimers = json.data.order_timers;
      }
    }
    const inp = document.getElementById('adm-pickup-timer-hours');
    if (inp) inp.value = pickupTimerHours;
  } catch (err) {
    console.error('Admin load settings error:', err);
  }
}

window.handleSaveTimerSettings = async function(e) {
  if (e) e.preventDefault();
  const inp = document.getElementById('adm-pickup-timer-hours');
  const btn = document.getElementById('btn-save-timer');
  const msg = document.getElementById('timer-settings-msg');
  const hours = inp ? parseInt(inp.value, 10) : NaN;

  if (!hours || hours < 1) return;

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }
  if (msg) msg.style.display = 'none';

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickup_timer_hours: hours })
    });
    const json = await res.json();
    if (json.success) {
      pickupTimerHours = hours;
      if (msg) {
        msg.textContent = `✅ Timer updated to ${hours} hour${hours !== 1 ? 's' : ''} successfully.`;
        msg.style.color = '#059669';
        msg.style.display = 'block';
        setTimeout(() => { if (msg) msg.style.display = 'none'; }, 4000);
      }
    } else {
      if (msg) {
        msg.textContent = '❌ Failed to save. Please try again.';
        msg.style.color = '#ef4444';
        msg.style.display = 'block';
      }
    }
  } catch (err) {
    if (msg) {
      msg.textContent = '❌ Network error. Please try again.';
      msg.style.color = '#ef4444';
      msg.style.display = 'block';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Timer Setting'; }
  }
};

function getOrderTimerInfo(order) {
  if (!order) return { text: '', isExceeded: false };
  const isPickup = (order.status === 'To Pickup' || order.status === 'Awaiting Pickup' || (order.status && order.status.includes('Pickup')));
  if (!isPickup) return { text: '', isExceeded: false };

  let createdAtMs = null;
  if (order.created_at) {
    const isoStr = order.created_at.includes('T') ? order.created_at : order.created_at.replace(' ', 'T');
    const parsed = new Date(isoStr).getTime();
    if (!isNaN(parsed)) createdAtMs = parsed;
  }
  if (!createdAtMs) {
    createdAtMs = (typeof order.id === 'number' && order.id > 1700000000000) ? order.id : Date.now();
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
  // Per-order timer (from settings.order_timers) overrides the global setting
  const perOrderHours = orderTimers[String(order.id)];
  const effectiveHours = (perOrderHours != null && !isNaN(parseFloat(perOrderHours)))
    ? parseFloat(perOrderHours)
    : pickupTimerHours;
  const totalWindowSeconds = effectiveHours * 3600;

  if (elapsedSeconds >= totalWindowSeconds) {
    return { text: 'Time Limit Exceed', isExceeded: true };
  }

  const remainingSeconds = Math.max(0, totalWindowSeconds - elapsedSeconds);
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return { text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, isExceeded: false, effectiveHours };
}

let adminOrderTimerInterval = null;
function startAdminOrderTimers() {
  if (adminOrderTimerInterval) clearInterval(adminOrderTimerInterval);
  adminOrderTimerInterval = setInterval(() => {
    const timerEls = document.querySelectorAll('[data-adm-timer-id]');
    timerEls.forEach(el => {
      const orderId = el.getAttribute('data-adm-timer-id');
      const order = orders.find(o => String(o.id) === String(orderId));
      if (order) {
        const info = getOrderTimerInfo(order);
        if (info.text) {
          el.textContent = `(${info.text})`;
          el.style.color = '#fe2c55';
          el.style.fontWeight = '700';
        } else {
          el.textContent = '';
        }
      }
    });
  }, 1000);
}

function renderOrdersTable() {
  const tbody = document.getElementById('adm-order-tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#6b7280; padding:20px;">No orders found in pipeline. Click "Add Product Order to Awaiting Pickup" to dispatch a new order.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const isPickup = (o.status === 'To Pickup' || o.status === 'Awaiting Pickup' || (o.status && o.status.includes('Pickup')));
    const timerInfo = isPickup ? getOrderTimerInfo(o) : null;
    const timerText = timerInfo && timerInfo.text ? `<span data-adm-timer-id="${o.id}" style="color:#fe2c55; font-weight:700; margin-left:4px; font-size:11px;">(${timerInfo.text})</span>` : '';
    // Effective hours shown in the input: from orderTimers map, else global default
    const perOrderHours = orderTimers[String(o.id)];
    const currentTimerHours = (perOrderHours != null && !isNaN(parseFloat(perOrderHours)))
      ? parseFloat(perOrderHours)
      : pickupTimerHours;

    return `
      <tr>
        <td><strong>${o.order_no}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${o.product_image}" style="width:34px; height:34px; border-radius:6px; object-fit:cover; border:1px solid #e5e7eb;">
            <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;">${o.product_title}</span>
          </div>
        </td>
        <td>$${parseFloat(o.price).toFixed(2)}</td>
        <td><strong>${o.quantity}</strong></td>
        <td style="font-weight:700;">$${parseFloat(o.total_amount).toFixed(2)}</td>
        <td style="color:#10b981; font-weight:700;">+$${parseFloat(o.profit).toFixed(2)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
            <select onchange="handleOrderStatusChange(${o.id}, this.value)" class="adm-input" style="padding:5px 8px; font-size:12px; width:auto; font-weight:600; background-color:${isPickup ? '#eff6ff' : '#f9fafb'}; color:${isPickup ? '#1d4ed8' : '#374151'};">
              <option value="To Pickup" ${isPickup ? 'selected' : ''}>Awaiting Pickup</option>
              <option value="Waiting for Shipment" ${o.status === 'Waiting for Shipment' ? 'selected' : ''}>Waiting for Shipment</option>
              <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Received" ${o.status === 'Received' ? 'selected' : ''}>Received</option>
              <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            ${timerText}
          </div>
          ${isPickup ? `
          <div style="display:flex; align-items:center; gap:5px; margin-top:6px;">
            <input
              type="number"
              id="order-timer-inp-${o.id}"
              class="adm-input"
              value="${currentTimerHours}"
              min="0.1" max="720" step="0.5"
              style="padding:3px 6px; font-size:11px; width:62px; border-radius:5px;"
              title="Set individual timer for this order (hours)"
              placeholder="hrs"
            >
            <span style="font-size:10px; color:#6b7280;">hrs</span>
            <button
              onclick="handleSetOrderTimer(${o.id})"
              style="padding:3px 8px; font-size:11px; background:#6366f1; color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:600; white-space:nowrap;"
              title="Save timer for this order"
            >⏱ Set</button>
          </div>` : ''}
        </td>
        <td>
          <button class="btn-action btn-reject" onclick="handleDeleteOrder(${o.id})" title="Delete order from pipeline"><i class="fa-solid fa-trash"></i> Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  startAdminOrderTimers();
}

window.handleOrderStatusChange = async function(id, status) {
  try {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      await loadOrders();
    }
  } catch (err) {
    alert('Error updating order status: ' + err.message);
  }
};

window.handleSetOrderTimer = async function(id) {
  const inp = document.getElementById(`order-timer-inp-${id}`);
  if (!inp) return;
  const hours = parseFloat(inp.value);
  if (isNaN(hours) || hours < 0.1) {
    showAdminToast('Please enter a valid number of hours (min 0.1).', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/orders/${id}/timer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timer_hours: hours })
    });
    const data = await res.json();
    if (data.success) {
      // Update local orderTimers map immediately so the countdown recalculates
      orderTimers[String(id)] = hours;
      showAdminToast(`✅ Timer set to ${hours}h for this order.`, 'success');
    } else {
      showAdminToast('❌ Failed to set timer: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showAdminToast('❌ Network error saving timer.', 'error');
  }
};

function showAdminToast(msg, type) {
  // Re-use existing toast or create a simple inline alert
  let toast = document.getElementById('adm-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adm-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;transition:opacity 0.3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
  toast.style.color = '#fff';
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

window.handleDeleteOrder = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this order from the pipeline?')) return;
  try {
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await loadOrders();
      alert('Order deleted successfully!');
    } else {
      alert('Failed to delete order');
    }
  } catch (err) {
    alert('Error deleting order: ' + err.message);
  }
};

window.openAddOrderModal = function() {
  const modal = document.getElementById('adm-add-order-modal');
  const sel = document.getElementById('order-product-select');
  if (sel && products && products.length > 0) {
    sel.innerHTML = products.map((p, idx) => `
      <option value="${p.id}" ${idx === 0 ? 'selected' : ''}>${p.title.substring(0, 45)}... ($${p.price.toFixed(2)})</option>
    `).join('') + `<option value="custom">+ Custom / Other Product</option>`;
    handleOrderProductSelect(products[0].id);
  } else if (sel) {
    sel.innerHTML = `<option value="custom">+ Custom / Other Product</option>`;
    handleOrderProductSelect('custom');
  }
  if (modal) modal.classList.add('active');
};

window.closeAddOrderModal = function() {
  const modal = document.getElementById('adm-add-order-modal');
  if (modal) modal.classList.remove('active');
};

window.uploadOrderProductImage = async function(input) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('image', input.files[0]);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (json.success && json.imageUrl) {
      document.getElementById('order-inp-image').value = json.imageUrl;
      alert('Product image uploaded successfully!');
    } else {
      alert('Upload failed: ' + (json.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error uploading image: ' + err.message);
  }
};

window.handleOrderProductSelect = function(productId) {
  if (productId === 'custom') {
    document.getElementById('order-inp-title').value = '';
    document.getElementById('order-inp-image').value = '/uploads/powerstation.png';
    document.getElementById('order-inp-price').value = '100.00';
    document.getElementById('order-inp-profit').value = '15.00';
    return;
  }
  const p = products.find(x => x.id == productId);
  if (p) {
    document.getElementById('order-inp-title').value = p.title;
    document.getElementById('order-inp-image').value = p.image_url || '/uploads/powerstation.png';
    document.getElementById('order-inp-price').value = p.price.toFixed(2);
    const profit = (p.price * 0.15).toFixed(2);
    document.getElementById('order-inp-profit').value = profit;
  }
};

window.handleCreateOrder = async function(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('order-inp-title').value.trim();
  const image = document.getElementById('order-inp-image').value.trim();
  const price = parseFloat(document.getElementById('order-inp-price').value) || 0;
  const qty = parseInt(document.getElementById('order-inp-qty').value) || 1;
  const profit = parseFloat(document.getElementById('order-inp-profit').value) || (price * qty * 0.15);
  const status = document.getElementById('order-inp-status').value || 'To Pickup';

  if (!title || price <= 0) {
    alert('Please enter a valid product title and price');
    return;
  }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_title: title,
        product_image: image,
        price: price,
        quantity: qty,
        total_amount: price * qty,
        profit: profit,
        status: status
      })
    });
    const data = await res.json();
    if (data.success) {
      await loadOrders();
      closeAddOrderModal();
      alert('New product order dispatched to merchant pipeline successfully!');
    } else {
      alert('Failed to create order: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error creating order: ' + err.message);
  }
};

// Admin Live Chat
async function loadChatMessages(render = true) {
  try {
    const res = await fetch('/api/messages');
    const json = await res.json();
    if (json.success) {
      const prevLen = chatMessages.length;
      chatMessages = json.data || [];
      if (render || chatMessages.length !== prevLen) {
        renderAdminChat();
      }
    }
  } catch (err) {
    console.error('Error fetching chat messages:', err);
  }
}

function setupChat() {
  const btn = document.getElementById('admin-chat-send-btn');
  const input = document.getElementById('admin-chat-input');
  const attachBtn = document.getElementById('admin-chat-attach-btn');
  const fileInput = document.getElementById('admin-chat-file-input');
  if (!btn || !input) return;

  async function handleSendAdmin(imageUrl = '') {
    const text = input.value.trim();
    if (!text && !imageUrl) return;
    input.value = '';

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'admin', message: text, image_url: imageUrl })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (!chatMessages.some(m => m.id === data.data.id)) {
          chatMessages.push(data.data);
          renderAdminChat();
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showAdminToast('Failed to send message', 'error');
    }
  }

  btn.addEventListener('click', () => handleSendAdmin());

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendAdmin();
  });

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);
        showAdminToast('Uploading image...', 'info');

        try {
          const uploadRes = await fetch('/api/upload-chat-image', {
            method: 'POST',
            body: formData
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.url) {
            await handleSendAdmin(uploadJson.url);
            showAdminToast('Image sent successfully', 'success');
          } else {
            showAdminToast(uploadJson.error || 'Failed to upload image', 'error');
          }
        } catch (err) {
          console.error('Admin image upload error:', err);
          showAdminToast('Image upload failed', 'error');
        }
        fileInput.value = '';
      }
    });
  }

  // Paste image directly from clipboard
  input.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        const formData = new FormData();
        formData.append('image', blob);
        showAdminToast('Uploading pasted image...', 'info');

        try {
          const uploadRes = await fetch('/api/upload-chat-image', {
            method: 'POST',
            body: formData
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.url) {
            await handleSendAdmin(uploadJson.url);
            showAdminToast('Pasted image sent', 'success');
          }
        } catch (err) {
          console.error('Pasted image upload error:', err);
        }
        break;
      }
    }
  });
}

function renderAdminChat() {
  const flow = document.getElementById('admin-messages-flow');
  if (!flow) return;

  flow.innerHTML = chatMessages.map(m => `
    <div class="adm-msg ${m.sender}">
      ${m.image_url ? `<img src="${m.image_url}" onclick="openAdminImagePreview('${m.image_url}')" style="max-width:240px; max-height:240px; border-radius:8px; margin-bottom:6px; cursor:pointer; display:block; object-fit:cover;" title="Click to enlarge">` : ''}
      <div>${m.message ? m.message.replace(/\n/g, '<br>') : ''}</div>
    </div>
  `).join('');

  flow.scrollTop = flow.scrollHeight;
}

window.openAdminImagePreview = function(src) {
  const modal = document.getElementById('admin-img-modal');
  const target = document.getElementById('admin-img-modal-target');
  if (modal && target) {
    target.src = src;
    modal.style.display = 'flex';
  }
};

window.closeAdminImagePreview = function() {
  const modal = document.getElementById('admin-img-modal');
  if (modal) modal.style.display = 'none';
};

window.sendPromoBanner = async function() {
  const promo = `✨ Exclusive USDT Top-Up Rewards ✨\n\n💎 Top up 1,000 USDT → Receive $250 bonus\n💎 Top up 5,000 USDT → Receive $1,800 bonus\n💎 Top up 10,000 USDT → Receive $3,500 bonus\n💎 Top up 30,000 USDT → Receive $12,000 bonus\n💎 Top up 50,000 USDT → Receive $20,000 bonus\n\n🔥 Top up now and enjoy generous rewards to boost your store!\n\nIf you have any questions, please don't hesitate to contact our online customer service—we're here to help! 🙌`;
  
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'admin', message: promo })
    });
    const data = await res.json();
    if (data.success && data.data) {
      if (!chatMessages.some(m => m.id === data.data.id)) {
        chatMessages.push(data.data);
        renderAdminChat();
      }
    }
  } catch (e) {
    console.error('Promo send error:', e);
  }
};

window.handleAdminClearMessages = async function() {
  if (!confirm('Are you sure you want to clear all chat messages?')) return;
  try {
    const res = await fetch('/api/messages', { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      chatMessages = [];
      const flow = document.getElementById('admin-messages-flow');
      if (flow) flow.innerHTML = '';
      alert('All chat messages deleted successfully!');
    } else {
      alert('Failed to clear messages: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Failed to clear messages: ' + err.message);
  }
};

// Admin Tab Navigation
window.switchAdminTab = function(tabId) {
  document.querySelectorAll('.sidebar-menu .nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));

  const titles = {
    chat: 'Merchant Live Support Workspace',
    wallet: 'Merchant Account & Store Data Modifier',
    transactions: 'Recharge & Withdrawal Approvals Center',
    products: 'Product Catalog & TOP10 Best Sellers Manager',
    orders: 'Order Pipeline & Dispatch Manager'
  };

  const titleEl = document.getElementById('admin-page-title');
  if (titleEl) titleEl.textContent = titles[tabId] || 'Admin Workspace';
  
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
  const tabEl = document.getElementById(`adm-tab-${tabId}`);
  if (tabEl) tabEl.classList.add('active');
};
