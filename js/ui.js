/* ==========================================================================
   Kasir Kue — rendering helpers (v3)
   ========================================================================== */

function formatRupiah(n) {
  n = Math.round(Number(n) || 0);
  return 'Rp' + n.toLocaleString('id-ID');
}
function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function el(id) { return document.getElementById(id); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 2200);
}
function openSheet(id) { el(id).classList.add('show'); }
function closeSheet(id) { el(id).classList.remove('show'); }

/* ---------------- Top bar / drawer ---------------- */

function renderTopBar(title, sub) {
  el('screenTitle').textContent = title;
  el('screenSub').textContent = sub || '';
}

function renderAvatars() {
  const shift = ShiftStore.current();
  const label = shift ? initials(shift.kasirName) : '?';
  el('btnAvatar').textContent = label;
  el('drawerAvatar').textContent = label;
  el('drawerKasirName').textContent = shift ? shift.kasirName : 'Kasir';
  el('drawerShiftInfo').textContent = shift ? `Shift sejak ${formatDateTime(shift.startTime)}` : 'Shift belum dibuka';
}

/* ---------------- Splash / login ---------------- */

function renderLoginScreen() {
  const settings = SettingsStore.get();
  el('loginStoreName').textContent = settings.storeName || 'Toko Kue';
  const picker = el('kasirAvatarPicker');
  const nameField = el('loginNameField');
  const btnOther = el('btnLoginOther');

  const staffNames = StaffStore.all().map(s => s.name);
  const namesToShow = staffNames.length > 0 ? staffNames : (settings.kasirList || []);

  if (namesToShow.length > 0) {
    picker.style.display = 'flex';
    picker.innerHTML = namesToShow.map(n => `
      <button class="avatar-pick-btn" data-name="${escapeHtml(n)}">
        <span class="ap-circle">${initials(n)}</span>
        <span class="ap-label">${escapeHtml(n)}</span>
      </button>`).join('');
    nameField.style.display = 'none';
    btnOther.style.display = 'block';
    el('loginKasirName').value = '';
  } else {
    picker.style.display = 'none';
    nameField.style.display = 'block';
    btnOther.style.display = 'none';
  }
  el('loginKasirName').value = '';
  el('loginStartCash').value = '';
  state.selectedLoginKasir = null;
}

/* ---------------- Cart helpers ---------------- */

function cartKey(productId, variantId) { return productId + (variantId ? '::' + variantId : ''); }

function getLineInfo(productId, variantId) {
  const p = ProductStore.all().find(x => x.id === productId);
  if (!p) return null;
  if (p.hasVariants && variantId) {
    const v = p.variants.find(x => x.id === variantId);
    if (!v) return null;
    return { product: p, variant: v, name: `${p.name} (${v.name})`, price: v.price, stock: v.stock, trackStock: true, costPrice: v.costPrice || 0 };
  }
  return { product: p, variant: null, name: p.name, price: p.sellingPrice, stock: p.stock, trackStock: !!p.trackStock, costPrice: p.costPrice || 0 };
}

function cartTotals(cart, discount) {
  let subtotal = 0;
  cart.forEach(c => {
    const info = getLineInfo(c.productId, c.variantId);
    if (info) subtotal += info.price * c.qty;
  });
  const disc = Math.min(Number(discount) || 0, subtotal);
  return { subtotal, discount: disc, total: subtotal - disc };
}

/* ---------------- Kasir view ---------------- */

function renderCategoryChips(active) {
  const cats = CategoryStore.all().filter(c => c.isActive);
  const chips = [{ id: 'all', name: 'Semua' }, ...cats];
  el('categoryChips').innerHTML = chips.map(c =>
    `<button class="chip ${c.id === active ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`
  ).join('');
}

