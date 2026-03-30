export type FarmStaySummary = {
  id: number
  name?: string
  city?: string
  address?: string
  coverImage?: string
  description?: string
  tags?: string
}

export type RoomSummary = {
  id: number
  farmStayId?: number
  name?: string
  description?: string
  bedType?: string
  maxGuests?: number
  price?: number
  tags?: string
}

export type DiningOrderItem = {
  id: number
  orderId?: number
  diningItemId?: number
  itemName?: string
  price?: number
  quantity?: number
}

export type ActivityOrderItem = {
  id: number
  orderId?: number
  activityItemId?: number
  itemName?: string
  price?: number
  quantity?: number
}

export type BookingDetail = {
  id: number
  orderNo: string
  visitorId?: number
  visitorUsername?: string
  visitorName?: string
  status: string
  paymentChannel?: string
  checkInDate?: string
  checkOutDate?: string
  totalAmount?: number
  diningAmount?: number
  activityAmount?: number
  contactName?: string
  contactPhone?: string
  guests?: number
  couponCode?: string
  remarks?: string
  diningItems?: DiningOrderItem[]
  activityItems?: ActivityOrderItem[]
  farmStayId?: number
  farmStay?: FarmStaySummary
  room?: RoomSummary
  reviewed?: boolean
  createdAt?: string
  updatedAt?: string
}

export type OperatorOrderSummary = {
  farmStayCount?: number
  orderCount?: number
  paidOrderCount?: number
  refundedOrderCount?: number
  grossTransactionAmount?: number
  refundAmount?: number
  netTransactionAmount?: number
  refundRate?: number
}

export type BookingCreatePayload = {
  farmStayId: number
  roomTypeId: number
  checkInDate: string
  checkOutDate: string
  guests: number
  diningItemIds?: number[]
  activityItemIds?: number[]
  couponCode?: string
  contactName: string
  contactPhone: string
  remarks?: string
}

export type BookingCreateResponse = {
  id: number
  orderNo: string
  status: string
  paymentChannel?: string
  totalAmount?: number
}

export type BookingPaymentPayload = {
  orderId: number
  channel: 'BALANCE'
}

export type BookingPaymentResponse = {
  payInfo?: string
  status: string
  currentBalance?: number
}
