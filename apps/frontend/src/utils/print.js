export const printElementById = (elementId, options = {}) => {
  const element = document.getElementById(elementId)
  if (!element) return false

  const title = options.title ?? 'Notinha do pedido'
  const printWindow = window.open('', '_blank', 'width=720,height=920')
  if (!printWindow) return false

  printWindow.document.open()
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${document.head.innerHTML}
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body {
            padding: 1rem;
          }
          @page {
            margin: 10mm;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()

  const printNow = () => {
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  if (printWindow.document.readyState === 'complete') {
    setTimeout(printNow, 80)
    return true
  }

  printWindow.onload = () => {
    setTimeout(printNow, 80)
  }

  return true
}