function renderProductGrid(category, cart, query) {
  let products = ProductStore.all().filter(p => p.isActive !== false);
  if (category !== 'all') products = products.filter(p => p.categoryId === category);
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }
  const grid = el('productGrid');
  const catMap = {};
  CategoryStore.all().forEach(c => catMap[c.id] = c.name);

  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state">Tidak ada produk yang cocok.</div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    let qtyInCart = 0;
    cart.forEach(c => { if (c.productId === p.id) qtyInCart += c.qty; });
    const catName = catMap[p.categoryId] || 'Lainnya';
    const isMinuman = catName.toLowerCase().includes('minuman');

    let priceLabel, metaLabel, outOfStock = false, lowStock = false;
    if (p.hasVariants) {
      const prices = p.variants.map(v => v.price);
      priceLabel = prices.length ? `${formatRupiah(Math.min(...prices))}+` : formatRupiah(0);
      const totalStock = p.variants.reduce((s, v) => s + (v.stock || 0), 0);
      outOfStock = totalStock <= 0;
      metaLabel = `${catName} · ${outOfStock ? 'Stok habis' : p.variants.length + ' varian'}`;
    } else {
      priceLabel = formatRupiah(p.sellingPrice);
      outOfStock = p.trackStock && p.stock <= 0;
      lowStock = p.trackStock && p.stock > 0 && p.stock <= (p.minimumStock || 5);
      metaLabel = `${catName} · ${p.trackStock ? (outOfStock ? 'Stok habis' : 'sisa ' + p.stock) : 'selalu tersedia'}`;
    }

    return `
      <button class="product-list-row ${outOfStock ? 'disabled' : ''}" data-id="${p.id}" ${outOfStock ? 'disabled' : ''}>
        ${qtyInCart > 0 ? `<span class="pl-qty-badge">${qtyInCart}</span>` : ''}
        <span class="pl-thumb ${isMinuman ? 'minuman' : ''}">${initials(p.name)}</span>
        <span class="pl-info">
          <span class="pl-name">${escapeHtml(p.name)}</span>
          <span class="pl-meta ${lowStock || outOfStock ? 'low' : ''}">${metaLabel}</span>
        </span>
        <span class="pl-price">${priceLabel}</span>
      </button>`;
  }).join('');
}

function renderCartBar(cart) {
  const bar = el('cartBar');
  if (cart.length === 0) { bar.classList.remove('show'); return; }
  let count = 0, total = 0;
  cart.forEach(c => {
    const info = getLineInfo(c.productId, c.variantId);
    if (!info) return;
    count += c.qty;
    total += c.qty * info.price;
  });
  el('cartCount').textContent = `${count} item`;
  el('cartTotal').textContent = formatRupiah(total);
  bar.classList.add('show');
}

/* ---------------- Variant picker ---------------- */

function renderVariantSheet(product) {
  el('variantSheetTitle').textContent = product.name;
  el('variantList').innerHTML = product.variants.map(v => {
    const out = (v.stock || 0) <= 0;
    return `
      <button class="variant-pick" data-vid="${v.id}" ${out ? 'disabled' : ''} style="width:100%; text-align:left; border:1px solid var(--line);">
        <span><span class="vp-name">${escapeHtml(v.name)}</span><br><span class="vp-stock">${out ? 'Stok habis' : 'Stok ' + v.stock}</span></span>
        <span class="vp-price">${formatRupiah(v.price)}</span>
      </button>`;
  }).join('');
}

/* ---------------- Held transactions ---------------- */

function renderHeldBadge() {
  const held = HeldStore.all();
  const badge = el('heldCount');
  if (held.length > 0) { badge.style.display = 'flex'; badge.textContent = held.length; }
  else badge.style.display = 'none';
}

function renderHeldList() {
  const held = HeldStore.all();
  const wrap = el('heldList');
  if (held.length === 0) { wrap.innerHTML = `<div class="empty-state">Tidak ada transaksi tertahan.</div>`; return; }
  wrap.innerHTML = held.map(h => {
    const t = cartTotals(h.cart, h.discount);
    return `
      <div class="list-row">
        <div class="lr-main">
          <div class="lr-title">${h.cart.reduce((s, c) => s + c.qty, 0)} item · ${escapeHtml(h.kasirName)}</div>
          <div class="lr-sub">${formatDateTime(h.createdAt)} · ${formatRupiah(t.total)}</div>
        </div>
        <div class="lr-actions">
          <button class="pill-btn" data-act="resume" data-id="${h.id}">Lanjutkan</button>
          <button class="pill-btn danger" data-act="delete" data-id="${h.id}">Hapus</button>
        </div>
      </div>`;
  }).join('');
}

