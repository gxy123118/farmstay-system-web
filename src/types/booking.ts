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

export type BookingDetail = {
  id: number
  orderNo: string
  status: string
  checkInDate?: string
  checkOutDate?: string
  totalAmount?: number
  farmStayId?: number
  farmStay?: FarmStaySummary
  room?: RoomSummary
  reviewed?: boolean
}
