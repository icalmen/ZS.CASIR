/* ==========================================================================
   Kasir Kue — data layer (v2)
   Semua data disimpan di localStorage pada HP ini. Tidak ada server.
   ========================================================================== */

const DB_KEYS = {
  categories: 'kasirkue_categories',
  products: 'kasirkue_products',
  transactions: 'kasirkue_transactions',
  heldTransactions: 'kasirkue_held',
  shifts: 'kasirkue_shifts',
  currentShift: 'kasirkue_currentShift',
  settings: 'kasirkue_settings',
  auditLog: 'kasirkue_audit',
};

const Storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Storage.get error', key, e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage.set error', key, e);
      return false;
    }
  },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------------- Seed defaults ---------------- */

function seedDefaultsIfEmpty() {
  const existingCats = Storage.get(DB_KEYS.categories, null);
  if (existingCats !== null) return;

  const cats = [
    { id: uid(), name: 'Cake', sortOrder: 1, isActive: true },
    { id: uid(), name: 'Brownies', sortOrder: 2, isActive: true },
    { id: uid(), name: 'Cheesecake', sortOrder: 3, isActive: true },
    { id: uid(), name: 'Cookies', sortOrder: 4, isActive: true },
    { id: uid(), name: 'Egg Tart', sortOrder: 5, isActive: true },
    { id: uid(), name: 'Salad Buah', sortOrder: 6, isActive: true },
    { id: uid(), name: 'Minuman', sortOrder: 7, isActive: true },
  ];
  Storage.set(DB_KEYS.categories, cats);
  const byName = {};
  cats.forEach(c => byName[c.name] = c.id);

  const products = [
    { name: 'Cheesecake slice', categoryId: byName['Cheesecake'], sku: 'CHS-01', sellingPrice: 28000, costPrice: 14000, trackStock: true, stock: 12, minimumStock: 5, unit: 'pcs', isActive: true, hasVariants: false, variants: [] },
    { name: 'Brownies kukus', categoryId: byName['Brownies'], sku: 'BRW-01', sellingPrice: 18000, costPrice: 9000, trackStock: true, stock: 20, minimumStock: 5, unit: 'pcs', isActive: true, hasVariants: false, variants: [] },
    { name: 'Salad buah', categoryId: byName['Salad Buah'], sku: 'SLD-01', sellingPrice: 20000, costPrice: 11000, trackStock: true, stock: 10, minimumStock: 3, unit: 'cup', isActive: true, hasVariants: false, variants: [] },
    { name: 'Egg tart', categoryId: byName['Egg Tart'], sku: 'EGT-01', sellingPrice: 12000, costPrice: 6000, trackStock: true, stock: 24, minimumStock: 6, unit: 'pcs', isActive: true, hasVariants: false, variants: [] },
    { name: 'Cookies toples', categoryId: byName['Cookies'], sku: 'CKS-01', sellingPrice: 35000, costPrice: 20000, trackStock: true, stock: 8, minimumStock: 3, unit: 'toples', isActive: true, hasVariants: false, variants: [] },
    {
      name: 'Chocolate cake', categoryId: byName['Cake'], sku: 'CAK-01', sellingPrice: 0, costPrice: 0, trackStock: true, stock: 0, minimumStock: 0, unit: 'pcs', isActive: true, hasVariants: true,
      variants: [
        { id: uid(), name: '10 cm', price: 50000, costPrice: 28000, stock: 5 },
        { id: uid(), name: '15 cm', price: 75000, costPrice: 42000, stock: 3 },
        { id: uid(), name: '20 cm', price: 120000, costPrice: 68000, stock: 2 },
      ],
    },
    { name: 'Matcha latte', categoryId: byName['Minuman'], sku: 'MIN-01', sellingPrice: 22000, costPrice: 9000, trackStock: false, stock: 0, minimumStock: 0, unit: 'cup', isActive: true, hasVariants: false, variants: [] },
    { name: 'Coklat panas', categoryId: byName['Minuman'], sku: 'MIN-02', sellingPrice: 18000, costPrice: 7000, trackStock: false, stock: 0, minimumStock: 0, unit: 'cup', isActive: true, hasVariants: false, variants: [] },
    { name: 'Kopi susu', categoryId: byName['Minuman'], sku: 'MIN-03', sellingPrice: 18000, costPrice: 6000, trackStock: false, stock: 0, minimumStock: 0, unit: 'cup', isActive: true, hasVariants: false, variants: [] },
  ].map(p => ({ id: uid(), ...p }));

  Storage.set(DB_KEYS.products, products);
  Storage.set(DB_KEYS.transactions, []);
  Storage.set(DB_KEYS.heldTransactions, []);
  Storage.set(DB_KEYS.shifts, []);
  Storage.set(DB_KEYS.auditLog, []);
  Storage.set(DB_KEYS.settings, {
    storeName: 'Toko Kue',
    address: '',
    phone: '',
    invoicePrefix: 'INV',
    receiptFooter: 'Terima kasih!',
    paymentMethods: { Tunai: true, QRIS: true, Transfer: true, Debit: false, 'E-wallet': false },
    kasirList: [],
  });
}

