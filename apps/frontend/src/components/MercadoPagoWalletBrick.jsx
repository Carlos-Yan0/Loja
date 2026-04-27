import { useEffect, useRef } from 'react'

const SDK_SCRIPT_ID = 'mercado-pago-sdk-v2'
const SDK_SRC = 'https://sdk.mercadopago.com/js/v2'

let sdkPromise = null

const loadMercadoPagoSdk = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('SDK do Mercado Pago indisponivel neste ambiente.'))
  }

  if (window.MercadoPago) {
    return Promise.resolve(window.MercadoPago)
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(SDK_SCRIPT_ID)
      if (existing) {
        existing.addEventListener('load', () => resolve(window.MercadoPago))
        existing.addEventListener('error', () => reject(new Error('Falha ao carregar SDK do Mercado Pago.')))
        return
      }

      const script = document.createElement('script')
      script.id = SDK_SCRIPT_ID
      script.src = SDK_SRC
      script.async = true
      script.onload = () => resolve(window.MercadoPago)
      script.onerror = () => reject(new Error('Falha ao carregar SDK do Mercado Pago.'))
      document.head.appendChild(script)
    }).finally(() => {
      if (!window.MercadoPago) {
        sdkPromise = null
      }
    })
  }

  return sdkPromise
}

export function MercadoPagoWalletBrick({ preferenceId, publicKey, onReady, onError }) {
  const containerIdRef = useRef(`mp-wallet-brick-${Math.random().toString(36).slice(2)}`)
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!preferenceId || !publicKey) return

    let active = true
    let walletBrickController = null
    let controllerPromise = null
    const container = document.getElementById(containerIdRef.current)
    if (container) {
      container.innerHTML = ''
    }

    const renderBrick = async () => {
      try {
        const MercadoPago = await loadMercadoPagoSdk()
        if (!active || typeof MercadoPago !== 'function') return

        const mp = new MercadoPago(publicKey, { locale: 'pt-BR' })
        const bricksBuilder = mp.bricks()
        controllerPromise = bricksBuilder.create('wallet', containerIdRef.current, {
          initialization: {
            preferenceId,
            redirectMode: 'self',
          },
          customization: {
            theme: 'default',
          },
          callbacks: {
            onReady: () => {
              onReadyRef.current?.()
            },
            onError: (error) => {
              onErrorRef.current?.(error)
            },
          },
        })

        walletBrickController = await controllerPromise

        if (!active && walletBrickController && typeof walletBrickController.unmount === 'function') {
          walletBrickController.unmount()
        }
      } catch (error) {
        onErrorRef.current?.(error)
      }
    }

    renderBrick()

    return () => {
      active = false

      const cleanup = async () => {
        if (walletBrickController && typeof walletBrickController.unmount === 'function') {
          walletBrickController.unmount()
        } else if (controllerPromise) {
          try {
            const createdController = await controllerPromise
            if (createdController && typeof createdController.unmount === 'function') {
              createdController.unmount()
            }
          } catch {
            return
          }
        }
      }

      void cleanup()

      const mountedContainer = document.getElementById(containerIdRef.current)
      if (mountedContainer) {
        mountedContainer.innerHTML = ''
      }
    }
  }, [preferenceId, publicKey])

  return <div id={containerIdRef.current} style={{ width: '100%', maxWidth: '100%' }} />
}