/* ---------------- Cart sheet ---------------- */

function renderCartSheet(cart, discount) {
  const wrap = el('cartItems');
  if (cart.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Keranjang masih kosong.</div>`;
  } else {
    wrap.innerHTML = cart.map(c => {
      const info = getLineInfo(c.productId, c.variantId);
      if (!info) return '';
      const key = cartKey(c.productId, c.variantId);
      return `
        <div class="cart-item">
          <div><div class="ci-name">${escapeHtml(info.name)}</div><div class="ci-sub">${formatRupiah(info.price)} / item</div></div>
          <div class="stepper">
            <button data-act="dec" data-key="${key}">−</button>
            <span class="qv">${c.qty}</span>
            <button data-act="inc" data-key="${key}">+</button>
          </div>
        </div>`;
    }).join('');
  }
  const t = cartTotals(cart, discount);
  el('sumSubtotal').textContent = formatRupiah(t.subtotal);
  el('sumDiscount').textContent = formatRupiah(t.discount);
  el('sumTotal').textContent = formatRupiah(t.total);
  el('btnGoCheckout').disabled = cart.length === 0;
  el('btnHoldCart').disabled = cart.length === 0;
}

/* ---------------- Payment sheet ---------------- */

function roundUpTo(n, step) { return Math.ceil(n / step) * step; }
function quickCashAmounts(total) {
  if (total <= 0) return [];
  const opts = new Set([total, roundUpTo(total, 5000), roundUpTo(total, 10000), roundUpTo(total, 50000)]);
  return Array.from(opts).sort((a, b) => a - b).slice(0, 4);
}
function renderPaymentMethodButtons(active) {
  const settings = SettingsStore.get();
  const methods = Object.keys(settings.paymentMethods).filter(m => settings.paymentMethods[m]);
  el('paymentMethod').innerHTML = methods.map(m =>
    `<button data-method="${m}" class="${m === active ? 'active' : ''}">${m}</button>`
  ).join('');
}
function renderPaymentSheet(cart, discount, method, cashPaid) {
  const t = cartTotals(cart, discount);
  el('payTotal').textContent = formatRupiah(t.total);
  const cashFields = el('cashFields');
  const changeRow = el('changeRow');
  if (method === 'Tunai') {
    cashFields.style.display = 'block';
    changeRow.style.display = 'flex';
    const change = Math.max(0, (Number(cashPaid) || 0) - t.total);
    el('payChange').textContent = formatRupiah(change);
    el('quickAmounts').innerHTML = quickCashAmounts(t.total).map(a => `<button data-amt="${a}">${formatRupiah(a)}</button>`).join('');
  } else {
    cashFields.style.display = 'none';
    changeRow.style.display = 'none';
  }
}

/* ---------------- Produk / kategori management ---------------- */

function renderProductList() {
  const products = ProductStore.all();
  const catMap = {};
  CategoryStore.all().forEach(c => catMap[c.id] = c.name);
  const wrap = el('productList');
  if (products.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada produk. Tambahkan produk pertamamu.</div>`; return; }
  wrap.innerHTML = products.map(p => {
    let priceLabel, subLabel;
    if (p.hasVariants) {
      const prices = p.variants.map(v => v.price);
      priceLabel = prices.length ? `${formatRupiah(Math.min(...prices))}–${formatRupiah(Math.max(...prices))}` : '-';
      subLabel = `${catMap[p.categoryId] || 'Lainnya'} · ${p.variants.length} varian`;
    } else {
      priceLabel = formatRupiah(p.sellingPrice);
      subLabel = `${catMap[p.categoryId] || 'Lainnya'} · ${p.trackStock ? 'Stok ' + p.stock : 'Selalu tersedia'}`;
      if (p.sku) subLabel = `${p.sku} · ` + subLabel;
    }
    return `
      <div class="list-row" data-id="${p.id}" data-action="edit-product">
        <div class="lr-main"><div class="lr-title">${escapeHtml(p.name)}</div><div class="lr-sub">${subLabel}</div></div>
        <div class="lr-value">${priceLabel}</div>
      </div>`;
  }).join('');
}