/* ---------------- Categories ---------------- */

const CategoryStore = {
  all() { return Storage.get(DB_KEYS.categories, []).sort((a, b) => a.sortOrder - b.sortOrder); },
  save(cat) {
    const list = Storage.get(DB_KEYS.categories, []);
    if (cat.id) {
      const idx = list.findIndex(c => c.id === cat.id);
      if (idx >= 0) list[idx] = cat; else list.push(cat);
    } else {
      cat.id = uid();
      cat.sortOrder = list.length + 1;
      list.push(cat);
    }
    Storage.set(DB_KEYS.categories, list);
    return cat;
  },
  remove(id) {
    const inUse = ProductStore.all().some(p => p.categoryId === id);
    if (inUse) return false;
    Storage.set(DB_KEYS.categories, Storage.get(DB_KEYS.categories, []).filter(c => c.id !== id));
    return true;
  },
};

/* ---------------- Products ---------------- */

const ProductStore = {
  all() { return Storage.get(DB_KEYS.products, []); },
  save(product) {
    const list = ProductStore.all();
    if (product.id) {
      const idx = list.findIndex(p => p.id === product.id);
      if (idx >= 0) list[idx] = product; else list.push(product);
    } else {
      product.id = uid();
      list.push(product);
    }
    Storage.set(DB_KEYS.products, list);
    return product;
  },
  remove(id) {
    Storage.set(DB_KEYS.products, ProductStore.all().filter(p => p.id !== id));
  },
  adjustStock(productId, variantId, delta) {
    const list = ProductStore.all();
    const p = list.find(x => x.id === productId);
    if (!p) return;
    if (p.hasVariants && variantId) {
      const v = p.variants.find(x => x.id === variantId);
      if (v) v.stock = Math.max(0, (v.stock || 0) + delta);
    } else if (!p.hasVariants && p.trackStock) {
      p.stock = Math.max(0, (p.stock || 0) + delta);
    }
    Storage.set(DB_KEYS.products, list);
  },
};

/* ---------------- Settings ---------------- */

const SettingsStore = {
  get() {
    return Storage.get(DB_KEYS.settings, {
      storeName: 'Toko Kue', address: '', phone: '', invoicePrefix: 'INV',
      receiptFooter: 'Terima kasih!',
      paymentMethods: { Tunai: true, QRIS: true, Transfer: true, Debit: false, 'E-wallet': false },
      kasirList: [],
    });
  },
  save(settings) { Storage.set(DB_KEYS.settings, settings); },
};

/* ---------------- Audit log ---------------- */

const AuditLog = {
  all() { return Storage.get(DB_KEYS.auditLog, []); },
  add(action, detail, kasirName) {
    const list = AuditLog.all();
    list.unshift({ id: uid(), timestamp: Date.now(), action, detail, kasirName: kasirName || '-' });
    Storage.set(DB_KEYS.auditLog, list.slice(0, 500));
  },
};

/* ---------------- Shifts ---------------- */

const ShiftStore = {
  all() { return Storage.get(DB_KEYS.shifts, []); },
  current() { return Storage.get(DB_KEYS.currentShift, null); },
  open(kasirName, startCash) {
    const shift = {
      id: uid(), kasirName, startCash: Number(startCash) || 0,
      startTime: Date.now(), endTime: null, endCash: null,
      expectedCash: null, difference: null, status: 'open',
    };
    Storage.set(DB_KEYS.currentShift, shift);
    AuditLog.add('BUKA_SHIFT', `Kas awal ${startCash}`, kasirName);
    return shift;
  },
  close(endCashActual) {
    const shift = ShiftStore.current();
    if (!shift) return null;
    const cashSales = TransactionStore.all()
      .filter(t => t.shiftId === shift.id && t.payment.method === 'Tunai' && t.status === 'completed')
      .reduce((sum, t) => sum + t.total, 0);
    const expectedCash = shift.startCash + cashSales;
    shift.endTime = Date.now();
    shift.endCash = Number(endCashActual) || 0;
    shift.expectedCash = expectedCash;
    shift.difference = shift.endCash - expectedCash;
    shift.status = 'closed';

    const history = ShiftStore.all();
    history.unshift(shift);
    Storage.set(DB_KEYS.shifts, history);
    localStorage.removeItem(DB_KEYS.currentShift);
    AuditLog.add('TUTUP_SHIFT', `Selisih ${shift.difference}`, shift.kasirName);
    return shift;
  },
};

