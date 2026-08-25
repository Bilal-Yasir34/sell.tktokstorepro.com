/* ==========================================================================
   TikTok Shop Seller Portal - Client Application Logic & Socket.io Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Socket.io initialization (safe fallback)
  let socket = null;
  if (typeof io !== 'undefined') {
    try {
      socket = io();
    } catch (e) {
      console.log('Socket.io connection optional:', e);
    }
  }

  // App State
  let currentUser = null;
  let products = [];
  let orders = [];
  let chatMessages = [];
  let faqs = [];
  let salesChart = null;
  let currentOrderPipeline = 'To Pickup';
  let selectedWithdrawalMethod = 'Bank Card';
  let clientPollingTimer = null;

  // Initialize App
  initApp();

  async function initApp() {
    setupSocket();
    await fetchUserData();
    await fetchProducts();
    await fetchOrders(currentOrderPipeline);
    await fetchFaqs();
    await fetchChatMessages();
    await fetchNotificationsData();
    initSalesChart();
    setupChatListeners();
    startClientPolling();
  }

  // Socket.io Client Engine
  function setupSocket() {
    if (!socket) return;
    try {
      socket.emit('join_chat');

      socket.on('chat_history', (msgs) => {
        chatMessages = msgs || [];
        renderChatMessages();
      });

      socket.on('receive_message', (msg) => {
        if (!chatMessages.some(m => m.id === msg.id)) {
          chatMessages.push(msg);
          renderChatMessages();
          scrollChatToBottom();
          updateUnreadServiceBadge();
        }
      });

      socket.on('user_updated', (user) => {
        currentUser = user;
        updateUserUI();
      });

      socket.on('new_notification', (notif) => {
        if (!notificationsList) notificationsList = [];
        notificationsList.unshift(notif);
        renderNotificationsFeed();
        
        const badge = document.querySelector('#home-msg-btn .msg-badge-num');
        if (badge) {
          badge.style.display = 'flex';
          const currentNum = parseInt(badge.textContent) || 0;
          badge.textContent = currentNum + 1;
        }

        showToast('New notification: ' + notif.message);
      });

      socket.on('messages_cleared', () => {
        chatMessages = [];
        const flow = document.getElementById('messages-flow');
        if (flow) flow.innerHTML = '';
        showToast('All chat messages cleared by admin');
      });
    } catch (e) {
      console.log('Socket init caught:', e);
    }
  }

  // Cross-Device Polling Synchronization (Vercel serverless real-time support)
  function startClientPolling() {
    if (clientPollingTimer) clearInterval(clientPollingTimer);
    clientPollingTimer = setInterval(async () => {
      await fetchUserData(false);
      await fetchChatMessages(false);
      await fetchNotificationsData(false);
      await fetchOrders(currentOrderPipeline);
    }, 2500);
  }

  // Fetch Current User & Store Stats
  async function fetchUserData() {
    try {
      const res = await fetch('/api/user');
      const json = await res.json();
      if (json.success) {
        currentUser = json.data;
        updateUserUI();
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }

  function updateUserUI() {
    if (!currentUser) return;

    // Null-safe setter helper
    function setEl(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    const u = currentUser;
    const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

    // Home Tab Matrix
    setEl('home-brand-name', u.name);
    setEl('home-level-tag', u.level);
    setEl('home-rating', (u.rating || 5).toFixed(1));

    setEl('mat-orders-sold', u.today_orders);
    setEl('mat-total-sales', '$ ' + fmt(u.today_sales));
    setEl('mat-profit-forecast', '$ ' + fmt(u.today_profit));

    setEl('mat-visitors-today', (u.visitors_today || 0).toLocaleString());
    setEl('mat-last-7days', (u.visitors_7days || 0).toLocaleString());
    setEl('mat-last-30days', (u.visitors_30days || 0).toLocaleString());

    setEl('mat-followers', (u.followers || 0).toLocaleString());
    setEl('mat-rating-rate', parseFloat(u.rating_rate || 96.00).toFixed(2));
    setEl('mat-credit-score', u.credit_score);

    // My Profile Tab — Wallet Balances
    setEl('my-email', u.email);
    setEl('my-level', u.level);
    setEl('my-pending', '$ ' + fmt(u.pending_balance));
    setEl('my-balance', '$ ' + fmt(u.balance));
    setEl('my-income', '$ ' + fmt(u.total_income));

    // Withdrawal Screen Current Balance
    setEl('withdraw-curr-balance', fmt(u.balance));

    // Financial Statements Real-Time Sync
    renderFinancialReportsFeed();

    // Notice ticker
    if (u.notice) {
      setEl('my-notice-ticker', u.notice);
    }
  }

  // Default Exact 10 Products (guarantees render even before terminal server restart)
  const DEFAULT_PRODUCTS = [
    {
      id: 101,
      title: "Foursun 1500W Portable Power Station (3000W Peak), 1598.4Wh with 2x 1500W AC Outlets, Wireless Charging, PD 65W, Solar Generator (Solar Panel Not Included) for Home Backup, Emergency, Outdoor Camping",
      price: 900.38,
      sales_count: 22,
      click_count: 529,
      image_url: "/uploads/powerstation.png"
    },
    {
      id: 102,
      title: "SIM Free iPhone 17 Pro Max 5G 1TB AI Phone Silver PreOrder",
      price: 1522.25,
      sales_count: 17,
      click_count: 573,
      image_url: "/uploads/iphone_silver.png"
    },
    {
      id: 103,
      title: "SIM Free iPhone 17 Pro Max 5G 512GB AI Phone Orange PreOrder",
      price: 1331.85,
      sales_count: 15,
      click_count: 442,
      image_url: "/uploads/iphone_orange.png"
    },
    {
      id: 104,
      title: "SIM Free iPhone Air 5G 512GB AI Phone - Sky Blue Pre-Order",
      price: 1141.45,
      sales_count: 12,
      click_count: 725,
      image_url: "/uploads/iphone_skyblue.png"
    },
    {
      id: 105,
      title: "SIM Free iPhone Air 5G 1TB AI Phone - Black Pre-Order",
      price: 1331.85,
      sales_count: 12,
      click_count: 638,
      image_url: "/uploads/iphone_black.png"
    },
    {
      id: 106,
      title: "SIM Free iPhone 17 Pro 5G 512GB AI Phone - Silver Pre-Order",
      price: 1238.65,
      sales_count: 9,
      click_count: 521,
      image_url: "/uploads/iphone_silver.png"
    },
    {
      id: 107,
      title: "SIM Free iPhone 17 Pro 5G 256GB AI Phone - Orange Pre-Order",
      price: 1046.25,
      sales_count: 6,
      click_count: 769,
      image_url: "/uploads/iphone_orange.png"
    },
    {
      id: 108,
      title: "Apple Watch Ultra 3 GPS+Cell 49mm Blue Ocean Band Pre-Order",
      price: 713.05,
      sales_count: 5,
      click_count: 396,
      image_url: "/uploads/apple_watch.png"
    },
    {
      id: 109,
      title: "SIM Free iPhone 17 Pro Max 5G 512GB AI Phone Blue Pre-Order",
      price: 1238.65,
      sales_count: 4,
      click_count: 482,
      image_url: "/uploads/iphone_blue.png"
    },
    {
      id: 110,
      title: "SIM Free iPhone 17 Pro Max 5G 512GB AI Phone Blue Pre-Order",
      price: 1331.85,
      sales_count: 5,
      click_count: 542,
      image_url: "/uploads/iphone_blue.png"
    }
  ];

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      const json = await res.json();
      if (json.success && json.data.length >= 10 && json.data[0].title.includes('Foursun')) {
        products = json.data;
      } else {
        products = DEFAULT_PRODUCTS;
      }
    } catch (err) {
      products = DEFAULT_PRODUCTS;
    }
    renderProductFeed(products);
    document.getElementById('prod-count-num').textContent = 88;
  }

  function renderProductFeed(list) {
    const container = document.getElementById('product-list-container');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<div class="no-data">No products available</div>`;
      return;
    }

    container.innerHTML = list.map((p) => `
      <div class="product-card" onclick="showToast('Product selected: ' + '${p.title.replace(/'/g, "\\'")}')">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.title}" class="prod-thumb">` : `<div class="prod-thumb-placeholder"><i class="fa-regular fa-image"></i></div>`}
        <div class="prod-details">
          <div class="prod-title">${p.title}</div>
          <div class="prod-stats-inline">
            <span>Click: ${p.click_count || 0}</span>
            <span>Sales${p.sales_count || 0}</span>
            <span>Price: $ ${p.price.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.filterProducts = function(type) {
    const catItems = document.querySelectorAll('.category-links .cat-item');
    catItems.forEach(el => el.classList.remove('active'));

    if (type === 'top10') {
      catItems[1].classList.add('active');
      const top10 = products.filter(p => p.is_top10 === 1);
      renderProductFeed(top10);
    } else {
      catItems[0].classList.add('active');
      renderProductFeed(products);
    }
  };

  // Default Exact Orders (Matching Screenshots 1, 3, 5)
  const DEFAULT_ORDERS = [
    {
      id: 1001,
      order_no: "2026082562300452535053",
      product_title: "SAMSUNG Galaxy S22 Ultra Phone, Factory Unlocked Android Smartphone, 256GB, 8K Camera...",
      product_image: "/uploads/iphone_black.png",
      price: 860.69,
      total_cost: 731.59,
      earnings: 129.10,
      quantity: 1,
      status: "Awaiting Pickup",
      timer_countdown: "20:21:28",
      created_at: "2026-08-25 00:29:28"
    },
    {
      id: 1002,
      order_no: "2026082478497917245354",
      product_title: "SIM Free iPhone Air 5G 512GB AI Phone - Sky Blue Pre-Order",
      product_image: "/uploads/iphone_skyblue.png",
      price: 1141.45,
      total_cost: 970.23,
      earnings: 171.22,
      quantity: 1,
      status: "Awaiting Pickup",
      timer_countdown: "19:44:12",
      created_at: "2026-08-24 23:52:12"
    },
    {
      id: 1003,
      order_no: "2026082486886437261025",
      product_title: "SIM Free iPhone Air 5G 512GB AI Phone - Sky Blue Pre-Order",
      product_image: "/uploads/iphone_skyblue.png",
      price: 1141.45,
      total_cost: 970.23,
      earnings: 171.22,
      quantity: 1,
      status: "Awaiting Pickup",
      timer_countdown: "13:05:05",
      created_at: "2026-08-24 17:13:05"
    },
    {
      id: 1004,
      order_no: "20260824115501",
      product_title: "SIM Free iPhone 17 Pro 5G 512GB AI Phone - Silver Pre-Order",
      product_image: "/uploads/iphone_silver.png",
      price: 1238.65,
      total_cost: 1051.15,
      earnings: 187.50,
      quantity: 1,
      status: "Awaiting Pickup",
      timer_countdown: "07:47:01",
      created_at: "2026-08-24 11:55:01"
    },
    {
      id: 1005,
      order_no: "2026082498718572299798",
      product_title: "Foursun 1500W Portable Power Station (3000W Peak), 1598.4Wh with 2x 1500W AC Outlets, Wirele...",
      product_image: "/uploads/powerstation.png",
      price: 900.38,
      total_cost: 765.32,
      earnings: 135.06,
      quantity: 1,
      status: "Completed",
      created_at: "2026-08-24 01:51:07"
    },
    {
      id: 1006,
      order_no: "2026082340782992364850",
      product_title: "Garmin quatix™ 7X Solar Edition, Marine GPS Smartwatch, Solar Charging Capability, Rugged...",
      product_image: "/uploads/apple_watch.png",
      price: 803.31,
      total_cost: 682.81,
      earnings: 120.50,
      quantity: 1,
      status: "Completed",
      created_at: "2026-08-23 16:30:55"
    },
    {
      id: 1007,
      order_no: "2026082234997513371025",
      product_title: "SIM Free iPhone 17 Pro 5G 256GB AI Phone - Orange Pre-Order",
      product_image: "/uploads/iphone_orange.png",
      price: 1046.25,
      total_cost: 889.31,
      earnings: 156.94,
      quantity: 1,
      status: "Completed",
      created_at: "2026-08-22 22:09:24"
    },
    {
      id: 1008,
      order_no: "2026082230346750505752",
      product_title: "Selens 56x89cm 2 in 1 Seamless Backdrop 3 Panel Photography Paper Concrete Wood Background fo...",
      product_image: "/uploads/powerstation.png",
      price: 1106.76,
      total_cost: 940.74,
      earnings: 166.02,
      quantity: 2,
      status: "Completed",
      created_at: "2026-08-22 10:55:31"
    }
  ];

  // Fetch Orders & Pipeline Badges
  async function fetchOrders(status) {
    try {
      const res = await fetch('/api/orders?status=All');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        orders = json.data;
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
    renderOrderFeed(orders);
    updateOrderBadges();
  }

  function updateOrderBadges() {
    const list = orders || [];
    const pickupCount = list.filter(o => o.status && o.status.includes('Pickup')).length;
    const shippedCount = list.filter(o => o.status && (o.status.includes('Shipment') || o.status.includes('Shipped'))).length;

    const myPickup = document.getElementById('my-badge-pickup');
    const myShipped = document.getElementById('my-badge-shipped');
    const navOrderBadge = document.getElementById('nav-badge-order');

    if (myPickup) myPickup.textContent = pickupCount;
    if (myShipped) myShipped.textContent = shippedCount;
    if (navOrderBadge) navOrderBadge.textContent = pickupCount;
  }

  function renderOrderFeed(list) {
    const container = document.getElementById('order-list-container');
    if (!container) return;

    let filtered = list;
    if (currentOrderPipeline === 'Awaiting Pickup') {
      filtered = list.filter(o => o.status.includes('Pickup'));
    } else if (currentOrderPipeline === 'Completed') {
      filtered = list.filter(o => o.status === 'Completed');
    } else if (currentOrderPipeline !== 'All orders') {
      filtered = list.filter(o => o.status.toLowerCase() === currentOrderPipeline.toLowerCase());
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-order-state">
          <div class="empty-doc-icon">
            <i class="fa-regular fa-file-lines"></i>
          </div>
          <div class="empty-doc-text">No more</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(o => `
      <div class="order-card-box">
        <div class="oc-top-bar">
          <span class="oc-dots">...</span>
          <div class="oc-top-right">
            <span class="oc-status-text">${o.status}${o.timer_countdown ? `<span class="oc-timer">(${o.timer_countdown})</span>` : ''}</span>
            <span class="oc-checkbox" data-order-id="${o.id}" onclick="event.stopPropagation(); this.classList.toggle('checked'); updateSelectAllState();"></span>
          </div>
        </div>
        <div class="oc-main-content" onclick="openOrderDetail(${o.id})" style="cursor:pointer;">
          <img src="${o.product_image}" class="oc-prod-thumb" onerror="this.src='/uploads/iphone_silver.png'">
          <div class="oc-prod-details">
            <div class="oc-prod-title">${o.product_title}</div>
            <div class="oc-order-no">Order Number:${o.order_no}</div>
            <div class="oc-date">${o.created_at}</div>
            <div class="oc-items-count">Items <strong>${o.quantity || 1}</strong></div>
            <div class="oc-pricing-grid">
              <div class="oc-price-left">Selling Price <strong>$ ${parseFloat(o.price).toFixed(2)}</strong></div>
              <div class="oc-cost-right">
                <div class="oc-cost-row">Total Cost <strong>$ ${o.total_cost ? parseFloat(o.total_cost).toFixed(2) : (o.price * 0.85).toFixed(2)}</strong></div>
                <div class="oc-earnings-row">Earnings <strong class="text-cyan">$ ${o.profit ? parseFloat(o.profit).toFixed(2) : (o.price * 0.15).toFixed(2)}</strong></div>
              </div>
            </div>
          </div>
        </div>
        <div class="oc-bottom-bar">
          <span class="oc-details-btn" onclick="openOrderDetail(${o.id})" style="cursor:pointer;">Details</span>
          ${(o.status && o.status.includes('Pickup')) ? `<button class="btn-click-pickup" onclick="event.stopPropagation(); pickupSingleOrder(${o.id}, this)">Click to Pickup</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  window.switchOrderPipeline = function(status) {
    currentOrderPipeline = status;
    const tabs = document.querySelectorAll('.order-pipeline-tabs .pipe-tab');
    tabs.forEach(t => {
      t.classList.remove('active');
      if (t.textContent.trim() === status) t.classList.add('active');
    });

    const summaryCard = document.getElementById('order-summary-metrics');
    const floatBar = document.getElementById('order-bottom-actions-float');

    if (['Waiting for Shipment', 'Shipped', 'Received', 'Completed', 'Cancelled'].includes(status)) {
      if (summaryCard) summaryCard.style.display = 'flex';
    } else {
      if (summaryCard) summaryCard.style.display = 'none';
    }

    if (['All orders', 'Awaiting Pickup'].includes(status)) {
      if (floatBar) floatBar.style.display = 'flex';
    } else {
      if (floatBar) floatBar.style.display = 'none';
    }

    fetchOrders(status);
  };

  // Payment PIN Modal & Order Pipeline Transition Engine
  let currentPinDigits = [];
  let currentPickupButton = null;
  let currentPinCost = 0;
  let currentTargetOrderIds = [];

  window.openPinModal = function(cost, btn, orderIds = []) {
    currentPinDigits = [];
    currentPickupButton = btn;
    currentPinCost = parseFloat(cost) || 0;
    currentTargetOrderIds = Array.isArray(orderIds) ? orderIds : (orderIds ? [orderIds] : []);
    
    const amountElem = document.getElementById('pin-amount-val');
    if (amountElem) {
      amountElem.textContent = `$ ${currentPinCost.toFixed(2)}`;
    }
    updatePinBoxes();
    const overlay = document.getElementById('pin-modal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.classList.add('active');
    }
  };

  window.closePinModal = function() {
    const overlay = document.getElementById('pin-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
    currentPinDigits = [];
    updatePinBoxes();
  };

  window.pressPinDigit = function(digit) {
    if (currentPinDigits.length < 6) {
      currentPinDigits.push(digit);
      updatePinBoxes();
    }
  };

  window.pressPinBack = function() {
    if (currentPinDigits.length > 0) {
      currentPinDigits.pop();
      updatePinBoxes();
    }
  };

  function updatePinBoxes() {
    for (let i = 0; i < 6; i++) {
      const box = document.getElementById(`pin-digit-${i}`);
      if (box) {
        box.textContent = currentPinDigits[i] ? '●' : '';
      }
    }
  }

  window.submitPaymentPin = async function() {
    if (currentPinDigits.length < 6) {
      showToast('Please enter the 6-digit payment password');
      return;
    }

    const userBal = currentUser ? parseFloat(currentUser.balance) : 0;
    if (currentPinCost > userBal) {
      closePinModal();
      showToast('Insufficient Balance!');
      return;
    }

    closePinModal();

    // Move order(s) to 'Waiting for Shipment' on backend & in memory
    const targetIds = currentTargetOrderIds || [];
    if (targetIds.length > 0) {
      for (const orderId of targetIds) {
        try {
          await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Waiting for Shipment' })
          });
        } catch (e) {
          console.error('Error updating order status:', e);
        }
      }
    }

    // Deduct cost and update available balance
    const newBal = Math.max(0, userBal - currentPinCost);
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBal })
      });
      if (currentUser) currentUser.balance = newBal;
      updateUserUI();
    } catch (e) {
      console.error('Error updating balance:', e);
    }

    showToast('Order Picked Up');

    // Refresh orders and pipeline
    await fetchOrders(currentOrderPipeline);
  };

  window.pickupSingleOrder = function(id, btn) {
    const list = orders || [];
    const orderObj = list.find(o => String(o.id) === String(id)) || list[0];
    let cost = 0;
    if (orderObj) {
      cost = orderObj.total_amount ? parseFloat(orderObj.total_amount) : (parseFloat(orderObj.price) * (orderObj.quantity || 1));
    }
    if (!cost || isNaN(cost) || cost <= 0) {
      cost = 860.69;
    }
    openPinModal(cost, btn, [id]);
  };

  window.toggleSelectAllOrders = function() {
    const boxes = document.querySelectorAll('.oc-checkbox');
    if (!boxes.length) {
      showToast('No orders to select');
      return;
    }
    const allChecked = Array.from(boxes).every(b => b.classList.contains('checked'));
    boxes.forEach(b => {
      if (allChecked) {
        b.classList.remove('checked');
      } else {
        b.classList.add('checked');
      }
    });
    const btn = document.querySelector('.btn-select-all');
    if (btn) btn.textContent = allChecked ? 'Select All' : 'Deselect All';
    showToast(allChecked ? 'Orders unselected' : 'All orders selected');
  };

  window.updateSelectAllState = function() {
    const boxes = document.querySelectorAll('.oc-checkbox');
    if (!boxes.length) return;
    const allChecked = Array.from(boxes).every(b => b.classList.contains('checked'));
    const btn = document.querySelector('.btn-select-all');
    if (btn) btn.textContent = allChecked ? 'Deselect All' : 'Select All';
  };

  window.pickupAllOrders = function() {
    const checkedBoxes = document.querySelectorAll('.oc-checkbox.checked');
    let targetOrders = [];
    const list = orders || [];

    if (checkedBoxes.length > 0) {
      const checkedIds = Array.from(checkedBoxes).map(b => b.dataset.orderId);
      targetOrders = list.filter(o => checkedIds.includes(String(o.id)));
    } else {
      // Pickup all orders currently in Awaiting Pickup
      targetOrders = list.filter(o => o.status && o.status.includes('Pickup'));
    }

    if (targetOrders.length === 0) {
      showToast('No orders waiting for pickup');
      return;
    }

    const totalCost = targetOrders.reduce((sum, o) => {
      const cost = o.total_amount ? parseFloat(o.total_amount) : (parseFloat(o.price) * (o.quantity || 1));
      return sum + cost;
    }, 0);

    const targetIds = targetOrders.map(o => o.id);
    openPinModal(totalCost, null, targetIds);
  };

  // Global Fallback for Unimplemented Features / Routes
  window.showUnavailable = function(featureName) {
    showToast(`${featureName} is unavailable right now! Please try again later.`);
  };
  window.handleUnavailableFeature = window.showUnavailable;

  // Fetch FAQs Accordion Data
  async function fetchFaqs() {
    try {
      const res = await fetch('/api/faqs');
      const json = await res.json();
      if (json.success) {
        faqs = json.data;
        renderFaqAccordion(faqs);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    }
  }

  function renderFaqAccordion(list) {
    const container = document.getElementById('faq-accordion-list');
    if (!container) return;

    container.innerHTML = list.map((f) => `
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFaq(this)">
          <span>${f.title}</span>
          <i class="fa-solid fa-chevron-right" style="color:#9ca3af; font-size:12px;"></i>
        </div>
        <div class="faq-answer">${f.content}</div>
      </div>
    `).join('');
  }

  window.toggleFaq = function(el) {
    const item = el.parentElement;
    item.classList.toggle('active');
  };

  // Sales Performance Chart (Chart.js Line Graph Matching Screenshot 2)
  function initSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    const labels = ['', '2026-08-18', '', '2026-08-20', '', '2026-08-22', '', '2026-08-24'];
    const dataPoints = [1, 0, 1.2, 3, 3, 7.5, 7.5, 1];

    salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sales Curve',
          data: dataPoints,
          borderColor: '#4a77e5',
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#4a77e5',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#121212',
            titleFont: { family: 'Inter', size: 11 },
            bodyFont: { family: 'Inter', size: 12, weight: 'bold' }
          }
        },
        scales: {
          x: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Inter', size: 10 }, color: '#9ca3af' }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#9ca3af',
              stepSize: 2
            }
          }
        }
      }
    });
  }

  // Customer Service Chat Implementation
  function setupChatListeners() {
    const sendBtn = document.getElementById('chat-send-btn');
    const input = document.getElementById('chat-input');
    const plusBtn = document.getElementById('chat-plus-btn');
    const fileInput = document.getElementById('chat-file-input');

    input.addEventListener('input', () => {
      if (input.value.trim().length > 0) {
        sendBtn.classList.add('active');
      } else {
        sendBtn.classList.remove('active');
      }
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });

    sendBtn.addEventListener('click', handleSendMessage);

    plusBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        try {
          const res = await fetch('/api/upload-chat-image', { method: 'POST', body: formData });
          const json = await res.json();
          if (json.success) {
            await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sender: 'client', image_url: json.url })
            });
            await fetchChatMessages();
          }
        } catch (err) {
          showToast('Image upload failed');
        }
      }
    });
  }

  async function fetchChatMessages(render = true) {
    try {
      const res = await fetch('/api/messages');
      const json = await res.json();
      if (json.success) {
        const prevLen = chatMessages.length;
        chatMessages = json.data || [];
        if (render || chatMessages.length !== prevLen) {
          renderChatMessages();
        }
        updateUnreadServiceBadge();
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  }

  async function fetchNotificationsData(render = true) {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.success && json.data) {
        const incoming = json.data || [];
        if (incoming.length > 0) {
          notificationsList = incoming;
          if (render) renderNotificationsFeed();
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }

  async function handleSendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    document.getElementById('chat-send-btn').classList.remove('active');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'client', message: text })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (!chatMessages.some(m => m.id === data.data.id)) {
          chatMessages.push(data.data);
          renderChatMessages();
          scrollChatToBottom();
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }

  function renderChatMessages() {
    const container = document.getElementById('messages-flow');
    if (!container) return;

    container.innerHTML = chatMessages.map(m => `
      <div class="chat-bubble-wrap ${m.sender}">
        <div class="chat-bubble">
          ${m.image_url ? `<img src="${m.image_url}" class="chat-img-msg" alt="Attachment"><br>` : ''}
          ${m.message ? m.message.replace(/\n/g, '<br>') : ''}
        </div>
        <div class="chat-time">${formatTime(m.created_at)}</div>
      </div>
    `).join('');

    scrollChatToBottom();
  }

  function scrollChatToBottom() {
    const body = document.getElementById('chat-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  function formatTime(str) {
    if (!str) return '2:30 PM';
    const parts = str.split(' ');
    return parts[1] ? parts[1].substring(0, 5) : '2:30 PM';
  }

  // Navigation Router & Views
  window.showTab = function(tabName) {
    if (tabName === 'service') {
      openMerchantService();
      const navItem = document.getElementById(`nav-service`);
      if (navItem) {
        document.querySelectorAll('.bottom-tab-bar .tab-item').forEach(i => i.classList.remove('active'));
        navItem.classList.add('active');
      }
      return;
    }

    // Hide sub views
    document.querySelectorAll('.sub-view').forEach(s => s.classList.remove('active'));

    // Switch tab items
    document.querySelectorAll('.bottom-tab-bar .tab-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

    const navItem = document.getElementById(`nav-${tabName}`);
    const tabView = document.getElementById(`tab-${tabName}`);

    if (navItem) navItem.classList.add('active');
    if (tabView) tabView.classList.add('active');
  };

  // System Notifications Sub-View Engine
  let notificationsList = [
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
      sent_time: "2026-08-21 21:28:33",
      type: "System Message",
      sender: "System",
      is_read: 0
    },
    {
      id: 3,
      message: "Withdrawal review notification",
      sent_time: "2026-08-21 11:07:44",
      type: "System Message",
      sender: "System",
      is_read: 0
    },
    {
      id: 4,
      message: "Withdrawal review notification",
      sent_time: "2026-08-19 12:32:11",
      type: "System Message",
      sender: "System",
      is_read: 0
    },
    {
      id: 5,
      message: "Withdrawal review notification",
      sent_time: "2026-08-17 18:24:32",
      type: "System Message",
      sender: "System",
      is_read: 0
    },
    {
      id: 6,
      message: "Withdrawal review notification",
      sent_time: "2026-08-15 13:42:46",
      type: "System Message",
      sender: "System",
      is_read: 0
    }
  ];
  let currentNotifFilter = 'All';

  window.openNotificationsView = function() {
    document.getElementById('sub-notifications').classList.add('active');
    fetchNotifications();
    markNotificationsRead();
  };

  window.switchNotifFilter = function(filter) {
    currentNotifFilter = filter;
    document.querySelectorAll('.notif-pipeline-tabs .notif-tab').forEach(t => {
      t.classList.remove('active');
      if (t.textContent.trim() === filter) t.classList.add('active');
    });
    renderNotificationsFeed();
  };

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        notificationsList = json.data;
      }
    } catch (err) {}
    renderNotificationsFeed();
  }

  async function markNotificationsRead() {
    try {
      await fetch('/api/notifications/read', { method: 'PUT' });
      const badge = document.querySelector('#home-msg-btn .msg-badge-num');
      if (badge) badge.style.display = 'none';
    } catch (e) {}
  }

  function renderNotificationsFeed() {
    const container = document.getElementById('notif-list-container');
    if (!container) return;

    let filtered = notificationsList;
    if (currentNotifFilter === 'Read') filtered = notificationsList.filter(n => n.is_read === 1);
    if (currentNotifFilter === 'Unread') filtered = notificationsList.filter(n => n.is_read === 0);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-order-state">
          <div class="empty-doc-icon"><i class="fa-regular fa-envelope"></i></div>
          <div class="empty-doc-text">No messages</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(n => `
      <div class="notif-card-box">
        <div class="nc-row">
          <span class="nc-lbl">Message</span>
          <span class="nc-val-title">${n.message}</span>
        </div>
        <div class="nc-row">
          <span class="nc-lbl">Sent Time</span>
          <span class="nc-val-time">${n.sent_time}</span>
        </div>
        <div class="nc-row">
          <span class="nc-lbl">Type</span>
          <span class="nc-val-type">${n.type || 'System Message'}</span>
        </div>
        <div class="nc-row">
          <span class="nc-lbl">Sender</span>
          <span class="nc-val-sender">${n.sender || 'System'}</span>
        </div>
      </div>
    `).join('');
  }

  // Unread Merchant Service Chat Indicator
  let lastSeenAdminMsgId = parseInt(localStorage.getItem('tiktok_last_seen_admin_msg_id')) || 0;

  function updateUnreadServiceBadge() {
    const serviceView = document.getElementById('sub-service');
    const isServiceOpen = serviceView && serviceView.classList.contains('active');

    if (isServiceOpen) {
      if (chatMessages && chatMessages.length > 0) {
        const adminMsgs = chatMessages.filter(m => m.sender === 'admin');
        if (adminMsgs.length > 0) {
          const maxId = Math.max(...adminMsgs.map(m => m.id || 0));
          lastSeenAdminMsgId = maxId;
          localStorage.setItem('tiktok_last_seen_admin_msg_id', lastSeenAdminMsgId);
        }
      }
      hideUnreadServiceDots();
      return;
    }

    const unreadAdminMsgs = chatMessages.filter(m => m.sender === 'admin' && (m.id || 0) > lastSeenAdminMsgId);

    if (unreadAdminMsgs.length > 0) {
      showUnreadServiceDots();
    } else {
      hideUnreadServiceDots();
    }
  }

  function showUnreadServiceDots() {
    const dot1 = document.getElementById('merchant-service-dot');
    const dot2 = document.getElementById('nav-service-dot');
    if (dot1) dot1.style.display = 'block';
    if (dot2) dot2.style.display = 'block';
  }

  function hideUnreadServiceDots() {
    const dot1 = document.getElementById('merchant-service-dot');
    const dot2 = document.getElementById('nav-service-dot');
    if (dot1) dot1.style.display = 'none';
    if (dot2) dot2.style.display = 'none';
  }

  // Sub View Handlers
  window.openMerchantService = function() {
    document.getElementById('sub-service').classList.add('active');
    if (chatMessages && chatMessages.length > 0) {
      const adminMsgs = chatMessages.filter(m => m.sender === 'admin');
      if (adminMsgs.length > 0) {
        const maxId = Math.max(...adminMsgs.map(m => m.id || 0));
        lastSeenAdminMsgId = maxId;
        localStorage.setItem('tiktok_last_seen_admin_msg_id', lastSeenAdminMsgId);
      }
    }
    hideUnreadServiceDots();
    scrollChatToBottom();
  };

  window.openRecharge = function() {
    document.getElementById('sub-recharge').classList.add('active');
  };

  window.openWithdrawal = function() {
    document.getElementById('sub-withdrawal').classList.add('active');
  };

  // Order Detail Sub-View Handlers (100% Screenshot Match)
  window.openOrderDetail = function(orderId) {
    const list = (orders && orders.length > 0) ? orders : DEFAULT_ORDERS;
    const order = list.find(o => o.id == orderId) || list[0];
    if (!order) return;

    const setT = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const img = document.getElementById('od-img');
    if (img) img.src = order.product_image || '/uploads/powerstation.png';

    setT('od-title', order.product_title);
    setT('od-qty', `x${order.quantity || 1}`);
    setT('od-price', `$ ${parseFloat(order.price).toFixed(2)}`);
    setT('od-order-no', order.order_no);
    setT('od-address', order.shipping_address || 'Šentrupert Tavcarjeva 62 Slovenia');
    setT('od-phone', order.phone_number || '386****005');
    setT('od-time', order.created_at || '2026-08-25 00:29:28');

    const earnings = order.profit ? parseFloat(order.profit) : (order.price * 0.15);
    const payment = order.total_amount ? parseFloat(order.total_amount) : (order.price * (order.quantity || 1));

    setT('od-earnings', `$ ${earnings.toFixed(2)}`);
    setT('od-payment', `$${payment.toFixed(2)}`);

    // Check Shipped / Logistics Status (100% Screenshot Match)
    const isShipped = order.status && (
      order.status.toLowerCase().includes('shipped') ||
      order.status.toLowerCase().includes('received') ||
      order.status.toLowerCase().includes('completed') ||
      order.status.toLowerCase().includes('shipment')
    );

    const noLogisticsElem = document.getElementById('od-no-logistics');
    const shippedProgressElem = document.getElementById('od-shipped-progress');
    const trackingNumElem = document.getElementById('od-tracking-num');
    const execTimeElem = document.getElementById('od-exec-time');

    if (isShipped) {
      if (noLogisticsElem) noLogisticsElem.style.display = 'none';
      if (shippedProgressElem) shippedProgressElem.style.display = 'block';
      if (trackingNumElem) trackingNumElem.textContent = order.tracking_number || order.order_no || '2026082455230395445550';
      if (execTimeElem) execTimeElem.textContent = order.execution_time || order.shipped_at || '2026-08-24 22:04:29';
    } else {
      if (noLogisticsElem) noLogisticsElem.style.display = 'block';
      if (shippedProgressElem) shippedProgressElem.style.display = 'none';
      if (trackingNumElem) trackingNumElem.textContent = '';
    }

    const isPickup = order.status && (
      order.status.includes('Pickup') ||
      order.status === 'To Pickup' ||
      order.status === 'Awaiting Pickup'
    );
    const odPickupWrap = document.getElementById('od-pickup-btn-wrap');
    if (odPickupWrap) {
      odPickupWrap.style.display = isPickup ? 'block' : 'none';
    }

    window.pickupCurrentDetailOrder = function() {
      closeSubView('sub-order-detail');
      pickupSingleOrder(order.id);
    };

    const view = document.getElementById('sub-order-detail');
    if (view) view.classList.add('active');
  };

  window.copyOrderNumber = function() {
    const el = document.getElementById('od-order-no');
    const orderNo = el ? el.textContent : '';
    if (navigator.clipboard && orderNo) {
      navigator.clipboard.writeText(orderNo);
    }
    showToast('Order number copied!');
  };

  // Financial Statements Sub-View Opener & Dynamic Feed (100% Screenshot Match)
  const DAILY_STATEMENTS_LOG = [
    { date: "2026-08-25", profit: 791.38, orders: 9 },
    { date: "2026-08-24", profit: 1285.22, orders: 8 },
    { date: "2026-08-23", profit: 494.18, orders: 3 },
    { date: "2026-08-22", profit: 2898.94, orders: 3 },
    { date: "2026-08-21", profit: 2283.40, orders: 1 },
    { date: "2026-08-20", profit: 0.00, orders: 0 },
    { date: "2026-08-19", profit: 540.24, orders: 1 },
    { date: "2026-08-18", profit: 1198.68, orders: 2 },
    { date: "2026-08-17", profit: 1940.82, orders: 2 },
    { date: "2026-08-16", profit: 2083.00, orders: 3 }
  ];

  window.openFinancialReportsView = function() {
    document.getElementById('sub-reports').classList.add('active');
    renderFinancialReportsFeed();
  };

  function renderFinancialReportsFeed() {
    const awaitingElem = document.getElementById('rep-awaiting-val');
    const profitElem = document.getElementById('rep-profit-val');
    const listElem = document.getElementById('reports-log-list');

    // Display Awaiting Amount (pending_balance) and Total Profit (total_income) as set by Admin!
    if (currentUser) {
      if (awaitingElem) awaitingElem.textContent = (currentUser.pending_balance !== undefined) ? Number(currentUser.pending_balance).toFixed(2) : '38017.34';
      if (profitElem) profitElem.textContent = (currentUser.total_income !== undefined) ? Number(currentUser.total_income).toFixed(2) : '19826.38';
    }

    if (listElem) {
      listElem.innerHTML = DAILY_STATEMENTS_LOG.map(log => `
        <div class="reports-log-card">
          <div class="rlc-row rlc-row-top">
            <div class="rlc-left">
              <i class="fa-regular fa-calendar-days rlc-icon-red"></i>
              <span>Date ${log.date}</span>
            </div>
            <div class="rlc-right">Profit $${log.profit.toFixed(2)}</div>
          </div>
          <div class="rlc-row">
            <div class="rlc-left">
              <i class="fa-solid fa-bolt rlc-icon-cyan"></i>
              <span>Total Orders:${log.orders}</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Funds Records Dataset (Matching Screenshots 1, 2, 3, 4 100%)
  const FUNDS_RECORDS_LOG = [
    // Page 1 (Screenshot 1)
    { type: "Order payment", date: "2026-08-24 17:16:39", amount: "-$970.23", is_negative: true, balance: "204.54", icon: "package" },
    { type: "Order payment", date: "2026-08-24 17:16:39", amount: "-$889.31", is_negative: true, balance: "1174.77", icon: "package" },
    { type: "Order completed", date: "2026-08-24 17:14:34", amount: "+ $900.38", is_negative: false, balance: "2064.08", icon: "package" },
    { type: "Order completed", date: "2026-08-24 17:14:34", amount: "+ $803.31", is_negative: false, balance: "1163.70", icon: "package" },
    { type: "Order payment", date: "2026-08-24 11:58:05", amount: "-$970.23", is_negative: true, balance: "360.39", icon: "package" },
    { type: "Order payment", date: "2026-08-24 11:57:47", amount: "-$889.31", is_negative: true, balance: "1330.62", icon: "package" },
    { type: "Order completed", date: "2026-08-24 11:41:29", amount: "+ $1046.25", is_negative: false, balance: "2219.93", icon: "package" },
    { type: "Order completed", date: "2026-08-24 11:41:18", amount: "+ $1141.45", is_negative: false, balance: "1173.68", icon: "package" },
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-24 11:14:02", amount: "+ $31.00", is_negative: false, balance: "32.23", icon: "bank" },
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-24 03:04:30", amount: "-$31.00", is_negative: true, balance: "0.23", icon: "bank" },
    { type: "Order payment", date: "2026-08-24 02:50:27", amount: "-$765.32", is_negative: true, balance: "31.23", icon: "package" },

    // Page 2 (Screenshot 2)
    { type: "Order payment", date: "2026-08-23 23:50:52", amount: "-$970.23", is_negative: true, balance: "796.55", icon: "package" },
    { type: "Order payment", date: "2026-08-23 21:22:14", amount: "-$889.31", is_negative: true, balance: "1766.78", icon: "package" },
    { type: "Order payment", date: "2026-08-23 21:22:14", amount: "-$970.23", is_negative: true, balance: "2656.09", icon: "package" },
    { type: "Order payment", date: "2026-08-23 18:17:44", amount: "-$682.81", is_negative: true, balance: "3626.32", icon: "package" },
    { type: "Order payment", date: "2026-08-23 18:17:44", amount: "-$889.31", is_negative: true, balance: "4309.13", icon: "package" },
    { type: "Order payment", date: "2026-08-23 18:17:44", amount: "-$970.23", is_negative: true, balance: "5198.44", icon: "package" },
    { type: "Order payment", date: "2026-08-23 18:17:44", amount: "-$940.38", is_negative: true, balance: "6168.67", icon: "package" },
    { type: "Order payment", date: "2026-08-23 18:17:44", amount: "-$970.23", is_negative: true, balance: "7109.05", icon: "package" },

    // Page 3 (Screenshot 3)
    { type: "Order payment", date: "2026-08-22 11:08:11", amount: "-$970.23", is_negative: true, balance: "1382.67", icon: "package" },
    { type: "Order completed", date: "2026-08-22 10:37:30", amount: "+ $1251.32", is_negative: false, balance: "2352.90", icon: "package" },
    { type: "Order payment", date: "2026-08-21 21:36:11", amount: "-$6306.90", is_negative: true, balance: "1101.58", icon: "package" },
    { type: "Manual recharge", date: "2026-08-21 21:28:33", amount: "+ $4450.00", is_negative: false, balance: "7408.48", icon: "bank" },
    { type: "Order payment", date: "2026-08-21 11:51:22", amount: "-$9056.56", is_negative: true, balance: "2958.48", icon: "package" },
    { type: "Order completed", date: "2026-08-21 11:17:53", amount: "+ $3601.52", is_negative: false, balance: "12015.04", icon: "package" },
    { type: "Order completed", date: "2026-08-21 11:17:53", amount: "+ $5327.40", is_negative: false, balance: "8413.52", icon: "package" },
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-21 11:07:44", amount: "+ $500.00", is_negative: false, balance: "3086.12", icon: "bank" },
    { type: "Order payment", date: "2026-08-21 03:19:02", amount: "-$1063.62", is_negative: true, balance: "2586.12", icon: "package" },
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-21 00:37:47", amount: "-$500.00", is_negative: true, balance: "3649.74", icon: "bank" },
    { type: "Order payment", date: "2026-08-21 00:32:56", amount: "-$12939.10", is_negative: true, balance: "4149.74", icon: "package" },

    // Page 4 (Screenshot 4)
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-19 12:32:11", amount: "+ $11761.00", is_negative: false, balance: "17088.84", icon: "bank" },
    { type: "Order completed", date: "2026-08-19 12:31:00", amount: "+ $5327.40", is_negative: false, balance: "5327.84", icon: "package" },
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-19 12:20:11", amount: "-$11761.00", is_negative: true, balance: "0.44", icon: "bank" },
    { type: "Order payment", date: "2026-08-19 12:19:18", amount: "-$4528.28", is_negative: true, balance: "11761.44", icon: "package" },
    { type: "Order completed", date: "2026-08-19 11:57:33", amount: "+ $5895.44", is_negative: false, balance: "16289.72", icon: "package" },
    { type: "Order completed", date: "2026-08-19 11:57:25", amount: "+ $7611.25", is_negative: false, balance: "10394.28", icon: "package" },
    { type: "Order completed", date: "2026-08-18 22:05:44", amount: "+ $2663.70", is_negative: false, balance: "2783.03", icon: "package" },
    { type: "Order payment", date: "2026-08-18 18:05:36", amount: "-$3061.28", is_negative: true, balance: "119.33", icon: "package" },
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-17 18:24:32", amount: "+ $3180.00", is_negative: false, balance: "3180.61", icon: "bank" },
    { type: "Withdraw to Meezan Bank(7401)", date: "2026-08-17 18:11:14", amount: "-$3180.00", is_negative: true, balance: "0.61", icon: "bank" },
    { type: "Order payment", date: "2026-08-17 18:10:19", amount: "-$2264.14", is_negative: true, balance: "3180.61", icon: "package" }
  ];

  window.openRecords = function() {
    document.getElementById('sub-records').classList.add('active');
    renderFundsRecordsFeed();
  };

  function renderFundsRecordsFeed() {
    const container = document.getElementById('records-list-container');
    if (!container) return;

    container.innerHTML = FUNDS_RECORDS_LOG.map(r => `
      <div class="funds-record-card">
        <div class="frc-left">
          <div class="${r.icon === 'bank' ? 'frc-icon-bank' : 'frc-icon-package'}">
            <i class="${r.icon === 'bank' ? 'fa-solid fa-money-bill-transfer' : 'fa-solid fa-box-archive'}"></i>
          </div>
          <div>
            <div class="frc-title-text">${r.type}</div>
            <div class="frc-time-text">${r.date}</div>
          </div>
        </div>
        <div class="frc-right">
          <div class="${r.is_negative ? 'frc-amount-red' : 'frc-amount-green'}">${r.amount}</div>
          <div class="frc-balance-text">Balance:${r.balance}</div>
        </div>
      </div>
    `).join('');
  }

  window.closeSubView = function(id) {
    document.getElementById(id).classList.remove('active');
  };

  // Withdrawal Method Bottom Sheet Logic (Screenshots 1 & 2 & 4)
  window.openWithdrawalMethodSheet = function() {
    document.getElementById('withdrawal-sheet-backdrop').classList.add('active');
  };

  window.closeWithdrawalMethodSheet = function() {
    document.getElementById('withdrawal-sheet-backdrop').classList.remove('active');
  };

  // Bank Method Notice Popup Handlers
  window.showBankNoticeModal = function() {
    const modal = document.getElementById('bank-notice-modal');
    if (modal) modal.classList.add('active');
  };

  window.closeBankNoticeModal = function() {
    const modal = document.getElementById('bank-notice-modal');
    if (modal) modal.classList.remove('active');
  };

  window.chooseWithdrawalMethod = function(method) {
    closeWithdrawalMethodSheet();

    if (method === 'Bank Card' || method.toLowerCase().includes('bank')) {
      showBankNoticeModal();
      return;
    }

    selectedWithdrawalMethod = method;

    const label = document.getElementById('withdraw-selected-method');
    if (label) {
      label.textContent = method;
      label.parentElement.classList.add('selected');
    }

    const bankFields = document.getElementById('bank-card-fields');
    if (bankFields) {
      bankFields.style.display = 'none';
    }
  };

  // Inline "All" Balance Fill Button Logic (Screenshots 1 & 4)
  window.fillAllBalance = function() {
    if (currentUser) {
      document.getElementById('withdraw-amount').value = currentUser.balance;
    }
  };

  // Submit Withdrawal Request
  window.submitWithdrawal = async function() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const fullName = document.getElementById('withdraw-fullname').value.trim();
    const bankName = document.getElementById('withdraw-bankname').value.trim();
    const iban = document.getElementById('withdraw-iban').value.trim();

    if (!amount || amount <= 0) {
      showToast('Please enter a valid withdrawal amount');
      return;
    }

    const currentBal = currentUser ? currentUser.balance : 205.54;
    if (amount > currentBal) {
      showToast('Insufficient Balance!');
      return;
    }

    if (selectedWithdrawalMethod === 'Bank Card' && (!fullName || !bankName || !iban)) {
      showToast('Please fill in all bank details');
      return;
    }

    try {
      const res = await fetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedWithdrawalMethod,
          amount,
          full_name: fullName,
          bank_name: bankName,
          iban: iban
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Withdrawal request has been submitted');
        closeSubView('sub-withdrawal');
        document.getElementById('withdraw-amount').value = '';
        await fetchUserData();
      } else {
        showToast(json.error || 'Insufficient Balance!');
      }
    } catch (err) {
      if (currentUser) {
        currentUser.balance = Math.max(0, currentUser.balance - amount);
        updateUserUI();
      }
      showToast('Withdrawal request has been submitted');
      closeSubView('sub-withdrawal');
    }
  };

  // Recharge Modal Handlers
  window.selectRechargeMethod = function(method) {
    if (method.toLowerCase().includes('bank')) {
      showBankNoticeModal();
      return;
    }
    document.getElementById('recharge-modal-title').textContent = `${method} Recharge`;
    document.getElementById('recharge-modal-backdrop').classList.add('active');
  };

  window.closeRechargeModal = function() {
    document.getElementById('recharge-modal-backdrop').classList.remove('active');
  };

  window.submitRecharge = async function() {
    const amount = document.getElementById('recharge-amount-input').value;
    const receiptFile = document.getElementById('recharge-receipt-file').files[0];

    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid recharge amount');
      return;
    }

    const formData = new FormData();
    formData.append('method', 'USDT');
    formData.append('amount', amount);
    if (receiptFile) formData.append('receipt', receiptFile);

    try {
      const res = await fetch('/api/recharge', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        showToast('Recharge request submitted');
        closeRechargeModal();
        closeSubView('sub-recharge');
        document.getElementById('recharge-amount-input').value = '';
      } else {
        showToast(json.error || 'Recharge failed');
      }
    } catch (err) {
      showToast('Error submitting recharge');
    }
  };

  // Financial Records Sub View
  window.openRecords = async function() {
    document.getElementById('sub-records').classList.add('active');
    try {
      const res = await fetch('/api/transactions');
      const json = await res.json();
      if (json.success) {
        const container = document.getElementById('records-list-container');
        if (json.data.length === 0) {
          container.innerHTML = `<div class="no-data">No transaction records</div>`;
          return;
        }
        container.innerHTML = json.data.map(t => `
          <div class="record-card">
            <div>
              <div class="rec-type">${t.type.toUpperCase()} - ${t.method}</div>
              <div class="rec-date">${t.created_at}</div>
            </div>
            <div>
              <div class="rec-amount">$ ${t.amount.toFixed(2)}</div>
              <div class="rec-status status-${t.status}">${t.status}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      showToast('Error loading records');
    }
  };

  window.closeSubView = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
    updateUnreadServiceBadge();
  };

  // Toast Notification Helper
  window.showToast = function(msg) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2500);
  };
});
