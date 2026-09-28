"""Achica texturas embebidas de un GLB (buffer 0 con imágenes + datos meshopt).

Uso: python achicar_texturas.py entrada.glb salida.glb
Deja base_color como está y lleva metallic_roughness y normal a 1024 px,
emissive a 512 px. Reconstruye el buffer 0 respetando los tramos de
EXT_meshopt_compression (que viven en el mismo buffer).
"""
import io
import json
import struct
import sys

from PIL import Image

LADO = {'metallic_roughness': (1024, 88), 'normal': (1024, 92), 'emissive': (512, 85)}

entrada, salida = sys.argv[1], sys.argv[2]
b = open(entrada, 'rb').read()
ln = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + ln])
bin_ini = 20 + ln + 8
bin_len = struct.unpack('<I', b[20 + ln:24 + ln])[0]
binario = b[bin_ini:bin_ini + bin_len]

# Tramos del buffer 0: (offset original, largo, dueño) — dueño es la vista o
# la extensión meshopt que apunta ahí.
tramos = []
for i, v in enumerate(j['bufferViews']):
    if v['buffer'] == 0:
        tramos.append([v.get('byteOffset', 0), v['byteLength'], ('vista', i)])
    ext = v.get('extensions', {}).get('EXT_meshopt_compression')
    if ext and ext['buffer'] == 0:
        tramos.append([ext.get('byteOffset', 0), ext['byteLength'], ('meshopt', i)])
tramos.sort(key=lambda t: t[0])

nuevos = {}
for im in j['images']:
    nombre = im.get('name')
    if nombre not in LADO:
        continue
    v = j['bufferViews'][im['bufferView']]
    datos = binario[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    img = Image.open(io.BytesIO(datos)).convert('RGB')
    lado, calidad = LADO[nombre]
    if img.width > lado:
        img = img.resize((lado, lado), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, 'WEBP', quality=calidad, method=6)
    nuevos[im['bufferView']] = out.getvalue()
    print(f'{nombre}: {len(datos) // 1024} KB -> {len(nuevos[im["bufferView"]]) // 1024} KB ({img.width}px)')

armado = bytearray()
for off, largo, (tipo, i) in tramos:
    while len(armado) % 4:
        armado.append(0)
    datos = nuevos.get(i) if tipo == 'vista' and i in nuevos else binario[off:off + largo]
    nuevo_off = len(armado)
    armado += datos
    if tipo == 'vista':
        j['bufferViews'][i]['byteOffset'] = nuevo_off
        j['bufferViews'][i]['byteLength'] = len(datos)
    else:
        ext = j['bufferViews'][i]['extensions']['EXT_meshopt_compression']
        ext['byteOffset'] = nuevo_off
while len(armado) % 4:
    armado.append(0)
j['buffers'][0]['byteLength'] = len(armado)

js = json.dumps(j, separators=(',', ':')).encode('utf-8')
while len(js) % 4:
    js += b' '
total = 12 + 8 + len(js) + 8 + len(armado)
with open(salida, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(armado), 0x004E4942)); f.write(armado)
print('listo:', salida, total // 1024, 'KB')
