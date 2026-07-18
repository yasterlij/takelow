CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_urls JSONB,
    current_market_price DECIMAL(12, 2) NOT NULL,
    brand VARCHAR(255)
);

CREATE INDEX idx_products_name ON products (name);
