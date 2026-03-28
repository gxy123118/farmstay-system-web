export type BalanceResponse = {
  balance: number
}

export type BalanceFlowResponse = {
  flowNo: string
  changeType: string
  bizNo: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  remark?: string
  createdAt?: string
}

export type RechargeCreatePayload = {
  amount: number
}

export type RechargeResponse = {
  rechargeNo: string
  amount: number
  payMethod?: string
  status: string
  payInfo?: string
  qrCode?: string
  createdAt?: string
  paidAt?: string
}
