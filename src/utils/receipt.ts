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
  const contentWidthMm = Math.max(48, safeWidthMm - 4)

  const itemsHtml = receipt.items
    .map(
      (item) => `
        <div style="margin:2px 0;">
          <div style="font-size:11px; font-weight:800; word-break:break-word;">${escapeHtml(item.name)}</div>
          <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:700;">
            <span>${item.qty} x ${formatCurrency(item.price)}</span>
            <span>${formatCurrency(item.qty * item.price)}</span>
          </div>
        </div>
      `,
    )
    .join('')

  const txDate = new Date(receipt.createdAt)
  const dateStr = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Struk${receipt.transactionId ? ` #${receipt.transactionId}` : ''}</title>
    <style>
      @page { size: ${safeWidthMm}mm auto; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Arial Narrow', Arial, sans-serif;
        font-size: 11px;
        font-weight: 700;
        color: #000;
        width: ${contentWidthMm}mm;
        padding: 1.5mm 2mm 3mm;
      }
      .center { text-align: center; }
      .divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      .row { display: flex; justify-content: space-between; align-items: baseline; margin: 2px 0; }
      .row-label { flex: 1; min-width: 0; padding-right: 4px; }
      .row-value { flex-shrink: 0; text-align: right; }
    </style>
  </head>
  <body>
    <div class="center" style="margin-bottom:3px;">
      <div style="font-size:15px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase;">${escapeHtml(SHOP_NAME)}</div>
      ${SHOP_PHONE ? `<div style="font-size:9px; font-weight:700;">${escapeHtml(SHOP_PHONE)}</div>` : ''}
    </div>
    <div class="divider"></div>
    <div style="font-size:9px; font-weight:700; margin-bottom:1px;">
      ${receipt.transactionId ? `No: #${receipt.transactionId} | ` : ''}${dateStr} ${timeStr}
    </div>
    <div style="font-size:9px; font-weight:700;">
      Metode: ${escapeHtml(receipt.paymentMethod.toUpperCase())}${receipt.referenceNumber ? ` | Ref: ${escapeHtml(receipt.referenceNumber)}` : ''}
    </div>
    <div class="divider"></div>
    ${itemsHtml}
    <div class="divider"></div>
    <div class="row" style="font-size:13px; font-weight:900;">
      <span class="row-label">TOTAL</span>
      <span class="row-value">${formatCurrency(receipt.total)}</span>
    </div>
    ${receipt.cashReceived != null ? `
    <div class="row" style="font-size:11px; font-weight:700;">
      <span class="row-label">Tunai</span>
      <span class="row-value">${formatCurrency(receipt.cashReceived)}</span>
    </div>
    <div class="row" style="font-size:12px; font-weight:900;">
      <span class="row-label">Kembali</span>
      <span class="row-value">${formatCurrency(receipt.change ?? 0)}</span>
    </div>` : ''}
    <div class="divider"></div>
    <div class="center" style="font-size:9px; font-weight:700; margin-top:2px;">
      --- Terima Kasih Sudah Berbelanja ---
    </div>
  </body>
</html>`
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