/* ---------------- Transactions ---------------- */

function nextInvoiceNumber() {
  const settings = SettingsStore.get();
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;
  const prefix = `${settings.invoicePrefix || 'INV'}-${dateStr}-`;
  const countToday = TransactionStore.all().filter(t => t.invoiceNumber && t.invoiceNumber.startsWith(prefix)).length;
  return prefix + String(countToday + 1).padStart(4, '0');
}

const TransactionStore = {
  all() { return Storage.get(DB_KEYS.transactions, []); },
  add(trx) {
    const list = TransactionStore.all();
    trx.id = uid();
    trx.timestamp = Date.now();
    trx.invoiceNumber = nextInvoiceNumber();
    trx.status = 'completed';
    list.unshift(trx);
    Storage.set(DB_KEYS.transactions, list);
    return trx;
  },
  inRange(fromTs) {
    return TransactionStore.all().filter(t => t.timestamp >= fromTs);
  },
  voidTransaction(id, reason, kasirName) {
    const list = TransactionStore.all();
    const trx = list.find(t => t.id === id);
    if (!trx || trx.status !== 'completed') return null;
    trx.status = 'void';
    trx.voidReason = reason;
    trx.voidAt = Date.now();
    Storage.set(DB_KEYS.transactions, list);
    trx.items.forEach(it => ProductStore.adjustStock(it.productId, it.variantId, it.qty));
    AuditLog.add('VOID_TRANSAKSI', `${trx.invoiceNumber} — ${reason}`, kasirName);
    return trx;
  },
};

/* ---------------- Held transactions ---------------- */

const HeldStore = {
  all() { return Storage.get(DB_KEYS.heldTransactions, []); },
  save(held) {
    const list = HeldStore.all();
    held.id = uid();
    held.createdAt = Date.now();
    list.unshift(held);
    Storage.set(DB_KEYS.heldTransactions, list);
    return held;
  },
  remove(id) {
    Storage.set(DB_KEYS.heldTransactions, HeldStore.all().filter(h => h.id !== id));
  },
};

/* ---------------- Backup / restore ---------------- */

const BackupTool = {
  exportAll() {
    return {
      exportedAt: new Date().toISOString(),
      categories: CategoryStore.all(),
      products: ProductStore.all(),
      transactions: TransactionStore.all(),
      heldTransactions: HeldStore.all(),
      shifts: ShiftStore.all(),
      currentShift: ShiftStore.current(),
      settings: SettingsStore.get(),
      auditLog: AuditLog.all(),
      contacts: ContactStore.all(),
      purchases: PurchaseStore.all(),
      cashLedger: CashLedgerStore.all(),
      debts: DebtStore.all(),
      attendance: AttendanceStore.all(),
      staff: StaffStore.all(),
    };
  },
  importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('File cadangan tidak valid');
    if (data.categories) Storage.set(DB_KEYS.categories, data.categories);
    if (data.products) Storage.set(DB_KEYS.products, data.products);
    if (data.transactions) Storage.set(DB_KEYS.transactions, data.transactions);
    if (data.heldTransactions) Storage.set(DB_KEYS.heldTransactions, data.heldTransactions);
    if (data.shifts) Storage.set(DB_KEYS.shifts, data.shifts);
    if (data.settings) Storage.set(DB_KEYS.settings, data.settings);
    if (data.auditLog) Storage.set(DB_KEYS.auditLog, data.auditLog);
    if (data.currentShift) Storage.set(DB_KEYS.currentShift, data.currentShift);
    else localStorage.removeItem(DB_KEYS.currentShift);
    if (data.contacts) Storage.set(DB_KEYS_V4.contacts, data.contacts);
    if (data.purchases) Storage.set(DB_KEYS_V4.purchases, data.purchases);
    if (data.cashLedger) Storage.set(DB_KEYS_V4.cashLedger, data.cashLedger);
    if (data.debts) Storage.set(DB_KEYS_V4.debts, data.debts);
    if (data.attendance) Storage.set(DB_KEYS_V4.attendance, data.attendance);
    if (data.staff) Storage.set(DB_KEYS_V4.staff, data.staff);
  },
};

