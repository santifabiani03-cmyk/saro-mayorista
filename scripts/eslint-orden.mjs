// Dos errores que el build de Next NO detecta y que revientan la página al
// abrirla — los dos ya dejaron la escena 3D en blanco:
//   no-use-before-define  usar una const antes de su declaración
//   no-undef              usar algo que no existe (un typo, o algo que se borró)
export default [
  {
    files: ['**/*.jsx', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: Object.fromEntries([
        'window', 'document', 'navigator', 'performance', 'devicePixelRatio',
        'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout',
        'setInterval', 'clearInterval', 'console', 'fetch', 'Image', 'Audio',
        'ResizeObserver', 'IntersectionObserver', 'MutationObserver',
        'URL', 'URLSearchParams', 'Blob', 'FileReader', 'FormData',
        'localStorage', 'sessionStorage', 'location', 'history', 'alert',
        'process', 'Buffer', 'React', 'HTMLElement', 'Element', 'Node',
        'CustomEvent', 'Event', 'AbortController', 'structuredClone',
        'requestIdleCallback', 'matchMedia', 'getComputedStyle', 'crypto',
        'confirm', 'prompt', 'atob', 'btoa', 'DOMParser', 'XMLHttpRequest',
        'WebSocket', 'Worker', 'CanvasRenderingContext2D', 'ImageData', 'Path2D',
      ].map(g => [g, 'readonly'])),
    },
    rules: {
      'no-use-before-define': ['error', { variables: true, functions: false, classes: false }],
      'no-undef': 'error',
    },
  },
]
