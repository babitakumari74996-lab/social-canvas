// Demo products shown in the "Products" strip on the Home feed.
export interface DemoProduct {
  id: string;
  name: string;
  price: string;
  image: string;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "prod-1", name: "Running Sneakers", price: "₹2,499", image: "/demo/products/sneakers.jpg" },
  { id: "prod-2", name: "Wireless Headphones", price: "₹3,999", image: "/demo/products/headphones.jpg" },
  { id: "prod-3", name: "Smartwatch", price: "₹4,999", image: "/demo/products/smartwatch.jpg" },
  { id: "prod-4", name: "Canvas Backpack", price: "₹1,299", image: "/demo/products/backpack.jpg" },
];
