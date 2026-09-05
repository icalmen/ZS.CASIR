/* ==========================================================================
   Kasir Kue — app controller (v3: splash/login + drawer navigation)
   ========================================================================== */

const state = {
  screen: 'kasir',
  laporanMode: 'menu',
  laporanRange: 'today',
  cart: [],
  category: 'all',
  searchQuery: '',
  discount: 0,
  paymentMethod: 'Tunai',
  editingProductId: null,
  editingVariants: [],
  lastTrx: null,
  pendingVariantProduct: null,
};

const SCREEN_TITLES = {
  kasir: 'Kasir',
  manajemen: 'Manajemen',
  produk: 'Barang & Jasa',
  laporan: 'Laporan',
  shift: 'Shift',
  pengaturan: 'Pengaturan',
};
const LAPORAN_TITLES = {
  menu: 'Laporan',
  ringkasan: 'Ringkasan Penjualan',
  labarugi: 'Laporan Laba Rugi',
  transaksi: 'Transaksi',
  byproduct: 'Penjualan Barang',
  bycategory: 'Penjualan Kategori',
  bypayment: 'Metode Pembayaran',
  shiftreport: 'Riwayat Shift',
};

/* ---------------- Top-level screen levels: splash / login / app ---------------- */

function showLevel(level) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el('appShell').classList.remove('active');
  if (level === 'app') el('appShell').classList.add('active');
  else el('screen-' + level).classList.add('active');
}

function goToLoginScreen() {
  showLevel('login');
  renderLoginScreen();
}

function enterApp() {
  showLevel('app');
  goToScreen('kasir');
}

/* ---------------- Drawer + hamburger/back behavior ---------------- */

function isChildScreen() {
  return state.screen === 'produk' || state.screen === 'stok' || state.screen === 'kontak' || state.screen === 'hutangpiutang' ||
    (state.screen === 'staff') ||
    (state.screen === 'laporan' && state.laporanMode !== 'menu');
}

function screenParent(name) {
  if (name === 'produk' || name === 'stok' || name === 'kontak' || name === 'hutangpiutang') return 'manajemen';
  if (name === 'staff') return 'pengaturan';
  return 'kasir';
}

function updateTopBarNav() {
  const btn = el('btnHamburger');
  btn.textContent = isChildScreen() ? '←' : '☰';
}

function openDrawer() { el('drawerBackdrop').classList.add('show'); }
function closeDrawer() { el('drawerBackdrop').classList.remove('show'); }

el('btnHamburger').addEventListener('click', () => {
  if (isChildScreen()) {
    if (state.screen === 'laporan') { state.laporanMode = 'menu'; renderLaporanScreen(); }
    else goToScreen(screenParent(state.screen));
  } else {
    openDrawer();
  }
});
el('drawerBackdrop').addEventListener('click', (e) => { if (e.target === el('drawerBackdrop')) closeDrawer(); });
el('btnAvatar').addEventListener('click', () => goToScreen('pengaturan'));

document.querySelectorAll('.drawer-item').forEach(btn => {
  btn.addEventListener('click', () => { closeDrawer(); goToScreen(btn.dataset.goto); });
});

/* ---------------- Screen switching ---------------- */

function goToScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen-body').forEach(s => s.classList.remove('active'));
  el('screen-' + name).classList.add('active');
  document.querySelectorAll('.drawer-item').forEach(b => b.classList.toggle('active', b.dataset.goto === name));

  const shift = ShiftStore.current();
  if (name === 'kasir') {
    renderTopBar('Kasir', shift ? `${shift.kasirName} · sejak ${formatDateTime(shift.startTime)}` : '');
    refreshKasir();
    el('cartBar').style.display = '';
  } else {
    el('cartBar').classList.remove('show');
  }
  if (name === 'manajemen') renderTopBar('Manajemen', '');
  if (name === 'produk') { renderTopBar('Barang & Jasa', ''); renderProductList(); }
  if (name === 'stok') { renderTopBar('Manajemen Stok', ''); renderStokOpnameList(); }
  if (name === 'kontak') { renderTopBar('Pelanggan & Supplier', ''); renderContactList('all'); }
  if (name === 'hutangpiutang') { renderTopBar('Hutang & Piutang', ''); renderDebtList(); }
  if (name === 'pembelian') { renderTopBar('Pembelian Supplier', ''); renderPurchaseList(); }
  if (name === 'keuangan') { renderTopBar('Keuangan', ''); renderCashLedger(); }
  if (name === 'absensi') { renderTopBar('Absensi', ''); populateAbsensiStaffSelect(); renderAttendanceList(); }
  if (name === 'staff') { renderTopBar('Manajemen Staff', ''); renderStaffList(); }
  if (name === 'shift') { renderTopBar('Shift', ''); renderShiftPanel(); }
  if (name === 'pengaturan') { renderTopBar('Pengaturan', ''); openPengaturanScreen(); }
  if (name === 'laporan') { state.laporanMode = 'menu'; renderLaporanScreen(); }

  updateTopBarNav();
  renderAvatars();
}

/* ---------------- Splash / onboarding ---------------- */