/* ==========================================================================
   v4 additions — contacts, purchases, cash ledger, debts, attendance, staff
   ========================================================================== */

const DB_KEYS_V4 = {
  contacts: 'kasirkue_contacts',
  purchases: 'kasirkue_purchases',
  cashLedger: 'kasirkue_cashledger',
  debts: 'kasirkue_debts',
  attendance: 'kasirkue_attendance',
  staff: 'kasirkue_staff',
};

/* ---------------- Pelanggan & Supplier (contacts) ---------------- */

const ContactStore = {
  all() { return Storage.get(DB_KEYS_V4.contacts, []); },
  save(c) {
    const list = ContactStore.all();
    if (c.id) { const i = list.findIndex(x => x.id === c.id); if (i >= 0) list[i] = c; else list.push(c); }
    else { c.id = uid(); list.push(c); }
    Storage.set(DB_KEYS_V4.contacts, list);
    return c;
  },
  remove(id) { Storage.set(DB_KEYS_V4.contacts, ContactStore.all().filter(c => c.id !== id)); },
};

/* ---------------- Pembelian dari Supplier ---------------- */

const PurchaseStore = {
  all() { return Storage.get(DB_KEYS_V4.purchases, []); },
  add(p) {
    const list = PurchaseStore.all();
    p.id = uid(); p.timestamp = Date.now();
    list.unshift(p);
    Storage.set(DB_KEYS_V4.purchases, list);
    return p;
  },
};

/* ---------------- Keuangan (kas masuk/keluar manual) ---------------- */

const CashLedgerStore = {
  all() { return Storage.get(DB_KEYS_V4.cashLedger, []); },
  add(entry) {
    const list = CashLedgerStore.all();
    entry.id = uid(); entry.timestamp = Date.now();
    list.unshift(entry);
    Storage.set(DB_KEYS_V4.cashLedger, list);
    return entry;
  },
  remove(id) { Storage.set(DB_KEYS_V4.cashLedger, CashLedgerStore.all().filter(e => e.id !== id)); },
};

/* ---------------- Hutang & Piutang ---------------- */

const DebtStore = {
  all() { return Storage.get(DB_KEYS_V4.debts, []); },
  save(d) {
    const list = DebtStore.all();
    if (d.id) { const i = list.findIndex(x => x.id === d.id); if (i >= 0) list[i] = d; else list.push(d); }
    else { d.id = uid(); d.createdAt = Date.now(); list.push(d); }
    Storage.set(DB_KEYS_V4.debts, list);
    return d;
  },
  remove(id) { Storage.set(DB_KEYS_V4.debts, DebtStore.all().filter(d => d.id !== id)); },
};

/* ---------------- Absensi ---------------- */

const AttendanceStore = {
  all() { return Storage.get(DB_KEYS_V4.attendance, []); },
  clockIn(staffName) {
    const list = AttendanceStore.all();
    list.unshift({ id: uid(), staffName, clockIn: Date.now(), clockOut: null });
    Storage.set(DB_KEYS_V4.attendance, list);
  },
  clockOut(staffName) {
    const list = AttendanceStore.all();
    const rec = list.find(a => a.staffName === staffName && !a.clockOut);
    if (rec) { rec.clockOut = Date.now(); Storage.set(DB_KEYS_V4.attendance, list); }
  },
  openFor(staffName) { return AttendanceStore.all().find(a => a.staffName === staffName && !a.clockOut) || null; },
};

/* ---------------- Manajemen Staff ---------------- */

const StaffStore = {
  all() { return Storage.get(DB_KEYS_V4.staff, []); },
  save(s) {
    const list = StaffStore.all();
    if (s.id) { const i = list.findIndex(x => x.id === s.id); if (i >= 0) list[i] = s; else list.push(s); }
    else { s.id = uid(); list.push(s); }
    Storage.set(DB_KEYS_V4.staff, list);
    return s;
  },
  remove(id) { Storage.set(DB_KEYS_V4.staff, StaffStore.all().filter(s => s.id !== id)); },
};
