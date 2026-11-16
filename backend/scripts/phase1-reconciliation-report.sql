-- READ ONLY. Run against a backup or authorized reporting connection.
-- Results identify discrepancies; this script never repairs financial history.
SELECT o.id, o.order_number, o.total, o.paid_amount, o.balance_amount,
       COALESCE(p.receipts,0) AS ledger_paid, o.payment_status,
       CASE WHEN COALESCE(p.receipts,0)=0 THEN 'UNPAID'
            WHEN p.receipts>=o.total THEN 'PAID' ELSE 'PARTIAL' END AS expected_status
FROM orders o LEFT JOIN (SELECT order_id,SUM(amount) receipts FROM payments GROUP BY order_id) p ON p.order_id=o.id
WHERE o.paid_amount<>COALESCE(p.receipts,0)
   OR o.balance_amount<>o.total-COALESCE(p.receipts,0)
   OR COALESCE(p.receipts,0)>o.total
   OR o.payment_status<>CASE WHEN COALESCE(p.receipts,0)=0 THEN 'UNPAID' WHEN p.receipts>=o.total THEN 'PAID' ELSE 'PARTIAL' END;

SELECT o.id,o.po_number,o.total,o.paid_amount,o.balance_amount,COALESCE(p.receipts,0) ledger_paid
FROM purchase_orders o LEFT JOIN (SELECT purchase_order_id,SUM(amount) receipts FROM distributor_payments GROUP BY purchase_order_id) p ON p.purchase_order_id=o.id
WHERE o.paid_amount<>COALESCE(p.receipts,0) OR o.balance_amount<>o.total-COALESCE(p.receipts,0) OR COALESCE(p.receipts,0)>o.total;

SELECT d.id,d.name,d.outstanding_balance,COALESCE(r.received_total,0)-COALESCE(p.paid_total,0) AS expected_outstanding
FROM distributors d
LEFT JOIN (SELECT distributor_id,SUM(total) received_total FROM purchase_orders WHERE status='RECEIVED' GROUP BY distributor_id) r ON r.distributor_id=d.id
LEFT JOIN (SELECT COALESCE(p.distributor_id,o.distributor_id) distributor_id,SUM(p.amount) paid_total FROM distributor_payments p LEFT JOIN purchase_orders o ON o.id=p.purchase_order_id GROUP BY COALESCE(p.distributor_id,o.distributor_id)) p ON p.distributor_id=d.id
WHERE d.outstanding_balance<>COALESCE(r.received_total,0)-COALESCE(p.paid_total,0);

SELECT id,sku,stock_quantity FROM products WHERE stock_quantity<0;
-- Nonnegative stock does not prove historical stock correctness. A physical
-- count and source documents are required where no movement ledger exists.