el('btnSplashStart').addEventListener('click', () => {
  const name = el('splashStoreName').value.trim();
  if (!name) { showToast('Isi nama toko dulu'); return; }
  const settings = SettingsStore.get();
  settings.storeName = name;
  settings.onboarded = true;
  SettingsStore.save(settings);
  goToLoginScreen();
});

/* ---------------- Login screen ---------------- */

el('kasirAvatarPicker').addEventListener('click', (e) => {
  const btn = e.target.closest('.avatar-pick-btn');
  if (!btn) return;
  document.querySelectorAll('.avatar-pick-btn').forEach(b => b.classList.toggle('active', b === btn));
  state.selectedLoginKasir = btn.dataset.name;
});

el('btnLoginOther').addEventListener('click', () => {
  el('kasirAvatarPicker').style.display = 'none';
  el('loginNameField').style.display = 'block';
  el('btnLoginOther').style.display = 'none';
  state.selectedLoginKasir = null;
});

el('btnLoginStart').addEventListener('click', () => {
  const nameFieldVisible = el('loginNameField').style.display !== 'none';
  const kasirName = nameFieldVisible ? el('loginKasirName').value.trim() : (state.selectedLoginKasir || '');
  const startCash = Number(el('loginStartCash').value);
  if (!kasirName) { showToast('Pilih atau isi nama kasir'); return; }
  if (isNaN(startCash) || startCash < 0) { showToast('Kas awal tidak valid'); return; }
  ShiftStore.open(kasirName, startCash);
  enterApp();
});

/* ---------------- Logout / tutup shift ---------------- */

el('btnLogout').addEventListener('click', () => {
  closeDrawer();
  renderCloseShiftSummary();
  el('csCash').value = '';
  openSheet('sheetCloseShift');
});

/* ---------------- Kasir / cart ---------------- */

function refreshKasir() {
  renderCategoryChips(state.category);
  renderProductGrid(state.category, state.cart, state.searchQuery);
  renderCartBar(state.cart);
  renderHeldBadge();
}

el('searchInput').addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderProductGrid(state.category, state.cart, state.searchQuery);
});

el('categoryChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  state.category = chip.dataset.cat;
  refreshKasir();
});

function addToCart(productId, variantId) {
  if (!ShiftStore.current()) { showToast('Shift belum dibuka'); return; }
  const info = getLineInfo(productId, variantId);
  if (!info) return;
  const key = cartKey(productId, variantId);
  const existing = state.cart.find(c => cartKey(c.productId, c.variantId) === key);
  const currentQty = existing ? existing.qty : 0;
  if (info.trackStock && currentQty + 1 > info.stock) { showToast('Stok tidak mencukupi'); return; }
  if (existing) existing.qty += 1;
  else state.cart.push({ productId, variantId: variantId || null, qty: 1 });
  refreshKasir();
  showToast(`${info.name} ditambahkan`);
}

el('productGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.product-list-row');
  if (!card || card.disabled) return;
  const product = ProductStore.all().find(p => p.id === card.dataset.id);
  if (!product) return;
  if (product.hasVariants) {
    state.pendingVariantProduct = product;
    renderVariantSheet(product);
    openSheet('sheetVariant');
  } else {
    addToCart(product.id, null);
  }
});

el('variantList').addEventListener('click', (e) => {
  const btn = e.target.closest('.variant-pick');
  if (!btn || btn.disabled) return;
  if (!state.pendingVariantProduct) return;
  addToCart(state.pendingVariantProduct.id, btn.dataset.vid);
  closeSheet('sheetVariant');
});
el('btnCloseVariant').addEventListener('click', () => closeSheet('sheetVariant'));

/* ---------------- Held transactions ---------------- */

el('btnHeld').addEventListener('click', () => { renderHeldList(); openSheet('sheetHeld'); });
el('btnCloseHeld').addEventListener('click', () => closeSheet('sheetHeld'));
el('heldList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === 'delete') { HeldStore.remove(id); renderHeldList(); renderHeldBadge(); return; }
  if (btn.dataset.act === 'resume') {
    if (state.cart.length > 0 && !confirm('Keranjang saat ini akan digantikan oleh transaksi tertahan ini. Lanjutkan?')) return;
    const held = HeldStore.all().find(h => h.id === id);
    if (!held) return;
    state.cart = held.cart;
    state.discount = held.discount || 0;
    HeldStore.remove(id);
    closeSheet('sheetHeld');
    refreshKasir();
    showToast('Transaksi dilanjutkan');
  }
});

el('cartBar').addEventListener('click', () => {
  renderCartSheet(state.cart, state.discount);
  el('discountInput').value = state.discount || '';
  openSheet('sheetCart');
});
el('btnCloseCart').addEventListener('click', () => closeSheet('sheetCart'));

el('cartItems').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const key = btn.dataset.key;
  const item = state.cart.find(c => cartKey(c.productId, c.variantId) === key);
  if (!item) return;
  if (btn.dataset.act === 'inc') {
    const info = getLineInfo(item.productId, item.variantId);
    if (info && info.trackStock && item.qty >= info.stock) { showToast('Stok tidak mencukupi'); return; }
    item.qty += 1;
  } else {
    item.qty -= 1;
    if (item.qty <= 0) state.cart = state.cart.filter(c => cartKey(c.productId, c.variantId) !== key);
  }
  renderCartSheet(state.cart, state.discount);
});

