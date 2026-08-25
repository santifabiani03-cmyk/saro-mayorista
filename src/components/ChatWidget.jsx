'use client'

import { useState, useRef, useEffect } from 'react'
import { track } from '../utils/analytics'

const BIENVENIDA = {
  role: 'bot',
  text: '¡Hola! 👋 Soy el asistente de SARO. Puedo ayudarte con productos, precios, envíos o a elegir tu paleta. ¿Qué necesitás?',
}

const SUGERENCIAS = [
  '¿Qué paleta me recomendás?',
  '¿Hacen envíos a mi zona?',
  '¿Cómo compro?',
]

const WaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
)

export default function ChatWidget({ whatsappNumber }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([BIENVENIDA])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [derivar, setDerivar] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Autoscroll al último mensaje
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!open) return
    // se guarda el id para cancelarlo: si cierran el chat antes de los 250 ms,
    // el temporizador quedaba vivo apuntando a un componente ya desmontado
    const id = setTimeout(() => inputRef.current?.focus(), 250)
    return () => clearTimeout(id)
  }, [open])

  const enviar = async (texto) => {
    const msg = (texto ?? input).trim()
    if (!msg || loading) return

    const nuevos = [...messages, { role: 'user', text: msg }]
    setMessages(nuevos)
    setInput('')
    setLoading(true)
    setDerivar(false)
    track('chat_mensaje')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nuevos.filter(m => m !== BIENVENIDA) }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages([...nuevos, { role: 'bot', text: data.error ?? 'No pude responder.' }])
        setDerivar(true)
      } else {
        setMessages([...nuevos, { role: 'bot', text: data.reply }])
        setDerivar(Boolean(data.whatsapp))
      }
    } catch {
      setMessages([...nuevos, {
        role: 'bot',
        text: 'Se me cortó la conexión. Probá de nuevo o escribinos por WhatsApp.',
      }])
      setDerivar(true)
    } finally {
      setLoading(false)
    }
  }

  // Resumen de la charla para que el vendedor tenga contexto al abrir WhatsApp
  const linkWhatsApp = () => {
    const ultima = [...messages].reverse().find(m => m.role === 'user')?.text
    const texto = ultima
      ? `Hola! Venía consultando por el chat de la web: ${ultima}`
      : 'Hola! Quería hacer una consulta.'
    track('chat_deriva_whatsapp')
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(texto)}`
  }

  return (
    <>
      {/* Burbuja */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) track('chat_abierto') }}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat de ayuda'}
        className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full shadow-float flex items-center justify-center transition-all duration-300 btn-press ${
          open ? 'bg-saro-dark rotate-90' : 'bg-saro-blue hover:bg-saro-mid'
        }`}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-white">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5h8M8 14h5m-8.5 6.5 2.6-1.7A9 9 0 1 1 21 12a9 9 0 0 1-13.9 7.6L4.5 20.5Z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-24 right-5 z-40 w-[min(92vw,380px)] bg-white rounded-2xl shadow-float border border-gray-100/80 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ height: 'min(70vh, 520px)' }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="bg-saro-dark px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
          <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <img src="/assets/logo-icon.png" alt="" className="h-4 w-auto brightness-0 invert opacity-90" />
          </span>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Asistente SARO</p>
            <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Respuestas al instante
            </p>
          </div>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFBFC]">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-saro-blue text-white rounded-br-sm'
                    : 'bg-white text-gray-700 border border-gray-100 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                {[0, 150, 300].map(d => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sugerencias (sólo al principio) */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGERENCIAS.map(s => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:border-saro-blue hover:text-saro-blue transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Derivación a WhatsApp */}
          {derivar && !loading && (
            <a
              href={linkWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors btn-press"
            >
              <WaIcon className="w-4 h-4" />
              Seguir por WhatsApp
            </a>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              aria-label="Escribí tu consulta"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 500))}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
              }}
              rows={1}
              placeholder="Escribí tu consulta…"
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm max-h-24 focus:outline-none focus:border-saro-blue"
            />
            <button
              onClick={() => enviar()}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
              className="w-10 h-10 rounded-xl bg-saro-blue hover:bg-saro-mid text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.3 4.5a.6.6 0 0 1 .8-.75l16.5 7.7a.6.6 0 0 1 0 1.1l-16.5 7.7a.6.6 0 0 1-.8-.75L6 12Zm0 0h6" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-300 text-center mt-2">
            Asistente automático · el pedido se cierra por WhatsApp
          </p>
        </div>
      </div>
    </>
  )
}
