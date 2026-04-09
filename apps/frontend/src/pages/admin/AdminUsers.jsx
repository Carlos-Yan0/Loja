import { useCallback, useEffect, useState } from 'react'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useAuth } from '../../context/useAuth'
import { usersApi } from '../../services/api'
import { formatPhone } from '../../utils/format'
import { validateUserManagementForm } from '../../utils/validation'
import styles from './AdminUsers.module.css'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  role: 'CUSTOMER',
  password: '',
}

const toForm = (entry) => ({
  name: entry?.name ?? '',
  email: entry?.email ?? '',
  phone: entry?.phone ? formatPhone(entry.phone) : '',
  role: entry?.role ?? 'CUSTOMER',
  password: '',
})

export function AdminUsers() {
  const { user: authenticatedUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  const showToast = useCallback((message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const load = useCallback((search = '') => {
    setLoading(true)
    setError('')

    usersApi
      .list(search)
      .then(setUsers)
      .catch((requestError) => setError(requestError.message || 'Nao foi possivel carregar os usuarios.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(searchTerm), 250)
    return () => clearTimeout(timer)
  }, [load, searchTerm])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setFormOpen(true)
  }

  const openEdit = (entry) => {
    setEditing(entry)
    setForm(toForm(entry))
    setFieldErrors({})
    setFormOpen(true)
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: name === 'phone' ? formatPhone(value) : value,
    }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSave = async (event) => {
    event.preventDefault()

    const validation = validateUserManagementForm(form, {
      requirePassword: !editing,
    })
    setFieldErrors(validation.errors)

    if (!validation.isValid) {
      return
    }

    setFormLoading(true)

    try {
      if (editing) {
        const payload = { ...validation.payload }

        if (editing.role === 'CUSTOMER') {
          delete payload.password
        }

        if (editing.id === authenticatedUser?.id) {
          delete payload.role
        }

        await usersApi.update(editing.id, payload)
        showToast('Usuario atualizado com sucesso.')
      } else {
        const { role, ...createPayload } = validation.payload
        const createdUser = await usersApi.create(createPayload)

        if (role === 'ADMIN') {
          await usersApi.update(createdUser.id, { role: 'ADMIN' })
        }

        showToast('Usuario criado com sucesso.')
      }

      setFormOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      load(searchTerm)
    } catch (requestError) {
      window.alert(requestError.message || 'Nao foi possivel salvar o usuario.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)

    try {
      await usersApi.remove(deleteTarget.id)
      showToast('Usuario removido com sucesso.')
      setDeleteTarget(null)
      load(searchTerm)
    } catch (requestError) {
      window.alert(requestError.message || 'Nao foi possivel remover o usuario.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const canEditPassword = !editing || editing.role === 'ADMIN'

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Usuarios</h1>
          <p className={styles.pageSubtitle}>
            {users.length} usuario{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className={styles.pageHeaderActions}>
          <label className={styles.searchLabel}>
            Buscar por nome
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={styles.searchInput}
              placeholder="Digite parte do nome"
            />
          </label>
          <button type="button" className={styles.addBtn} onClick={openCreate}>
            {formOpen && !editing ? 'Novo cadastro aberto' : '+ Novo'}
          </button>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      {formOpen && (
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <div>
              <h2 className={styles.formTitle}>{editing ? 'Editar usuario' : 'Novo usuario'}</h2>
              <p className={styles.formHint}>
                Todos os campos seguem o mesmo padrao de validacao do cadastro publico.
              </p>
            </div>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setFormOpen(false)
                setEditing(null)
                setForm(EMPTY_FORM)
                setFieldErrors({})
              }}
            >
              Fechar
            </button>
          </div>

          <form className={styles.form} onSubmit={handleSave}>
            <label className={styles.label}>
              Nome
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={styles.input}
                required
              />
              {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
            </label>

            <label className={styles.label}>
              E-mail
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={styles.input}
                required
              />
              {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
            </label>

            <label className={styles.label}>
              Telefone
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="(00) 00000-0000"
              />
              {fieldErrors.phone && <span className={styles.fieldError}>{fieldErrors.phone}</span>}
            </label>

            <label className={styles.label}>
              Perfil
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className={styles.input}
                disabled={editing?.id === authenticatedUser?.id}
              >
                <option value="CUSTOMER">Cliente</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>

            {canEditPassword && (
              <label className={styles.label}>
                {editing ? 'Nova senha (opcional)' : 'Senha'}
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder={editing ? 'Preencha apenas se quiser alterar' : 'Minimo de 8 caracteres'}
                />
                {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
              </label>
            )}

            {!canEditPassword && (
              <p className={styles.selfHint}>
                A senha de clientes so pode ser alterada pelo proprio cliente.
              </p>
            )}

            {editing?.id === authenticatedUser?.id && (
              <p className={styles.selfHint}>Seu proprio perfil nao pode trocar o papel por esta tela.</p>
            )}

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn} disabled={formLoading}>
                {formLoading ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Criar usuario'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading && (
        <div className={styles.state}>
          <p>Carregando usuarios...</p>
        </div>
      )}

      {!loading && error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <p>{error}</p>
          <button type="button" onClick={() => load(searchTerm)} className={styles.retryBtn}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Nenhum usuario cadastrado ainda.</p>
          <button type="button" className={styles.addBtn} onClick={openCreate}>
            Criar primeiro usuario
          </button>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <ul className={styles.cardList}>
            {users.map((entry) => (
              <li key={entry.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <p className={styles.cardName}>{entry.name}</p>
                  <p className={styles.cardEmail}>{entry.email}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.roleBadge}>{entry.role === 'ADMIN' ? 'Admin' : 'Cliente'}</span>
                    <span>{entry.phone ? formatPhone(entry.phone) : 'Sem telefone'}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.editBtn} onClick={() => openEdit(entry)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget(entry)}
                    disabled={entry.id === authenticatedUser?.id}
                  >
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
                  <th className={styles.th}>Nome</th>
                  <th className={styles.th}>E-mail</th>
                  <th className={styles.th}>Telefone</th>
                  <th className={styles.th}>Perfil</th>
                  <th className={styles.th}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.id} className={styles.tr}>
                    <td className={styles.td}>{entry.name}</td>
                    <td className={styles.td}>{entry.email}</td>
                    <td className={styles.td}>{entry.phone ? formatPhone(entry.phone) : 'Sem telefone'}</td>
                    <td className={styles.td}>
                      <span className={styles.roleBadge}>{entry.role === 'ADMIN' ? 'Admin' : 'Cliente'}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.editBtn} onClick={() => openEdit(entry)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => setDeleteTarget(entry)}
                          disabled={entry.id === authenticatedUser?.id}
                        >
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

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Excluir usuario"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta acao nao pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  )
}
