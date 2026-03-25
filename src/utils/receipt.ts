export interface ReceiptItem {
  name: string
  qty: number
  price: number
}

export interface ReceiptData {
  transactionId?: number
  createdAt: string
  paymentMethod: string
  total: number
  items: ReceiptItem[]
  cashReceived?: number
  change?: number
  referenceNumber?: string
}

import { SHOP_NAME, SHOP_PHONE } from '../config/shop'

const formatCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

export function printReceipt(receipt: ReceiptData) {
  const printWindow = window.open('', '_blank', 'width=420,height=720')
  if (!printWindow) {
    return false
  }

  const itemsHtml = receipt.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0; vertical-align:top;">${item.name}<br><span style="color:#6b7280; font-size:12px;">${item.qty} x ${formatCurrency(item.price)}</span></td>
          <td style="padding:6px 0; text-align:right; vertical-align:top;">${formatCurrency(item.qty * item.price)}</td>
        </tr>
      `,
    )
    .join('')

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${receipt.transactionId ? `#${receipt.transactionId}` : ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
          .wrap { max-width: 320px; margin: 0 auto; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          .muted { color: #6b7280; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .divider { border-top: 1px dashed #9ca3af; margin: 12px 0; }
          .total { font-size: 16px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>${SHOP_NAME}</h1>
          ${SHOP_PHONE ? `<div class="muted">${SHOP_PHONE}</div>` : ''}
          <div class="muted">Struk Transaksi ${receipt.transactionId ? `#${receipt.transactionId}` : ''}</div>
          <div class="muted">${new Date(receipt.createdAt).toLocaleString('id-ID')}</div>
          <div class="muted">Metode: ${receipt.paymentMethod.toUpperCase()}${receipt.referenceNumber ? ` · Ref: ${receipt.referenceNumber}` : ''}</div>
          <div class="divider"></div>
          <table>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tbody>
              <tr>
                <td class="total">Total</td>
                <td class="total" style="text-align:right;">${formatCurrency(receipt.total)}</td>
              </tr>
              ${receipt.cashReceived != null ? `
              <tr>
                <td style="padding-top:4px;">Uang Diterima</td>
                <td style="text-align:right; padding-top:4px;">${formatCurrency(receipt.cashReceived)}</td>
              </tr>
              <tr>
                <td class="total" style="color:#16a34a;">Kembalian</td>
                <td class="total" style="text-align:right; color:#16a34a;">${formatCurrency(receipt.change ?? 0)}</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  return true
}
