import { test } from 'node:test'
import assert from 'node:assert/strict'

const memoria = new Map()
globalThis.localStorage = {
  getItem: k => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: k => memoria.delete(k),
}

const {
  contarCambios, leerBorradorFormulario, guardarBorradorFormulario, borrarBorradorFormulario,
  leerListaPendiente, guardarListaPendiente, borrarListaPendiente,
} = await import('./borradorAdmin.js')

test('contarCambios cuenta altas, bajas y ediciones', () => {
  const publicados = [{ id: 'a', precio: 1 }, { id: 'b', precio: 2 }, { id: 'c', precio: 3 }]
  const lista = [{ id: 'a', precio: 1 }, { id: 'b', precio: 5 }, { id: 'd', precio: 4 }]
  assert.equal(contarCambios(lista, publicados), 3) // b editado, c borrado, d nuevo
  assert.equal(contarCambios(publicados, publicados), 0)
})

test('el borrador del formulario se guarda por producto y se borra', () => {
  guardarBorradorFormulario(undefined, { form: { nombre: 'Nuevo' }, imagenes: ['x.webp'] })
  guardarBorradorFormulario('p1', { form: { nombre: 'Editado' }, imagenes: [] })
  assert.equal(leerBorradorFormulario(undefined).form.nombre, 'Nuevo')
  assert.deepEqual(leerBorradorFormulario(undefined).imagenes, ['x.webp'])
  assert.equal(leerBorradorFormulario('p1').form.nombre, 'Editado')
  assert.ok(leerBorradorFormulario('p1').fecha)
  borrarBorradorFormulario(undefined)
  assert.equal(leerBorradorFormulario(undefined), null)
  assert.equal(leerBorradorFormulario('p1').form.nombre, 'Editado')
})

test('la lista pendiente guarda productos y base', () => {
  guardarListaPendiente([{ id: 'a' }], [{ id: 'b' }])
  assert.deepEqual(leerListaPendiente().products, [{ id: 'a' }])
  assert.deepEqual(leerListaPendiente().base, [{ id: 'b' }])
  borrarListaPendiente()
  assert.equal(leerListaPendiente(), null)
})

test('si el navegador no deja guardar, no rompe', () => {
  const original = globalThis.localStorage
  globalThis.localStorage = { getItem() { throw new Error('bloqueado') }, setItem() { throw new Error('lleno') }, removeItem() { throw new Error('x') } }
  assert.doesNotThrow(() => guardarListaPendiente([], []))
  assert.equal(leerListaPendiente(), null)
  assert.doesNotThrow(() => borrarListaPendiente())
  globalThis.localStorage = original
})
