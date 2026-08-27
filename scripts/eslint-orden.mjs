// Chequeo puntual: constantes usadas antes de declararse.
// En JavaScript eso lanza ReferenceError al ejecutar, pero el build pasa limpio
// — ya dejó la escena 3D en blanco dos veces.
export default [
  {
    files: ['**/*.jsx', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-use-before-define': ['error', { variables: true, functions: false, classes: false }],
    },
  },
]