el('discountInput').addEventListener('input', (e) => {
  state.discount = Number(e.target.value) || 0;
  renderCartSheet(state.cart, state.discount);
});

el('btnHoldCart').addEventListener('click', () => {
  if (state.cart.length === 0) return;
  const shift = ShiftStore.current();
  HeldStore.save({ cart: state.cart, discount: state.discount, kasirName: shift ? shift.kasirName : '-' });
  state.cart = [];
  state.discount = 0;
  closeSheet('sheetCart');
  refreshKasir();
  showToast('Transaksi ditahan');
});

/* ---------------- Payment ---------------- */

el('btnGoCheckout').addEventListener('click', () => {
  if (state.cart.length === 0) return;
  closeSheet('sheetCart');
  const settings = SettingsStore.get();
  const methods = Object.keys(settings.paymentMethods).filter(m => settings.paymentMethods[m]);
  state.paymentMethod = methods.includes('Tunai') ? 'Tunai' : (methods[0] || 'Tunai');
  renderPaymentMethodButtons(state.paymentMethod);
  el('cashPaid').value = '';
  renderPaymentSheet(state.cart, state.discount, state.paymentMethod, 0);
  openSheet('sheetPayment');
});

el('btnBackToCart').addEventListener('click', () => {
  closeSheet('sheetPayment');
  renderCartSheet(state.cart, state.discount);
  openSheet('sheetCart');
});

el('paymentMethod').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-method]');
  if (!btn) return;
  state.paymentMethod = btn.dataset.method;
  document.querySelectorAll('#paymentMethod button').forEach(b => b.classList.toggle('active', b === btn));
  renderPaymentSheet(state.cart, state.discount, state.paymentMethod, el('cashPaid').value);
});

el('cashPaid').addEventListener('input', () => {
  renderPaymentSheet(state.cart, state.discount, state.paymentMethod, el('cashPaid').value);
});
el('quickAmounts').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-amt]');
  if (!btn) return;
  el('cashPaid').value = btn.dataset.amt;
  renderPaymentSheet(state.cart, state.discount, state.paymentMethod, btn.dataset.amt);
});

el('btnConfirmPay').addEventListener('click', () => {
  const shift = ShiftStore.current();
  if (!shift) { showToast('Shift belum dibuka'); return; }
  if (state.cart.length === 0) return;
  const t = cartTotals(state.cart, state.discount);
  const cashPaid = Number(el('cashPaid').value) || 0;
  if (state.paymentMethod === 'Tunai' && cashPaid < t.total) { showToast('Uang diterima kurang dari total'); return; }

  const items = state.cart.map(c => {
    const info = getLineInfo(c.productId, c.variantId);
    return { productId: c.productId, variantId: c.variantId || null, name: info.name, price: info.price, costPrice: info.costPrice, qty: c.qty };
  });
  const trx = {
    shiftId: shift.id, kasirName: shift.kasirName, items,
    subtotal: t.subtotal, discount: t.discount, total: t.total,
    payment: { method: state.paymentMethod, amountPaid: state.paymentMethod === 'Tunai' ? cashPaid : t.total, change: state.paymentMethod === 'Tunai' ? Math.max(0, cashPaid - t.total) : 0 },
  };
  const saved = TransactionStore.add(trx);
  state.cart.forEach(c => ProductStore.adjustStock(c.productId, c.variantId, -c.qty));
  state.lastTrx = saved;
  state.cart = [];
  state.discount = 0;
  closeSheet('sheetPayment');
  el('receiptText').textContent = buildReceiptText(saved);
  openSheet('sheetReceipt');
  refreshKasir();
});

