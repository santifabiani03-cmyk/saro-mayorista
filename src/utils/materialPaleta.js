// Devuelve la etiqueta de material en español de una paleta de pádel según su nombre y descripción, o null si no corresponde.
export function materialPaleta(producto) {
  if (!producto || typeof producto !== 'object') return null;

  const norm = (s) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/sin\s+carbono/g, ' ');

  const nombre = norm(producto.nombre);
  const descripcion = norm(producto.descripcion);

  const forward = /carbono[^.,]{0,12}?(\d+)\s*k/;
  const reverse = /(\d+)\s*k[^.,]{0,12}?carbono/;

  let m = nombre.match(forward) || nombre.match(reverse);
  if (m) return `Carbono ${m[1]}K`;

  m = descripcion.match(forward) || descripcion.match(reverse);
  if (m) return `Carbono ${m[1]}K`;

  const loose = nombre.match(/(\d+)\s*k/);
  if (loose && (/carbono/.test(nombre) || /carbono/.test(descripcion))) {
    return `Carbono ${loose[1]}K`;
  }

  if (/carbono/.test(nombre) || /carbono/.test(descripcion)) return 'Carbono';

  return null;
}
