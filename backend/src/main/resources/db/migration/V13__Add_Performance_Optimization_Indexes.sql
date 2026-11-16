CREATE INDEX idx_orders_order_date_status ON orders (order_date, status);
CREATE INDEX idx_order_items_product_order ON order_items (product_id, order_id);
CREATE INDEX idx_payments_order_date ON payments (order_id, payment_date);
CREATE INDEX idx_quotations_customer_status ON quotations (customer_id, status);
CREATE INDEX idx_purchase_orders_order_date_status ON purchase_orders (order_date, status);