el('btnNewTrx').addEventListener('click', () => closeSheet('sheetReceipt'));
el('btnPrintReceipt').addEventListener('click', () => {
  if (!state.lastTrx) return;
  el('print-area').textContent = buildReceiptText(state.lastTrx);
  window.print();
});
el('btnShareReceipt').addEventListener('click', async () => {
  if (!state.lastTrx) return;
  const text = buildReceiptText(state.lastTrx);
  if (navigator.share) { try { await navigator.share({ title: 'Struk transaksi', text }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(text); showToast('Struk disalin ke clipboard'); } catch (e) { showToast('Tidak bisa membagikan otomatis di perangkat ini'); } }
});

/* ---------------- Manajemen ---------------- */

el('rowBarangJasa').addEventListener('click', () => goToScreen('produk'));
el('rowStok').addEventListener('click', () => goToScreen('produk'));
el('rowKategori').addEventListener('click', () => { renderCategoryManageList(); openSheet('sheetCategory'); });

/* ---------------- Produk ---------------- */

function fillProductForm(product) {
  state.editingProductId = product ? product.id : null;
  state.editingVariants = product && product.hasVariants ? JSON.parse(JSON.stringify(product.variants)) : [];
  el('productFormTitle').textContent = product ? 'Edit produk' : 'Tambah produk';
  el('pfId').value = product ? product.id : '';
  el('pfName').value = product ? product.name : '';
  el('pfSku').value = product ? (product.sku || '') : '';
  el('pfUnit').value = product ? (product.unit || '') : '';
  populateCategorySelect(product ? product.categoryId : null);
  const hasVariants = product ? !!product.hasVariants : false;
  document.querySelectorAll('#pfHasVariants button').forEach(b => b.classList.toggle('active', (b.dataset.v === '1') === hasVariants));
  el('pfSimpleFields').style.display = hasVariants ? 'none' : 'block';
  el('pfVariantFields').style.display = hasVariants ? 'block' : 'none';
  el('pfPrice').value = product && !product.hasVariants ? product.sellingPrice : '';
  el('pfCost').value = product && !product.hasVariants ? (product.costPrice || '') : '';
  el('pfStock').value = product && !product.hasVariants ? product.stock : '';
  el('pfMinStock').value = product && !product.hasVariants ? (product.minimumStock || '') : '';
  const track = product ? !!product.trackStock : true;
  document.querySelectorAll('#pfTrackStock button').forEach(b => b.classList.toggle('active', (b.dataset.track === '1') === track));
  el('pfStockField').style.display = track ? 'block' : 'none';
  el('pfMinStockField').style.display = track ? 'block' : 'none';
  if (hasVariants && state.editingVariants.length === 0) state.editingVariants.push({ name: '', price: '', stock: '' });
  renderVariantEditor(state.editingVariants);
  el('btnDeleteProduct').style.display = product ? 'block' : 'none';
}

el('btnAddProduct').addEventListener('click', () => {
  if (CategoryStore.all().filter(c => c.isActive).length === 0) {
    showToast('Buat kategori dulu sebelum menambah produk');
    renderCategoryManageList();
    openSheet('sheetCategory');
    return;
  }
  fillProductForm(null);
  openSheet('sheetProduct');
});

el('productList').addEventListener('click', (e) => {
  const row = e.target.closest('.list-row[data-action="edit-product"]');
  if (!row) return;
  const product = ProductStore.all().find(p => p.id === row.dataset.id);
  if (product) { fillProductForm(product); openSheet('sheetProduct'); }
});

el('pfHasVariants').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#pfHasVariants button').forEach(b => b.classList.toggle('active', b === btn));
  const isVariant = btn.dataset.v === '1';
  el('pfSimpleFields').style.display = isVariant ? 'none' : 'block';
  el('pfVariantFields').style.display = isVariant ? 'block' : 'none';
  if (isVariant && state.editingVariants.length === 0) { state.editingVariants.push({ name: '', price: '', stock: '' }); renderVariantEditor(state.editingVariants); }
});

el('pfTrackStock').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#pfTrackStock button').forEach(b => b.classList.toggle('active', b === btn));
  const track = btn.dataset.track === '1';
  el('pfStockField').style.display = track ? 'block' : 'none';
  el('pfMinStockField').style.display = track ? 'block' : 'none';
});

el('btnAddVariantRow').addEventListener('click', () => { state.editingVariants.push({ name: '', price: '', stock: '' }); renderVariantEditor(state.editingVariants); });
el('variantEditorList').addEventListener('input', (e) => {
  const row = e.target.closest('.variant-row');
  if (!row) return;
  const idx = Number(row.dataset.idx);
  const field = e.target.dataset.field;
  if (!state.editingVariants[idx]) return;
  state.editingVariants[idx][field] = e.target.value;
});
el('variantEditorList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act="del-variant"]');
  if (!btn) return;
  state.editingVariants.splice(Number(btn.dataset.idx), 1);
  renderVariantEditor(state.editingVariants);
});

el('btnCloseProductForm').addEventListener('click', () => closeSheet('sheetProduct'));

el('btnSaveProduct').addEventListener('click', () => {
  const name = el('pfName').value.trim();
  if (!name) { showToast('Nama produk wajib diisi'); return; }
  const categoryId = el('pfCategorySelect').value;
  if (!categoryId) { showToast('Pilih kategori dulu'); return; }
  const sku = el('pfSku').value.trim();
  const unit = el('pfUnit').value.trim();
  const hasVariants = document.querySelector('#pfHasVariants button.active').dataset.v === '1';
  let product = { id: state.editingProductId || null, name, sku, categoryId, unit, hasVariants, isActive: true };
  if (hasVariants) {
    const cleanVariants = state.editingVariants
      .filter(v => v.name && v.name.trim() && Number(v.price) > 0)
      .map(v => ({ id: v.id || uid(), name: v.name.trim(), price: Number(v.price), costPrice: Number(v.costPrice) || 0, stock: Number(v.stock) || 0 }));
    if (cleanVariants.length === 0) { showToast('Isi minimal 1 varian dengan nama dan harga'); return; }
    product.variants = cleanVariants;
    product.sellingPrice = 0; product.costPrice = 0; product.stock = 0; product.trackStock = true; product.minimumStock = 0;
  } else {
    const price = Number(el('pfPrice').value);
    if (!price || price <= 0) { showToast('Harga harus lebih dari 0'); return; }
    const trackStock = document.querySelector('#pfTrackStock button.active').dataset.track === '1';
    product.sellingPrice = price;
    product.costPrice = Number(el('pfCost').value) || 0;
    product.trackStock = trackStock;
    product.stock = trackStock ? (Number(el('pfStock').value) || 0) : 0;
    product.minimumStock = trackStock ? (Number(el('pfMinStock').value) || 0) : 0;
    product.variants = [];
  }
  ProductStore.save(product);
  closeSheet('sheetProduct');
  renderProductList();
  showToast('Produk disimpan');
});

