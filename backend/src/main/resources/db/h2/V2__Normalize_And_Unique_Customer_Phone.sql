CREATE TEMPORARY TABLE customer_phone_normalization (
    customer_id BIGINT PRIMARY KEY,
    normalized_phone VARCHAR(15) NOT NULL,
    CONSTRAINT uk_customer_phone_normalization UNIQUE (normalized_phone),
    CONSTRAINT chk_customer_phone_normalization_digits
        CHECK (normalized_phone REGEXP '^[0-9]+$')
);

INSERT INTO customer_phone_normalization (customer_id, normalized_phone)
SELECT id, REGEXP_REPLACE(phone_number, '[^0-9]', '')
FROM customers;

UPDATE customers
SET phone_number = (
    SELECT normalization.normalized_phone
    FROM customer_phone_normalization AS normalization
    WHERE normalization.customer_id = customers.id
);

ALTER TABLE customers
    ADD CONSTRAINT chk_customers_phone_number_digits
        CHECK (phone_number REGEXP '^[0-9]+$');

ALTER TABLE customers
    ADD CONSTRAINT uk_customers_phone_number UNIQUE (phone_number);

DROP TABLE customer_phone_normalization;
