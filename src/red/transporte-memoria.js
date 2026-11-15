// Transporte simulado para pruebas: entrega asíncrona, retrasos, descubrimiento asimétrico y salidas.
// Mantiene el orden por pareja de pares (como un canal WebRTC fiable y ordenado).

// retrasoSalida: [min, max] ms hasta que los demás se enteran de que alguien se fue (Trystero puede tardar).
export function crearRed({ retrasoMin = 5, retrasoMax = 40, descubrimiento = [50, 400], retrasoSalida = null } = {}) {
  const nodos = new Map(); // peerId -> nodo
  const azar = (a, b) => a + Math.random() * (b - a);
  const ultimaEntrega = new Map(); // "a>b" -> instante
  let contador = 0;

  function entregar(de, a, f) {
    const clave = `${de}>${a}`;
    const t = Math.max(performance.now() + azar(retrasoMin, retrasoMax), (ultimaEntrega.get(clave) || 0) + 0.1);
    ultimaEntrega.set(clave, t);
    setTimeout(() => { if (nodos.has(a) && nodos.has(de) && nodos.get(a).conoce.has(de)) f(); }, t - performance.now());
  }

  return {
    // opciones.descubrimiento: [min, max] ms hasta que cada par conoce al otro (por separado en cada sentido).
    unir(opciones = {}) {
      const id = `p${++contador}`;
      const nodo = { id, conoce: new Set(), alRecibir: () => {}, alEntrar: () => {}, alSalir: () => {} };
      const [dmin, dmax] = opciones.descubrimiento || descubrimiento;
      for (const otro of nodos.values()) {
        setTimeout(() => { if (nodos.has(id) && nodos.has(otro.id)) { nodo.conoce.add(otro.id); nodo.alEntrar(otro.id); } }, azar(dmin, dmax));
        setTimeout(() => { if (nodos.has(id) && nodos.has(otro.id)) { otro.conoce.add(id); otro.alEntrar(id); } }, azar(dmin, dmax));
      }
      nodos.set(id, nodo);
      return {
        selfId: id,
        enviar(tipo, datos, destino) {
          const copia = structuredClone(datos);
          const destinos = destino ? [destino] : [...nodo.conoce];
          for (const d of destinos) {
            if (!nodo.conoce.has(d)) continue;
            entregar(id, d, () => nodos.get(d).alRecibir(tipo, structuredClone(copia), id));
          }
        },
        alRecibir: (f) => { nodo.alRecibir = f; },
        alEntrar: (f) => { nodo.alEntrar = f; },
        alSalir: (f) => { nodo.alSalir = f; },
        pares: () => [...nodo.conoce],
        salir() {
          nodos.delete(id);
          for (const otro of nodos.values()) {
            if (!otro.conoce.has(id)) continue;
            const t = retrasoSalida ? azar(...retrasoSalida) : azar(retrasoMin, retrasoMax * 3);
            setTimeout(() => { if (otro.conoce.delete(id)) otro.alSalir(id); }, t);
          }
        },
      };
    },
  };
}