el('btnDeleteProduct').addEventListener('click', () => {
  if (!state.editingProductId) return;
  if (!confirm('Hapus produk ini?')) return;
  ProductStore.remove(state.editingProductId);
  closeSheet('sheetProduct');
  renderProductList();
  showToast('Produk dihapus');
});

/* ---------------- Category management ---------------- */

el('btnCloseCategory').addEventListener('click', () => {
  closeSheet('sheetCategory');
  if (state.screen === 'kasir') refreshKasir();
});
el('btnAddCategory').addEventListener('click', () => {
  const name = el('newCatName').value.trim();
  if (!name) { showToast('Nama kategori wajib diisi'); return; }
  CategoryStore.save({ name, isActive: true });
  el('newCatName').value = '';
  renderCategoryManageList();
  showToast('Kategori ditambahkan');
});
el('categoryList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act="del-cat"]');
  if (!btn) return;
  const ok = CategoryStore.remove(btn.dataset.id);
  if (!ok) { showToast('Kategori masih dipakai produk, tidak bisa dihapus'); return; }
  renderCategoryManageList();
  showToast('Kategori dihapus');
});

/* ---------------- Shift ---------------- */

el('shiftPanel').addEventListener('click', (e) => {
  if (e.target.id === 'btnOpenCloseShift') {
    renderCloseShiftSummary();
    el('csCash').value = '';
    openSheet('sheetCloseShift');
  }
});
el('btnCancelCloseShift').addEventListener('click', () => closeSheet('sheetCloseShift'));
el('btnConfirmCloseShift').addEventListener('click', () => {
  const endCash = Number(el('csCash').value);
  if (isNaN(endCash) || endCash < 0) { showToast('Kas akhir tidak valid'); return; }
  ShiftStore.close(endCash);
  closeSheet('sheetCloseShift');
  showToast('Shift ditutup');
  goToLoginScreen();
});

/* ---------------- Laporan ---------------- */

function renderLaporanScreen() {
  const menu = el('laporanMenu');
  const detail = el('laporanDetail');
  if (state.laporanMode === 'menu') {
    menu.style.display = 'block';
    detail.style.display = 'none';
    renderTopBar('Laporan', '');
  } else {
    menu.style.display = 'none';
    detail.style.display = 'block';
    document.querySelectorAll('.det-page').forEach(p => p.style.display = 'none');
    el('det-' + state.laporanMode).style.display = 'block';
    renderTopBar(LAPORAN_TITLES[state.laporanMode], '');
    refreshLaporanDetail();
  }
  updateTopBarNav();
}

function refreshLaporanDetail() {
  const data = computeLaporanData(state.laporanRange);
  if (state.laporanMode === 'ringkasan') renderRingkasan(data);
  else if (state.laporanMode === 'labarugi') renderLabaRugi(data);
  else if (state.laporanMode === 'transaksi') renderTransaksiHistory(data);
  else if (state.laporanMode === 'byproduct') renderByProductFull(data);
  else if (state.laporanMode === 'bycategory') renderByCategory(data);
  else if (state.laporanMode === 'bypayment') renderByPayment(data);
  else if (state.laporanMode === 'shiftreport') renderShiftHistory();
}

document.querySelectorAll('.accordion-head').forEach(head => {
  head.addEventListener('click', () => head.closest('.accordion').classList.toggle('open'));
});

el('laporanMenu').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open]');
  if (!btn) return;
  state.laporanMode = btn.dataset.open;
  renderLaporanScreen();
});

el('laporanRange').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-range]');
  if (!btn) return;
  state.laporanRange = btn.dataset.range;
  document.querySelectorAll('#laporanRange button').forEach(b => b.classList.toggle('active', b === btn));
  refreshLaporanDetail();
});

el('trxHistory').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act="void-trx"]');
  if (!btn) return;
  const reason = prompt('Alasan pembatalan transaksi ini:');
  if (reason === null) return;
  if (!reason.trim()) { showToast('Alasan wajib diisi'); return; }
  const shift = ShiftStore.current();
  TransactionStore.voidTransaction(btn.dataset.id, reason.trim(), shift ? shift.kasirName : 'Admin');
  refreshLaporanDetail();
  showToast('Transaksi dibatalkan, stok dikembalikan');
});

el('btnExportCsv').addEventListener('click', () => exportCsv(state.laporanRange));

/* ---------------- Pengaturan ---------------- */

function openPengaturanScreen() {
  const s = SettingsStore.get();
  el('setStoreName').value = s.storeName || '';
  el('setAddress').value = s.address || '';
  el('setPhone').value = s.phone || '';
  el('setInvoicePrefix').value = s.invoicePrefix || 'INV';
  el('setFooter').value = s.receiptFooter || '';
  renderPaymentMethodToggles();
  renderKasirListManage();
}

