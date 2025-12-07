# 🧹 CLEANUP: Orphaned Transactions - DOKUMENTASI

## ❓ **MASALAH:**
Transaksi lama yang dibuat sebelum migration Set support tidak memiliki items, sehingga:
- Muncul di list tapi kosong
- Tidak bisa divalidasi
- Membingungkan user

## 🔍 **ROOT CAUSE:**
Transaksi dibuat sebelum:
1. Migration `transaction_items` table
2. Migration `transaction_set_items` table
3. Backend logic untuk insert items

**Result:** Transaksi ada di `transactions` table tapi tidak ada di `transaction_items` atau `transaction_set_items`.

---

## ✅ **SOLUSI:**

### **Cleanup Script Created**
**File:** `backend/cleanup_orphaned_transactions.sql`

**What It Does:**
1. ✅ Find transactions without items
2. ✅ Delete orphaned transactions
3. ✅ Verify cleanup results

### **Script Logic:**
```sql
-- Delete transactions that have NO items
DELETE FROM transactions
WHERE id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_items
)
AND id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_set_items
);
```

---

## 📊 **CLEANUP RESULTS:**

### **Before Cleanup:**
```
Transactions: 1
Transaction Items: 0
Transaction Set Items: 0
```

### **After Cleanup:**
```
Remaining Transactions: 0
Transaction Items: 0
Transaction Set Items: 0
```

✅ **All orphaned transactions removed!**

---

## 🎯 **PREVENTION:**

### **Going Forward:**
Transaksi baru **SELALU** akan punya items karena:

1. ✅ **Frontend Validation:**
```tsx
if (items.length === 0 && (!setItems || setItems.length === 0)) {
    return null; // Don't create transaction
}
```

2. ✅ **Backend Transaction:**
```javascript
await connection.beginTransaction();
// Insert transaction
// Insert items (MUST have items)
await connection.commit();
```

3. ✅ **Database Constraints:**
- Foreign keys ensure referential integrity
- CASCADE delete ensures cleanup

---

## 🔍 **VERIFICATION QUERIES:**

### **Check for Orphaned Transactions:**
```sql
-- Should return 0 rows
SELECT t.id, t.type, t.status
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id
)
AND NOT EXISTS (
    SELECT 1 FROM transaction_set_items tsi WHERE tsi.transactionId = t.id
);
```

### **Check Transaction Integrity:**
```sql
-- All transactions should have items
SELECT 
    t.id,
    t.type,
    COUNT(DISTINCT ti.instrumentId) as single_items,
    COUNT(DISTINCT tsi.setId) as set_items,
    (COUNT(DISTINCT ti.instrumentId) + COUNT(DISTINCT tsi.setId)) as total_items
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transactionId
LEFT JOIN transaction_set_items tsi ON t.id = tsi.transactionId
GROUP BY t.id;
```

### **Check Stock Consistency:**
```sql
-- Verify stock calculations
SELECT 
    i.id,
    i.name,
    i.totalStock,
    i.cssdStock,
    i.dirtyStock,
    SUM(ius.quantity) as distributed_stock
FROM instruments i
LEFT JOIN instrument_unit_stock ius ON i.id = ius.instrumentId
GROUP BY i.id;
```

---

## 📝 **MAINTENANCE TASKS:**

### **Regular Checks:**

**Weekly:**
```sql
-- Check for orphaned transactions
SELECT COUNT(*) as orphaned_count
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id
)
AND NOT EXISTS (
    SELECT 1 FROM transaction_set_items tsi WHERE tsi.transactionId = t.id
);
```

**Monthly:**
```sql
-- Check data integrity
SELECT 
    'Transactions' as table_name,
    COUNT(*) as count
FROM transactions
UNION ALL
SELECT 
    'Transaction Items',
    COUNT(*)
FROM transaction_items
UNION ALL
SELECT 
    'Transaction Set Items',
    COUNT(*)
FROM transaction_set_items;
```

---

## 🎯 **BEST PRACTICES:**

### **When Creating Transactions:**
1. ✅ **Always validate** items array not empty
2. ✅ **Use transactions** (BEGIN/COMMIT/ROLLBACK)
3. ✅ **Insert items** in same transaction
4. ✅ **Verify** before commit

### **When Deleting Transactions:**
1. ✅ **Use CASCADE** delete for items
2. ✅ **Check** for orphaned items
3. ✅ **Cleanup** related data

### **When Migrating:**
1. ✅ **Backup** database first
2. ✅ **Test** migration on copy
3. ✅ **Verify** data integrity after
4. ✅ **Cleanup** orphaned data

---

## 🔧 **TROUBLESHOOTING:**

### **If Orphaned Transactions Found:**

**Option 1: Delete (Recommended)**
```sql
DELETE FROM transactions
WHERE id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_items
)
AND id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_set_items
);
```

**Option 2: Add Dummy Items (Not Recommended)**
```sql
-- Only if you need to keep transaction history
INSERT INTO transaction_items (transactionId, instrumentId, count, itemType)
SELECT t.id, 'dummy-id', 0, 'SINGLE'
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id
);
```

---

## ✅ **SUMMARY:**

**Problem:** Orphaned transactions without items

**Solution:** Cleanup script to delete orphaned transactions

**Result:** 
- ✅ Database clean
- ✅ No orphaned transactions
- ✅ All transactions have items

**Prevention:**
- ✅ Frontend validation
- ✅ Backend transaction logic
- ✅ Database constraints

---

**Dibuat:** 7 Desember 2024, 19:22 WIB
**Status:** Completed
**Version:** 1.0
