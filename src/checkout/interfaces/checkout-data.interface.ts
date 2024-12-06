export interface CheckoutData {
  items: Array<{
    productId: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
  }>;
  userId?: string;
  success_url?: string;
  cancel_url?: string;
}