function populateCategorySelect(selectedId) {
  const sel = el('pfCategorySelect');
  const cats = CategoryStore.all().filter(c => c.isActive);
  sel.innerHTML = cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  if (selectedId) sel.value = selectedId;
}

function renderCategoryManageList() {
  const cats = CategoryStore.all();
  const wrap = el('categoryList');
  if (cats.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada kategori.</div>`; return; }
  wrap.innerHTML = cats.map(c => `
    <div class="cat-row"><span>${escapeHtml(c.name)}</span><button class="pill-btn danger" data-act="del-cat" data-id="${c.id}">Hapus</button></div>`).join('');
}

function renderVariantEditor(variants) {
  const wrap = el('variantEditorList');
  wrap.innerHTML = variants.map((v, i) => `
    <div class="variant-row" data-idx="${i}">
      <input class="vr-name" type="text" placeholder="Nama (mis. 15 cm)" value="${escapeHtml(v.name || '')}" data-field="name">
      <input class="vr-price" type="number" placeholder="Harga" value="${v.price || ''}" data-field="price">
      <input class="vr-stock" type="number" placeholder="Stok" value="${v.stock || ''}" data-field="stock">
      <button data-act="del-variant" data-idx="${i}">×</button>
    </div>`).join('');
}

/* ---------------- Shift view ---------------- */

function renderShiftPanel() {
  const shift = ShiftStore.current();
  const wrap = el('shiftPanel');
  if (!shift) { wrap.innerHTML = `<div class="empty-state">Shift belum dibuka.</div>`; return; }
  const trxAll = TransactionStore.all().filter(t => t.shiftId === shift.id && t.status === 'completed');
  const cashSales = trxAll.filter(t => t.payment.method === 'Tunai').reduce((s, t) => s + t.total, 0);
  const nonCashSales = trxAll.filter(t => t.payment.method !== 'Tunai').reduce((s, t) => s + t.total, 0);
  wrap.innerHTML = `
    <div class="panel">
      <div class="totals-row"><span>Kasir</span><span>${escapeHtml(shift.kasirName)}</span></div>
      <div class="totals-row"><span>Dibuka</span><span>${formatDateTime(shift.startTime)}</span></div>
      <div class="totals-row"><span>Kas awal</span><span>${formatRupiah(shift.startCash)}</span></div>
      <div class="totals-row"><span>Penjualan tunai</span><span>${formatRupiah(cashSales)}</span></div>
      <div class="totals-row"><span>Penjualan non-tunai</span><span>${formatRupiah(nonCashSales)}</span></div>
      <div class="totals-row grand"><span>Transaksi</span><span>${trxAll.length}</span></div>
    </div>
    <button class="btn btn-primary" id="btnOpenCloseShift">Tutup shift</button>
  `;
}

function renderCloseShiftSummary() {
  const shift = ShiftStore.current();
  if (!shift) return;
  const cashSales = TransactionStore.all()
    .filter(t => t.shiftId === shift.id && t.payment.method === 'Tunai' && t.status === 'completed')
    .reduce((s, t) => s + t.total, 0);
  const expected = shift.startCash + cashSales;
  el('closeShiftSummary').innerHTML = `
    <div class="totals-row"><span>Kas awal</span><span>${formatRupiah(shift.startCash)}</span></div>
    <div class="totals-row"><span>Penjualan tunai</span><span>${formatRupiah(cashSales)}</span></div>
    <div class="totals-row grand"><span>Kas seharusnya</span><span>${formatRupiah(expected)}</span></div>
  `;
}

function renderShiftHistory() {
  const shifts = ShiftStore.all();
  const wrap = el('shiftHistory');
  if (shifts.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada riwayat shift.</div>`; return; }
  wrap.innerHTML = shifts.slice(0, 20).map(s => {
    const diffLabel = s.difference === 0 ? 'Pas' : (s.difference > 0 ? `Lebih ${formatRupiah(s.difference)}` : `Kurang ${formatRupiah(Math.abs(s.difference))}`);
    return `
      <div class="list-row">
        <div class="lr-main"><div class="lr-title">${escapeHtml(s.kasirName)}</div><div class="lr-sub">${formatDateTime(s.startTime)} – ${formatDateTime(s.endTime)}</div></div>
        <div class="lr-main" style="text-align:right;"><div class="lr-value">${diffLabel}</div></div>
      </div>`;
  }).join('');
}

