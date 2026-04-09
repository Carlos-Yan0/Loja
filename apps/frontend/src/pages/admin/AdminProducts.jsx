import { useCallback, useEffect, useState } from 'react'
import { ProductForm } from '../../components/ProductForm'
import { ConfirmModal } from '../../components/ConfirmModal'
import { productsApi } from '../../services/api'
import { formatPrice } from '../../utils/format'
import styles from './AdminProducts.module.css'

export function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    setError('')

    productsApi
      .list()
      .then(setProducts)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setFormOpen(true)
  }

  const handleSave = async ({ newFiles, ...payload }) => {
    setFormLoading(true)

    try {
      let product = editing
        ? await productsApi.update(editing.id, payload)
        : await productsApi.create(payload)

      const uploadErrors = []
      for (const file of newFiles) {
        try {
          const uploadResult = await productsApi.uploadImage(product.id, file)
          product = uploadResult.product
        } catch (uploadError) {
          uploadErrors.push(uploadError instanceof Error ? uploadError.message : 'Falha ao enviar imagem.')
        }
      }

      if (uploadErrors.length > 0) {
        showToast(
          `${editing ? 'Produto atualizado' : 'Produto criado'} sem ${uploadErrors.length} imagem(ns). Edite o produto e tente novamente.`
        )
      } else {
        showToast(editing ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.')
      }

      setFormOpen(false)
      setEditing(null)
      load()
    } catch (requestError) {
      window.alert(requestError.message || 'Erro ao salvar produto.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)
    try {
      await productsApi.remove(deleteTarget.id)
      showToast('Produto excluído com sucesso.')
      setDeleteTarget(null)
      load()
    } catch (requestError) {
      window.alert(requestError.message || 'Erro ao excluir produto.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Produtos</h1>
          <p className={styles.pageSubtitle}>
            {products.length} produto{products.length !== 1 ? 's' : ''} cadastrado
            {products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" className={styles.addBtn} onClick={openCreate}>
          + Novo
        </button>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      {loading && (
        <div className={styles.state}>
          <p>Carregando produtos...</p>
        </div>
      )}

      {!loading && error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <p>{error}</p>
          <button type="button" onClick={load} className={styles.retryBtn}>
            Tentar novamente
          </button>
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

      {!loading && !error && products.length > 0 && (
        <>
          <ul className={styles.cardList}>
            {products.map((product) => (
              <li key={product.id} className={styles.card}>
                <div className={styles.cardImg}>
                  {product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <span>—</span>}
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.cardName}>{product.name}</p>
                  <p className={styles.cardCategory}>{product.category}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardPrice}>{formatPrice(product.price)}</span>
                    <span
                      className={`${styles.cardStock} ${
                        product.stock === 0 ? styles.stockOut : product.stock <= 5 ? styles.stockLow : ''
                      }`}
                    >
                      Estoque: {product.stock}
                    </span>
                  </div>
                  <p className={styles.imageCount}>{product.images.length} imagem(ns)</p>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.editBtn} onClick={() => openEdit(product)}>
                    Editar
                  </button>
                  <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(product)}>
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Imagem</th>
                  <th className={styles.th}>Nome</th>
                  <th className={styles.th}>Categoria</th>
                  <th className={styles.th}>Preço</th>
                  <th className={styles.th}>Estoque</th>
                  <th className={styles.th}>Imagens</th>
                  <th className={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.imgThumb}>
                        {product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <span>—</span>}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.productName}>{product.name}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.category}>{product.category}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.price}>{formatPrice(product.price)}</span>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.stock} ${
                          product.stock === 0 ? styles.stockOut : product.stock <= 5 ? styles.stockLow : ''
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.imageCount}>{product.images.length}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.editBtn} onClick={() => openEdit(product)}>
                          Editar
                        </button>
                        <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(product)}>
                          Excluir
                        </button>
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
        isOpen={Boolean(deleteTarget)}
        title="Excluir produto"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  )
}
