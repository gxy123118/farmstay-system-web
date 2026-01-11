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
  status: string
  checkInDate?: string
  checkOutDate?: string
  totalAmount?: number
  diningAmount?: number
  activityAmount?: number
  diningItems?: DiningOrderItem[]
  activityItems?: ActivityOrderItem[]
  farmStayId?: number
  farmStay?: FarmStaySummary
  room?: RoomSummary
  reviewed?: boolean
}
