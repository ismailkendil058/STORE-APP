export interface Worker {
  id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  purchase_price: number;
  selling_price: number;
  barcode: string | null;
  category_id: string | null;
  quantity_type: 'unit' | 'kg';
  stock: number;
  created_at: string;
  product_sizes?: ProductSize[];
}

export interface ProductSize {
  id: string;
  product_id: string;
  size_kg: number;
  selling_price: number;
  purchase_price: number;
  stock: number;
}

export interface Session {
  id: string;
  worker_id: string;
  started_at: string;
  closed_at: string | null;
  total_revenue: number;
}

export interface Sale {
  id: string;
  session_id: string;
  worker_id: string;
  total: number;
  profit: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  size_kg: number | null;
  quantity: number;
  unit_price: number;
  purchase_price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: ProductSize;
  customAmountDa?: number;
}
