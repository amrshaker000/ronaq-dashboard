-- Add base_price and discount to products table
ALTER TABLE public.products
ADD COLUMN base_price numeric(10,2) DEFAULT 30,
ADD COLUMN discount numeric(5,2) DEFAULT 66.67;
