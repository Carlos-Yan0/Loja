import { useState, useEffect } from 'react';
import styles from './ProductForm.module.css';

const EMPTY_FORM = {
  name: '',
  price: '',
  category: '',
  tags: '',
  stock: '',
  images: '',
};

function toForm(product) {
  if (!product) return EMPTY_FORM;
  return {
    name: product.name ?? '',
    price: product.price != null ? String(product.price) : '',
    category: product.category ?? '',
    tags: product.tags ?? '',
    stock: product.stock != null ? String(product.stock) : '',
    images: Array.isArray(product.images) ? product.images.join('\n') : '',
  };
}

export function ProductForm({ isOpen, product, onSave, onClose, loading }) {
  const isEdit = !!product;
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(product));
      setError('');
    }
  }, [isOpen, product]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);

    if (!form.name.trim()) return setError('Nome é obrigatório.');
    if (isNaN(price) || price < 0) return setError('Preço inválido.');
    if (!form.category.trim()) return setError('Categoria é obrigatória.');
    if (isNaN(stock) || stock < 0) return setError('Estoque inválido.');

    const images = form.images
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    onSave({
      name: form.name.trim(),
      price,
      category: form.category.trim(),
      tags: form.tags.trim() || null,
      stock,
      images,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <div className={styles.header}>
          <h2 id="form-title" className={styles.title}>
            {isEdit ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.grid}>
            <label className={styles.label} style={{ gridColumn: '1 / -1' }}>
              Nome do produto
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Camiseta Oversized Preta"
                className={styles.input}
                required
              />
            </label>

            <label className={styles.label}>
              Preço (R$)
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={styles.input}
                required
              />
            </label>

            <label className={styles.label}>
              Estoque
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className={styles.input}
                required
              />
            </label>

            <label className={styles.label}>
              Categoria
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Ex: oversized, feminino..."
                className={styles.input}
                required
              />
            </label>

            <label className={styles.label}>
              Tags <span className={styles.optional}>(opcional)</span>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="Ex: lançamento, promoção"
                className={styles.input}
              />
            </label>

            <label className={styles.label} style={{ gridColumn: '1 / -1' }}>
              URLs das imagens{' '}
              <span className={styles.optional}>(uma por linha)</span>
              <textarea
                name="images"
                value={form.images}
                onChange={handleChange}
                placeholder={'https://exemplo.com/imagem1.jpg\nhttps://exemplo.com/imagem2.jpg'}
                className={styles.textarea}
                rows={3}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
