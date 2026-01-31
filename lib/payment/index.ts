// Payment Module - Central exports for payment processing
// Supports Portugal and Spain payment methods

export { paymentService, PaymentService } from './payment-service';
export type { 
  CreatePaymentIntentParams, 
  PaymentIntentResult, 
  ProcessWebhookResult 
} from './payment-service';

export { portugalPaymentService, PortugalPaymentService } from './methods/portugal';
export type { 
  MultibancoDetails, 
  MBWayRequest, 
  MBWayResponse 
} from './methods/portugal';

export { spainPaymentService, SpainPaymentService } from './methods/spain';
export type { 
  BizumRequest, 
  BizumResponse 
} from './methods/spain';

// Re-export Prisma types for convenience
export type { 
  PaymentMethod, 
  PaymentTransaction, 
  PaymentMethodType, 
  TransactionStatus 
} from '@prisma/client';
