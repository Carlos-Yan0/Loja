import { formatCep, formatDateTime, formatPrice } from '../utils/format'
import styles from './ReceiptCard.module.css'

const payMethodLabels = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  BOLETO: 'Boleto',
}

export function ReceiptCard({ receipt, onPrint }) {
  if (!receipt) return null

  return (
    <section className={styles.wrapper}>
      <div className={styles.actions}>
        <button type="button" onClick={onPrint} className={styles.printBtn}>
          Imprimir notinha
        </button>
      </div>

      <article className={styles.receipt} id="receipt-print-area">
        <header className={styles.header}>
          <div>
            <p className={styles.brand}>GF STORE</p>
            <h2 className={styles.title}>Cupom fiscal simplificado</h2>
          </div>
          <div className={styles.meta}>
            <span>Pedido: {receipt.orderNumber.slice(0, 8).toUpperCase()}</span>
            <span>Emitido em {formatDateTime(receipt.issuedAt)}</span>
          </div>
        </header>

        <section className={styles.block}>
          <p className={styles.blockTitle}>Cliente</p>
          <p className={styles.blockValue}>{receipt.customerName}</p>
          <p className={styles.blockTitle}>Pagamento</p>
          <p className={styles.blockValue}>{payMethodLabels[receipt.paymentMethod] ?? receipt.paymentMethod}</p>
        </section>

        <section className={styles.block}>
          <p className={styles.blockTitle}>Entrega</p>
          <p className={styles.blockValue}>
            {receipt.deliveryAddress.street}, {receipt.deliveryAddress.number}
            {receipt.deliveryAddress.complement ? ` - ${receipt.deliveryAddress.complement}` : ''}
          </p>
          <p className={styles.blockValue}>
            {receipt.deliveryAddress.neighborhood} - {receipt.deliveryAddress.city}/{receipt.deliveryAddress.state}
          </p>
          <p className={styles.blockValue}>CEP {formatCep(receipt.deliveryAddress.cep)}</p>
        </section>

        <section className={styles.items}>
          <div className={styles.itemsHeader}>
            <span>Descrição</span>
            <span>Qtd.</span>
            <span>Valor</span>
          </div>
          {receipt.items.map((item) => (
            <div key={`${item.description}-${item.quantity}`} className={styles.itemRow}>
              <span>{item.description}</span>
              <span>{item.quantity}</span>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </section>

        <footer className={styles.footer}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <strong>{formatPrice(receipt.subtotal)}</strong>
          </div>
          <div className={styles.totalRow}>
            <span>Frete</span>
            <strong>{formatPrice(receipt.shipping)}</strong>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>Total</span>
            <strong>{formatPrice(receipt.total)}</strong>
          </div>
        </footer>
      </article>
    </section>
  )
}
