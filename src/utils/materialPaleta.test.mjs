import test from 'node:test';
import assert from 'node:assert/strict';
import { materialPaleta } from './materialPaleta.js';

test('Raptor Carbono 12k', () => {
  assert.equal(materialPaleta({ nombre: 'Raptor Carbono 12k ' }), 'Carbono 12K');
});

test('Flash Carbono 3k', () => {
  assert.equal(materialPaleta({ nombre: 'Flash Carbono 3k' }), 'Carbono 3K');
});

test('Massive 12k con carbono en descripción', () => {
  assert.equal(
    materialPaleta({ nombre: 'Massive 12k', descripcion: 'construida en carbono' }),
    'Carbono 12K'
  );
});

test('Massive 12k sin carbono', () => {
  assert.equal(
    materialPaleta({ nombre: 'Massive 12k', descripcion: 'fibra de vidrio' }),
    null
  );
});

test('Vortice X con caras de carbono 12K', () => {
  assert.equal(
    materialPaleta({ nombre: 'Vortice X', descripcion: 'Paleta con caras de carbono 12K.' }),
    'Carbono 12K'
  );
});

test('Saro MAX 3.0 Carbono', () => {
  assert.equal(materialPaleta({ nombre: 'Saro MAX 3.0 Carbono' }), 'Carbono');
});

test('Flash Fibra', () => {
  assert.equal(
    materialPaleta({ nombre: 'Flash Fibra', descripcion: 'caras de fibra de vidrio' }),
    null
  );
});

test('Gold PRO sin material relevante', () => {
  assert.equal(
    materialPaleta({ nombre: 'Gold PRO', descripcion: 'disponible en negro y rojo' }),
    null
  );
});

test('modelo sin carbono', () => {
  assert.equal(
    materialPaleta({ nombre: 'X', descripcion: 'modelo sin carbono' }),
    null
  );
});

test('objeto vacío', () => {
  assert.equal(materialPaleta({}), null);
});

test('nombre y descripcion null', () => {
  assert.equal(materialPaleta({ nombre: null, descripcion: null }), null);
});