el('btnSaveSettings').addEventListener('click', () => {
  const s = SettingsStore.get();
  s.storeName = el('setStoreName').value.trim() || 'Toko Kue';
  s.address = el('setAddress').value.trim();
  s.phone = el('setPhone').value.trim();
  s.invoicePrefix = el('setInvoicePrefix').value.trim() || 'INV';
  s.receiptFooter = el('setFooter').value.trim() || 'Terima kasih!';
  SettingsStore.save(s);
  showToast('Pengaturan disimpan');
});

el('paymentMethodToggles').addEventListener('change', (e) => {
  const cb = e.target.closest('input[data-method]');
  if (!cb) return;
  const s = SettingsStore.get();
  const enabledCount = Object.values(s.paymentMethods).filter(Boolean).length;
  if (!cb.checked && enabledCount <= 1) { showToast('Minimal 1 metode pembayaran harus aktif'); cb.checked = true; return; }
  s.paymentMethods[cb.dataset.method] = cb.checked;
  SettingsStore.save(s);
});

el('btnAddKasirName').addEventListener('click', () => {
  const name = el('newKasirName').value.trim();
  if (!name) return;
  const s = SettingsStore.get();
  s.kasirList = s.kasirList || [];
  if (!s.kasirList.includes(name)) s.kasirList.push(name);
  SettingsStore.save(s);
  el('newKasirName').value = '';
  renderKasirListManage();
});
el('kasirListManage').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act="del-kasir"]');
  if (!btn) return;
  const s = SettingsStore.get();
  s.kasirList.splice(Number(btn.dataset.idx), 1);
  SettingsStore.save(s);
  renderKasirListManage();
});

el('btnExportData').addEventListener('click', () => {
  const data = BackupTool.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cadangan-kasirkue-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
el('btnImportData').addEventListener('click', () => el('importFile').click());
el('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm('Data saat ini akan digantikan oleh data dari cadangan ini. Lanjutkan?')) return;
      BackupTool.importAll(data);
      showToast('Cadangan berhasil dipulihkan');
      if (ShiftStore.current()) enterApp(); else goToLoginScreen();
    } catch (err) { showToast('Gagal membaca file cadangan'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ---------------- Init ---------------- */

function init() {
  seedDefaultsIfEmpty();
  if (getAuthSession()) proceedAfterAuth();
  else showLevel('splash');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();

/* ==========================================================================
   v4 additions — Firebase auth (REST API) + new Manajemen sub-modules
   ========================================================================== */

/* ---------------- Auth navigation ---------------- */

function proceedAfterAuth() {
  const settings = SettingsStore.get();
  if (!settings.onboarded) { showLevel('storesetup'); }
  else if (!ShiftStore.current()) { goToLoginScreen(); }
  else { enterApp(); }
}

el('btnGoRegister').addEventListener('click', () => showLevel('register'));
el('btnGoSignin').addEventListener('click', () => showLevel('signin'));
el('linkGoToSignin').addEventListener('click', (e) => { e.preventDefault(); showLevel('signin'); });
el('linkGoToRegister').addEventListener('click', (e) => { e.preventDefault(); showLevel('register'); });

function firebaseNotReadyToast() {
  showToast('Firebase belum dikonfigurasi — isi js/firebase-config.js dengan apiKey project kamu sendiri.');
}

function setButtonBusy(btn, busy, busyText) {
  if (busy) { btn.dataset.originalText = btn.textContent; btn.textContent = busyText; btn.disabled = true; }
  else { btn.textContent = btn.dataset.originalText || btn.textContent; btn.disabled = false; }
}

el('btnRegisterSubmit').addEventListener('click', async () => {
  const name = el('regName').value.trim();
  const email = el('regEmail').value.trim();
  const password = el('regPassword').value;
  if (!name || !email || !password) { showToast('Lengkapi semua kolom'); return; }
  if (password.length < 6) { showToast('Password minimal 6 karakter'); return; }
  if (!firebaseReady) { firebaseNotReadyToast(); return; }
  const btn = el('btnRegisterSubmit');
  setButtonBusy(btn, true, 'Memproses...');
  try {
    const user = await firebaseSignUp(email, password, name);
    saveAuthSession(user);
    proceedAfterAuth();
  } catch (err) {
    showToast(err.message);
  } finally {
    setButtonBusy(btn, false);
  }
});

el('btnSigninSubmit').addEventListener('click', async () => {
  const email = el('signinEmail').value.trim();
  const password = el('signinPassword').value;
  if (!email || !password) { showToast('Isi email dan password'); return; }
  if (!firebaseReady) { firebaseNotReadyToast(); return; }
  const btn = el('btnSigninSubmit');
  setButtonBusy(btn, true, 'Memproses...');
  try {
    const user = await firebaseSignIn(email, password);
    saveAuthSession(user);
    proceedAfterAuth();
  } catch (err) {
    showToast(err.message);
  } finally {
    setButtonBusy(btn, false);
  }
});

function googleSignIn() {
  showToast('Masuk dengan Google belum tersedia di jaringan ini — silakan pakai Daftar/Masuk dengan email.');
}
el('btnGoogleRegister').addEventListener('click', googleSignIn);
el('btnGoogleSignin').addEventListener('click', googleSignIn);

el('btnSignOut').addEventListener('click', () => {
  closeDrawer();
  if (!confirm('Keluar dari akun ini?')) return;
  clearAuthSession();
  showLevel('splash');
});

/* ---------------- Manajemen: extra rows ---------------- */

el('rowStok').addEventListener('click', () => goToScreen('stok'));
el('rowKontak').addEventListener('click', () => goToScreen('kontak'));
el('rowHutangPiutang').addEventListener('click', () => goToScreen('hutangpiutang'));
el('rowStaffFromSettings').addEventListener('click', () => goToScreen('staff'));

/* ---------------- Stok opname ---------------- */

el('btnSaveOpname').addEventListener('click', () => {
  const inputs = document.querySelectorAll('.opname-input');
  let changed = 0;
  inputs.forEach(inp => {
    const val = inp.value;
    if (val === '') return;
    const id = inp.dataset.id;
    const list = ProductStore.all();
    const p = list.find(x => x.id === id);
    if (p && Number(val) !== p.stock) {
      const delta = Number(val) - p.stock;
      ProductStore.adjustStock(id, null, delta);
      AuditLog.add('STOK_OPNAME', `${p.name}: ${p.stock} → ${val}`, ShiftStore.current() ? ShiftStore.current().kasirName : 'Admin');
      changed++;
    }
  });
  renderStokOpnameList();
  showToast(changed > 0 ? `${changed} produk disesuaikan` : 'Tidak ada perubahan');
});

/* ---------------- Kontak (Pelanggan & Supplier) ---------------- */

el('contactFilter').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-type]');
  if (!btn) return;
  document.querySelectorAll('#contactFilter button').forEach(b => b.classList.toggle('active', b === btn));
  renderContactList(btn.dataset.type);
});

function fillContactForm(contact) {
  el('cfId').value = contact ? contact.id : '';
  el('cfName').value = contact ? contact.name : '';
  el('cfPhone').value = contact ? (contact.phone || '') : '';
  el('cfAddress').value = contact ? (contact.address || '') : '';
  const type = contact ? contact.type : 'pelanggan';
  document.querySelectorAll('#cfType button').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  el('contactFormTitle').textContent = contact ? 'Edit kontak' : 'Tambah kontak';
  el('btnDeleteContact').style.display = contact ? 'block' : 'none';
}

el('btnAddContact').addEventListener('click', () => { fillContactForm(null); openSheet('sheetContact'); });
el('contactList').addEventListener('click', (e) => {
  const row = e.target.closest('.list-row[data-action="edit-contact"]');
  if (!row) return;
  const c = ContactStore.all().find(x => x.id === row.dataset.id);
  if (c) { fillContactForm(c); openSheet('sheetContact'); }
});
el('cfType').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#cfType button').forEach(b => b.classList.toggle('active', b === btn));
});
el('btnCloseContact').addEventListener('click', () => closeSheet('sheetContact'));
el('btnSaveContact').addEventListener('click', () => {
  const name = el('cfName').value.trim();
  if (!name) { showToast('Nama wajib diisi'); return; }
  const type = document.querySelector('#cfType button.active').dataset.type;
  ContactStore.save({ id: el('cfId').value || null, name, type, phone: el('cfPhone').value.trim(), address: el('cfAddress').value.trim() });
  closeSheet('sheetContact');
  renderContactList(document.querySelector('#contactFilter button.active').dataset.type);
  showToast('Kontak disimpan');
});
el('btnDeleteContact').addEventListener('click', () => {
  const id = el('cfId').value;
  if (!id || !confirm('Hapus kontak ini?')) return;
  ContactStore.remove(id);
  closeSheet('sheetContact');
  renderContactList('all');
  showToast('Kontak dihapus');
});

