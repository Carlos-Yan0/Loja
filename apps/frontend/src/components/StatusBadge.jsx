import styles from './StatusBadge.module.css';

const STATUS_CONFIG = {
  PROCESSING: { label: 'Processando', mod: 'processing' },
  COMPLETED:  { label: 'Concluído',   mod: 'completed' },
  CANCELED:   { label: 'Cancelado',   mod: 'canceled' },
  DELIVERED:  { label: 'Entregue',    mod: 'delivered' },
  IN_TRANSIT: { label: 'Em trânsito', mod: 'transit' },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? { label: status, mod: 'default' };
  return (
    <span className={`${styles.badge} ${styles[config.mod]}`}>
      {config.label}
    </span>
  );
}
