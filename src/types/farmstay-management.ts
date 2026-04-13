export type FarmStayManage = {
  id: number
  name: string
  city: string
  address?: string
  description?: string
  coverImage?: string
  priceRange?: string
  priceLevel?: string
  contactPhone?: string
  tags?: string
  status?: string
}

export type RoomManage = {
  id: number
  farmStayId: number
  name: string
  description?: string
  bedType?: string
  maxGuests?: number
  price: number
  stock: number
  tags?: string
  status?: string
}

export type DiningManage = {
  id: number
  farmStayId: number
  name: string
  description?: string
  price?: number
  coverImage?: string
  tags?: string
  status?: string
}

export type ActivityManage = {
  id: number
  farmStayId: number
  name: string
  description?: string
  schedule?: string
  capacity?: number
  price?: number
  coverImage?: string
  tags?: string
  status?: string
}

export type UploadImageResponse = {
  url: string
  originalName: string
  size: number
}

export type FarmStayResourceSavePayload = {
  name: string
  city: string
  address?: string
  description?: string
  coverImage?: string
  priceRange?: string
  priceLevel?: string
  averageRating?: number
  contactPhone?: string
  tags?: string
  status?: string
  rooms: Array<{
    id?: number
    name: string
    description?: string
    bedType?: string
    maxGuests?: number
    price: number
    stock: number
    tags?: string
    status?: string
  }>
  dinings: Array<{
    id?: number
    name: string
    description?: string
    price: number
    coverImage?: string
    tags?: string
    status?: string
  }>
  activities: Array<{
    id?: number
    name: string
    description?: string
    schedule?: string
    capacity?: number
    price: number
    coverImage?: string
    tags?: string
    status?: string
  }>
}

export type FarmStayResourceSaveResponse = {
  farmStay: FarmStayManage
  rooms: RoomManage[]
  dinings: DiningManage[]
  activities: ActivityManage[]
}
