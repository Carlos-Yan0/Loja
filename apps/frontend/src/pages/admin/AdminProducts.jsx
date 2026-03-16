import { useState, useEffect, useCallback } from 'react';
import { productsApi } from '../../services/api';
import { ProductForm } from '../../components/ProductForm';
import { ConfirmModal } from '../../components/ConfirmModal';
import styles from './AdminProducts.module.css';

const formatPrice = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export function AdminProducts() {
  const [products, setProducts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [toast, setToast]               = useState('');
  const [formOpen, setFormOpen]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [formLoading, setFormLoading]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    productsApi
      .list()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit   = (p)  => { setEditing(p);   setFormOpen(true); };
  const openDelete = (p)  => setDeleteTarget(p);

  const handleSave = async (data) => {
    setFormLoading(true);
    try {
      if (editing) {
        await productsApi.update(editing.id, data);
        showToast('Produto atualizado!');
      } else {
        await productsApi.create(data);
        showToast('Produto criado!');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      alert(err.message || 'Erro ao salvar produto.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await productsApi.remove(deleteTarget.id);
      showToast('Produto excluído.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.message || 'Erro ao excluir produto.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Produtos</h1>
          <p className={styles.pageSubtitle}>
            {products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" className={styles.addBtn} onClick={openCreate}>
          + Novo
        </button>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      {loading && <div className={styles.state}><p>Carregando produtos...</p></div>}

      {!loading && error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <p>{error}</p>
          <button type="button" onClick={load} className={styles.retryBtn}>Tentar novamente</button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Nenhum produto cadastrado ainda.</p>
          <button type="button" className={styles.addBtn} onClick={openCreate}>
            Criar primeiro produto
          </button>
        </div>
      )}

      {/* ── Mobile: card list ── */}
      {!loading && !error && products.length > 0 && (
        <>
          <ul className={styles.cardList}>
            {products.map((p) => (
              <li key={p.id} className={styles.card}>
                <div className={styles.cardImg}>
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} />
                    : <span>—</span>
                  }
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.cardName}>{p.name}</p>
                  <p className={styles.cardCategory}>{p.category}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardPrice}>{formatPrice(p.price)}</span>
                    <span className={`${styles.cardStock} ${p.stock === 0 ? styles.stockOut : p.stock <= 5 ? styles.stockLow : ''}`}>
                      Estoque: {p.stock}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.editBtn} onClick={() => openEdit(p)}>Editar</button>
                  <button type="button" className={styles.deleteBtn} onClick={() => openDelete(p)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>

          {/* ── Desktop: table ── */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Imagem</th>
                  <th className={styles.th}>Nome</th>
                  <th className={styles.th}>Categoria</th>
                  <th className={styles.th}>Preço</th>
                  <th className={styles.th}>Estoque</th>
                  <th className={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.imgThumb}>
                        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span>—</span>}
                      </div>
                    </td>
                    <td className={styles.td}><span className={styles.productName}>{p.name}</span></td>
                    <td className={styles.td}><span className={styles.category}>{p.category}</span></td>
                    <td className={styles.td}><span className={styles.price}>{formatPrice(p.price)}</span></td>
                    <td className={styles.td}>
                      <span className={`${styles.stock} ${p.stock === 0 ? styles.stockOut : p.stock <= 5 ? styles.stockLow : ''}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.editBtn} onClick={() => openEdit(p)}>Editar</button>
                        <button type="button" className={styles.deleteBtn} onClick={() => openDelete(p)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ProductForm
        isOpen={formOpen}
        product={editing}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
        loading={formLoading}
      />
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Excluir produto"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
