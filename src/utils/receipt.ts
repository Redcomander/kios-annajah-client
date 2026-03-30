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

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export function renderReceiptHtml(receipt: ReceiptData, receiptWidthMm = 58) {
  const safeWidthMm = receiptWidthMm === 80 ? 80 : 58
  const itemsHtml = receipt.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0; vertical-align:top;">${escapeHtml(item.name)}<br><span style="color:#6b7280; font-size:12px;">${item.qty} x ${formatCurrency(item.price)}</span></td>
          <td style="padding:6px 0; text-align:right; vertical-align:top;">${formatCurrency(item.qty * item.price)}</td>
        </tr>
      `,
    )
    .join('')

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${receipt.transactionId ? `#${receipt.transactionId}` : ''}</title>
        <style>
          @page { size: ${safeWidthMm}mm auto; margin: 2mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111827; width: ${safeWidthMm - 4}mm; }
          .wrap { width: 100%; margin: 0; }
          h1 { font-size: 14px; margin: 0 0 3px; }
          .muted { color: #4b5563; font-size: 10px; line-height: 1.3; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .divider { border-top: 1px dashed #6b7280; margin: 8px 0; }
          .total { font-size: 13px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>${escapeHtml(SHOP_NAME)}</h1>
          ${SHOP_PHONE ? `<div class="muted">${escapeHtml(SHOP_PHONE)}</div>` : ''}
          <div class="muted">Struk Transaksi ${receipt.transactionId ? `#${receipt.transactionId}` : ''}</div>
          <div class="muted">${new Date(receipt.createdAt).toLocaleString('id-ID')}</div>
          <div class="muted">Metode: ${escapeHtml(receipt.paymentMethod.toUpperCase())}${receipt.referenceNumber ? ` · Ref: ${escapeHtml(receipt.referenceNumber)}` : ''}</div>
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
  `
}

export async function printReceipt(receipt: ReceiptData) {
  let receiptWidthMm = 58
  try {
    if (window.desktopApp?.getPrinterSettings) {
      const settings = await window.desktopApp.getPrinterSettings()
      if (settings.receiptWidthMm === 80) {
        receiptWidthMm = 80
      }
    }
  } catch (error) {
    console.error('Failed to read printer settings, using 58mm default.', error)
  }

  const html = renderReceiptHtml(receipt, receiptWidthMm)

  if (window.desktopApp?.printHTML) {
    try {
      return await window.desktopApp.printHTML({
        html,
        title: `Receipt ${receipt.transactionId ? `#${receipt.transactionId}` : ''}`,
      })
    } catch (error) {
      console.error('Desktop print failed, falling back to browser print.', error)
    }
  }

  const printWindow = window.open('', '_blank', 'width=420,height=720')
  if (!printWindow) {
    return false
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  return true
}