/* ---------------- Laporan ---------------- */

function rangeFromTs(range) {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (range === 'week') return Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (range === 'month') return Date.now() - 30 * 24 * 60 * 60 * 1000;
  return 0;
}

function computeLaporanData(range) {
  const fromTs = rangeFromTs(range);
  const trxAll = TransactionStore.inRange(fromTs);
  const trx = trxAll.filter(t => t.status === 'completed');
  const omzet = trx.reduce((s, t) => s + t.total, 0);
  let qtySum = 0, cogs = 0;
  trx.forEach(t => t.items.forEach(it => { qtySum += it.qty; cogs += (it.costPrice || 0) * it.qty; }));
  return { trxAll, trx, omzet, qtySum, cogs, profit: omzet - cogs };
}

function renderRingkasan(data) {
  el('statOmzet').textContent = formatRupiah(data.omzet);
  el('statTrx').textContent = data.trx.length;
  el('statQty').textContent = data.qtySum;
  el('statProfit').textContent = formatRupiah(data.profit);

  const byProduct = {};
  data.trx.forEach(t => t.items.forEach(it => {
    if (!byProduct[it.name]) byProduct[it.name] = { qty: 0, revenue: 0 };
    byProduct[it.name].qty += it.qty;
    byProduct[it.name].revenue += it.qty * it.price;
  }));
  const top = Object.entries(byProduct).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  el('topProducts').innerHTML = top.length === 0
    ? `<div class="empty-state">Belum ada penjualan pada rentang ini.</div>`
    : top.map(([name, d]) => `
      <div class="list-row"><div class="lr-main"><div class="lr-title">${escapeHtml(name)}</div><div class="lr-sub">${d.qty} terjual</div></div><div class="lr-value">${formatRupiah(d.revenue)}</div></div>`).join('');
}

function renderLabaRugi(data) {
  const margin = data.omzet > 0 ? (data.profit / data.omzet * 100) : 0;
  el('labaRugiPanel').innerHTML = `
    <div class="totals-row"><span>Omzet</span><span>${formatRupiah(data.omzet)}</span></div>
    <div class="totals-row"><span>HPP (harga pokok)</span><span>${formatRupiah(data.cogs)}</span></div>
    <div class="totals-row grand"><span>Laba kotor</span><span>${formatRupiah(data.profit)}</span></div>
    <div class="totals-row"><span>Margin</span><span>${margin.toFixed(1)}%</span></div>
  `;
}

function renderTransaksiHistory(data) {
  el('trxHistory').innerHTML = data.trxAll.length === 0
    ? `<div class="empty-state">Belum ada transaksi pada rentang ini.</div>`
    : data.trxAll.slice(0, 80).map(t => `
      <div class="list-row" data-trxid="${t.id}">
        <div class="lr-main">
          <div class="lr-title">${t.items.reduce((s, i) => s + i.qty, 0)} item · ${t.payment.method}
            <span class="status-badge ${t.status === 'void' ? 'void' : 'completed'}">${t.status === 'void' ? 'Dibatalkan' : 'Selesai'}</span>
          </div>
          <div class="lr-sub">${t.invoiceNumber} · ${formatDateTime(t.timestamp)} · ${escapeHtml(t.kasirName)}</div>
        </div>
        <div class="lr-main" style="text-align:right;">
          <div class="lr-value">${formatRupiah(t.total)}</div>
          ${t.status === 'completed' ? `<button class="pill-btn danger" data-act="void-trx" data-id="${t.id}" style="margin-top:6px;">Batalkan</button>` : ''}
        </div>
      </div>`).join('');
}