/* ---------------- Hutang & Piutang ---------------- */

el('btnAddDebt').addEventListener('click', () => {
  el('dfId').value = ''; el('dfName').value = ''; el('dfAmount').value = ''; el('dfDue').value = ''; el('dfNote').value = '';
  document.querySelectorAll('#dfType button').forEach(b => b.classList.toggle('active', b.dataset.type === 'hutang'));
  openSheet('sheetDebt');
});
el('dfType').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#dfType button').forEach(b => b.classList.toggle('active', b === btn));
});
el('btnCloseDebt').addEventListener('click', () => closeSheet('sheetDebt'));
el('btnSaveDebt').addEventListener('click', () => {
  const name = el('dfName').value.trim();
  const amount = Number(el('dfAmount').value);
  if (!name) { showToast('Nama wajib diisi'); return; }
  if (!amount || amount <= 0) { showToast('Jumlah harus lebih dari 0'); return; }
  const type = document.querySelector('#dfType button.active').dataset.type;
  DebtStore.save({ name, amount, type, dueDate: el('dfDue').value, note: el('dfNote').value.trim(), status: 'belum' });
  closeSheet('sheetDebt');
  renderDebtList();
  showToast('Catatan disimpan');
});
el('debtList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act="toggle-debt"]');
  if (!btn) return;
  const d = DebtStore.all().find(x => x.id === btn.dataset.id);
  if (!d) return;
  d.status = d.status === 'lunas' ? 'belum' : 'lunas';
  DebtStore.save(d);
  renderDebtList();
});

/* ---------------- Pembelian dari Supplier ---------------- */

