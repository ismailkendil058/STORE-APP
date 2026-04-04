-- Change product stock to numeric for weights
ALTER TABLE public.products ALTER COLUMN stock TYPE numeric;

-- Rename size_ml to size_kg and change type to numeric
ALTER TABLE public.product_sizes RENAME COLUMN size_ml TO size_kg;
ALTER TABLE public.product_sizes ALTER COLUMN size_kg TYPE numeric;

ALTER TABLE public.sale_items RENAME COLUMN size_ml TO size_kg;
ALTER TABLE public.sale_items ALTER COLUMN size_kg TYPE numeric;

-- Change quantity to numeric to support weights
ALTER TABLE public.sale_items ALTER COLUMN quantity TYPE numeric;

-- Update the stock decrease function to handle numeric quantities and new column names
CREATE OR REPLACE FUNCTION public.decrease_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.size_kg IS NOT NULL THEN
    UPDATE public.product_sizes
    SET stock = stock - NEW.quantity
    WHERE product_id = NEW.product_id AND size_kg = NEW.size_kg;
  ELSE
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;
