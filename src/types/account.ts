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

export type WithdrawCreatePayload = {
  amount: number
  channel: 'ALIPAY'
  accountName: string
  accountNo: string
  remark?: string
}

export type WithdrawResponse = {
  id: number
  withdrawNo: string
  amount: number
  channel: string
  accountName: string
  accountNo: string
  status: string
  remark?: string
  reviewRemark?: string
  transferNo?: string
  createdAt?: string
  reviewedAt?: string
  paidAt?: string
}