el('btnAddPurchase').addEventListener('click', () => {
  populateSupplierSelect();
  populateProductSelectForPurchase();
  el('pfPurchaseQty').value = ''; el('pfPurchaseTotal').value = '';
  openSheet('sheetPurchase');
});
el('btnClosePurchase').addEventListener('click', () => closeSheet('sheetPurchase'));
el('btnSavePurchase').addEventListener('click', () => {
  const supplierId = el('pfSupplierSelect').value;
  const productId = el('pfProductSelect').value;
  const qty = Number(el('pfPurchaseQty').value);
  const total = Number(el('pfPurchaseTotal').value);
  if (!supplierId) { showToast('Tambahkan supplier dulu'); return; }
  if (!productId) { showToast('Pilih produk'); return; }
  if (!qty || qty <= 0) { showToast('Jumlah tidak valid'); return; }
  if (!total || total <= 0) { showToast('Total harga tidak valid'); return; }
  const supplier = ContactStore.all().find(c => c.id === supplierId);
  const product = ProductStore.all().find(p => p.id === productId);
  PurchaseStore.add({ supplierId, supplierName: supplier ? supplier.name : '-', productId, productName: product ? product.name : '-', qty, total });
  ProductStore.adjustStock(productId, null, qty);
  closeSheet('sheetPurchase');
  renderPurchaseList();
  showToast('Pembelian dicatat, stok bertambah');
});

/* ---------------- Keuangan ---------------- */

el('btnAddCashIn').addEventListener('click', () => {
  el('ceType').value = 'in'; el('cashEntryTitle').textContent = 'Kas masuk';
  el('ceAmount').value = ''; el('ceNote').value = '';
  openSheet('sheetCashEntry');
});
el('btnAddCashOut').addEventListener('click', () => {
  el('ceType').value = 'out'; el('cashEntryTitle').textContent = 'Kas keluar';
  el('ceAmount').value = ''; el('ceNote').value = '';
  openSheet('sheetCashEntry');
});
el('btnCloseCashEntry').addEventListener('click', () => closeSheet('sheetCashEntry'));
el('btnSaveCashEntry').addEventListener('click', () => {
  const amount = Number(el('ceAmount').value);
  const note = el('ceNote').value.trim();
  if (!amount || amount <= 0) { showToast('Jumlah tidak valid'); return; }
  if (!note) { showToast('Keterangan wajib diisi'); return; }
  CashLedgerStore.add({ type: el('ceType').value, amount, note });
  closeSheet('sheetCashEntry');
  renderCashLedger();
  showToast('Dicatat');
});

/* ---------------- Absensi ---------------- */

el('btnClockIn').addEventListener('click', () => {
  const name = el('absensiStaffSelect').value;
  if (!name) { showToast('Pilih nama staf'); return; }
  if (AttendanceStore.openFor(name)) { showToast(`${name} sudah absen masuk`); return; }
  AttendanceStore.clockIn(name);
  renderAttendanceList();
  showToast('Absen masuk dicatat');
});
el('btnClockOut').addEventListener('click', () => {
  const name = el('absensiStaffSelect').value;
  if (!name) { showToast('Pilih nama staf'); return; }
  if (!AttendanceStore.openFor(name)) { showToast(`${name} belum absen masuk`); return; }
  AttendanceStore.clockOut(name);
  renderAttendanceList();
  showToast('Absen pulang dicatat');
});

/* ---------------- Manajemen Staff ---------------- */

el('btnAddStaff').addEventListener('click', () => {
  el('sfId').value = ''; el('sfName').value = '';
  document.querySelectorAll('#sfRole button').forEach(b => b.classList.toggle('active', b.dataset.role === 'Kasir'));
  el('staffFormTitle').textContent = 'Tambah staf';
  el('btnDeleteStaff').style.display = 'none';
  openSheet('sheetStaff');
});
el('staffList').addEventListener('click', (e) => {
  const row = e.target.closest('.list-row[data-action="edit-staff"]');
  if (!row) return;
  const s = StaffStore.all().find(x => x.id === row.dataset.id);
  if (!s) return;
  el('sfId').value = s.id; el('sfName').value = s.name;
  document.querySelectorAll('#sfRole button').forEach(b => b.classList.toggle('active', b.dataset.role === s.role));
  el('staffFormTitle').textContent = 'Edit staf';
  el('btnDeleteStaff').style.display = 'block';
  openSheet('sheetStaff');
});
el('sfRole').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#sfRole button').forEach(b => b.classList.toggle('active', b === btn));
});
el('btnCloseStaff').addEventListener('click', () => closeSheet('sheetStaff'));
el('btnSaveStaff').addEventListener('click', () => {
  const name = el('sfName').value.trim();
  if (!name) { showToast('Nama wajib diisi'); return; }
  const role = document.querySelector('#sfRole button.active').dataset.role;
  StaffStore.save({ id: el('sfId').value || null, name, role });
  closeSheet('sheetStaff');
  renderStaffList();
  showToast('Staf disimpan');
});
el('btnDeleteStaff').addEventListener('click', () => {
  const id = el('sfId').value;
  if (!id || !confirm('Hapus staf ini?')) return;
  StaffStore.remove(id);
  closeSheet('sheetStaff');
  renderStaffList();
  showToast('Staf dihapus');
});