function renderByProductFull(data) {
  const byProduct = {};
  data.trx.forEach(t => t.items.forEach(it => {
    if (!byProduct[it.name]) byProduct[it.name] = { qty: 0, revenue: 0 };
    byProduct[it.name].qty += it.qty;
    byProduct[it.name].revenue += it.qty * it.price;
  }));
  const all = Object.entries(byProduct).sort((a, b) => b[1].qty - a[1].qty);
  el('byProductFull').innerHTML = all.length === 0
    ? `<div class="empty-state">Belum ada data.</div>`
    : all.map(([name, d]) => `
      <div class="list-row"><div class="lr-main"><div class="lr-title">${escapeHtml(name)}</div><div class="lr-sub">${d.qty} terjual</div></div><div class="lr-value">${formatRupiah(d.revenue)}</div></div>`).join('');
}

function renderByCategory(data) {
  const catMap = {};
  CategoryStore.all().forEach(c => catMap[c.id] = c.name);
  const prodMap = {};
  ProductStore.all().forEach(p => prodMap[p.id] = p);
  const byCat = {};
  data.trx.forEach(t => t.items.forEach(it => {
    const p = prodMap[it.productId];
    const catName = p ? (catMap[p.categoryId] || 'Lainnya') : 'Lainnya';
    byCat[catName] = (byCat[catName] || 0) + it.qty * it.price;
  }));
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  el('byCategory').innerHTML = entries.length === 0
    ? `<div class="empty-state">Belum ada data.</div>`
    : entries.map(([name, val]) => `<div class="list-row"><div class="lr-main"><div class="lr-title">${escapeHtml(name)}</div></div><div class="lr-value">${formatRupiah(val)}</div></div>`).join('');
}

function renderByPayment(data) {
  const byPay = {};
  data.trx.forEach(t => { byPay[t.payment.method] = (byPay[t.payment.method] || 0) + t.total; });
  const entries = Object.entries(byPay).sort((a, b) => b[1] - a[1]);
  el('byPayment').innerHTML = entries.length === 0
    ? `<div class="empty-state">Belum ada data.</div>`
    : entries.map(([name, val]) => `<div class="list-row"><div class="lr-main"><div class="lr-title">${escapeHtml(name)}</div></div><div class="lr-value">${formatRupiah(val)}</div></div>`).join('');
}

