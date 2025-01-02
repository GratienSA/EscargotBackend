export interface CheckoutData {
  items: Array<{
    productId: number;  
    name: string;
    image: string;
    price: number;
    quantity: number;
  }>;
  userId?: number;  
  success_url?: string;  
  cancel_url?: string;   
  shippingStreet: string; 
  shippingCity: string;   
  shippingZip: string;    
  paymentMethod: 'stripe' | 'CASH';  
}