function exportCsv(range) {
  const fromTs = rangeFromTs(range);
  const trx = TransactionStore.inRange(fromTs);
  const rows = [['Invoice', 'Tanggal', 'Kasir', 'Item', 'Subtotal', 'Diskon', 'Total', 'Metode Bayar', 'Status']];
  trx.forEach(t => {
    const itemsStr = t.items.map(i => `${i.name} x${i.qty}`).join('; ');
    rows.push([t.invoiceNumber, formatDateTime(t.timestamp), t.kasirName, itemsStr, t.subtotal, t.discount, t.total, t.payment.method, t.status]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-kasirkue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Settings ---------------- */

function renderPaymentMethodToggles() {
  const settings = SettingsStore.get();
  el('paymentMethodToggles').innerHTML = Object.keys(settings.paymentMethods).map(m => `
    <div class="toggle-row"><span>${m}</span>
      <label class="switch"><input type="checkbox" data-method="${m}" ${settings.paymentMethods[m] ? 'checked' : ''}><span class="track"></span></label>
    </div>`).join('');
}

function renderKasirListManage() {
  const settings = SettingsStore.get();
  const wrap = el('kasirListManage');
  if (!settings.kasirList || settings.kasirList.length === 0) {
    wrap.innerHTML = `<div class="empty-state" style="padding:16px;">Belum ada nama kasir tersimpan.</div>`;
    return;
  }
  wrap.innerHTML = settings.kasirList.map((name, i) => `
    <div class="cat-row"><span>${escapeHtml(name)}</span><button class="pill-btn danger" data-act="del-kasir" data-idx="${i}">Hapus</button></div>`).join('');
}

/* ---------------- Receipt text ---------------- */

function buildReceiptText(trx) {
  const settings = SettingsStore.get();
  const lines = [];
  lines.push(settings.storeName || 'Toko Kue');
  if (settings.address) lines.push(settings.address);
  if (settings.phone) lines.push(settings.phone);
  lines.push('------------------------------');
  lines.push(trx.invoiceNumber);
  lines.push(formatDateTime(trx.timestamp));
  lines.push(`Kasir: ${trx.kasirName}`);
  lines.push('------------------------------');
  trx.items.forEach(it => {
    lines.push(`${it.name} x${it.qty}`);
    lines.push(`  ${formatRupiah(it.price)} x ${it.qty} = ${formatRupiah(it.price * it.qty)}`);
  });
  lines.push('------------------------------');
  lines.push(`Subtotal: ${formatRupiah(trx.subtotal)}`);
  if (trx.discount) lines.push(`Diskon: ${formatRupiah(trx.discount)}`);
  lines.push(`Total: ${formatRupiah(trx.total)}`);
  lines.push(`Bayar (${trx.payment.method}): ${formatRupiah(trx.payment.amountPaid || trx.total)}`);
  if (trx.payment.method === 'Tunai') lines.push(`Kembalian: ${formatRupiah(trx.payment.change || 0)}`);
  lines.push('------------------------------');
  lines.push(settings.receiptFooter || 'Terima kasih!');
  return lines.join('\n');
}

/* ==========================================================================
   v4 additions — stok opname, kontak, hutang piutang, pembelian, keuangan,
   absensi, staff
   ========================================================================== */

/* ---------------- Stok opname ---------------- */

function renderStokOpnameList() {
  const products = ProductStore.all().filter(p => !p.hasVariants && p.trackStock);
  const wrap = el('stokOpnameList');
  if (products.length === 0) { wrap.innerHTML = `<div class="empty-state">Tidak ada produk dengan stok terpantau.</div>`; return; }
  wrap.innerHTML = products.map(p => `
    <div class="list-row" data-id="${p.id}">
      <div class="lr-main"><div class="lr-title">${escapeHtml(p.name)}</div><div class="lr-sub">Stok sistem: ${p.stock}</div></div>
      <input type="number" class="opname-input" data-id="${p.id}" placeholder="${p.stock}" style="width:80px; padding:8px; border:1px solid var(--line); border-radius:8px; text-align:center;">
    </div>`).join('');
}

/* ---------------- Kontak (Pelanggan & Supplier) ---------------- */

function renderContactList(filterType) {
  let contacts = ContactStore.all();
  if (filterType && filterType !== 'all') contacts = contacts.filter(c => c.type === filterType);
  const wrap = el('contactList');
  if (contacts.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada kontak.</div>`; return; }
  wrap.innerHTML = contacts.map(c => `
    <div class="list-row" data-id="${c.id}" data-action="edit-contact">
      <div class="lr-main"><div class="lr-title">${escapeHtml(c.name)}</div><div class="lr-sub">${c.type === 'supplier' ? 'Supplier' : 'Pelanggan'}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</div></div>
      <span class="menu-row-arrow">›</span>
    </div>`).join('');
}

function populateSupplierSelect() {
  const suppliers = ContactStore.all().filter(c => c.type === 'supplier');
  el('pfSupplierSelect').innerHTML = suppliers.length === 0
    ? `<option value="">Belum ada supplier — tambah di Pelanggan &amp; Supplier</option>`
    : suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

function populateProductSelectForPurchase() {
  const products = ProductStore.all().filter(p => !p.hasVariants);
  el('pfProductSelect').innerHTML = products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

/* ---------------- Hutang & Piutang ---------------- */

function renderDebtList() {
  const debts = DebtStore.all().sort((a, b) => b.createdAt - a.createdAt);
  const wrap = el('debtList');
  if (debts.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada catatan hutang/piutang.</div>`; return; }
  wrap.innerHTML = debts.map(d => `
    <div class="list-row">
      <div class="lr-main">
        <div class="lr-title">${escapeHtml(d.name)} <span class="status-badge ${d.status === 'lunas' ? 'completed' : 'void'}">${d.status === 'lunas' ? 'Lunas' : 'Belum lunas'}</span></div>
        <div class="lr-sub">${d.type === 'hutang' ? 'Hutang toko' : 'Piutang toko'}${d.dueDate ? ' · jatuh tempo ' + d.dueDate : ''}</div>
      </div>
      <div class="lr-main" style="text-align:right;">
        <div class="lr-value">${formatRupiah(d.amount)}</div>
        <button class="pill-btn" data-act="toggle-debt" data-id="${d.id}" style="margin-top:6px;">${d.status === 'lunas' ? 'Tandai belum lunas' : 'Tandai lunas'}</button>
      </div>
    </div>`).join('');
}

/* ---------------- Pembelian dari Supplier ---------------- */

function renderPurchaseList() {
  const purchases = PurchaseStore.all();
  const wrap = el('purchaseList');
  if (purchases.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada pembelian tercatat.</div>`; return; }
  wrap.innerHTML = purchases.map(p => `
    <div class="list-row">
      <div class="lr-main"><div class="lr-title">${escapeHtml(p.productName)} · ${p.qty}x</div><div class="lr-sub">${escapeHtml(p.supplierName)} · ${formatDateTime(p.timestamp)}</div></div>
      <div class="lr-value">${formatRupiah(p.total)}</div>
    </div>`).join('');
}

/* ---------------- Keuangan ---------------- */

function renderCashLedger() {
  const entries = CashLedgerStore.all();
  const masuk = entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
  const keluar = entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
  el('statKasMasuk').textContent = formatRupiah(masuk);
  el('statKasKeluar').textContent = formatRupiah(keluar);
  const wrap = el('cashLedgerList');
  if (entries.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada catatan kas.</div>`; return; }
  wrap.innerHTML = entries.map(e => `
    <div class="list-row">
      <div class="lr-main"><div class="lr-title">${escapeHtml(e.note)}</div><div class="lr-sub">${formatDateTime(e.timestamp)}</div></div>
      <div class="lr-value" style="color:${e.type === 'in' ? 'var(--matcha-dark)' : 'var(--alert)'};">${e.type === 'in' ? '+' : '−'}${formatRupiah(e.amount)}</div>
    </div>`).join('');
}

/* ---------------- Absensi ---------------- */

function populateAbsensiStaffSelect() {
  const staff = StaffStore.all();
  const sel = el('absensiStaffSelect');
  sel.innerHTML = staff.length === 0
    ? `<option value="">Belum ada staf — tambah di Pengaturan &gt; Manajemen Staff</option>`
    : staff.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
}

function renderAttendanceList() {
  const records = AttendanceStore.all();
  const wrap = el('attendanceList');
  if (records.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada riwayat absensi.</div>`; return; }
  wrap.innerHTML = records.slice(0, 50).map(a => `
    <div class="list-row">
      <div class="lr-main"><div class="lr-title">${escapeHtml(a.staffName)}</div><div class="lr-sub">Masuk ${formatDateTime(a.clockIn)}${a.clockOut ? ' · Pulang ' + formatDateTime(a.clockOut) : ' · masih bekerja'}</div></div>
    </div>`).join('');
}

/* ---------------- Manajemen Staff ---------------- */

function renderStaffList() {
  const staff = StaffStore.all();
  const wrap = el('staffList');
  if (staff.length === 0) { wrap.innerHTML = `<div class="empty-state">Belum ada staf. Tambahkan staf pertamamu.</div>`; return; }
  wrap.innerHTML = staff.map(s => `
    <div class="list-row" data-id="${s.id}" data-action="edit-staff">
      <div class="lr-main"><div class="lr-title">${escapeHtml(s.name)}</div><div class="lr-sub">${escapeHtml(s.role)}</div></div>
      <span class="menu-row-arrow">›</span>
    </div>`).join('');
}
