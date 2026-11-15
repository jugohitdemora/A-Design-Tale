import { textos, tx } from './i18n.js';

// Todo lo que es "marca" del juego vive aquí. Cambiar el nombre = cambiar NOMBRE.
const MARCA = {
  lema: { es: 'CONSTRUYE UNA MISIÓN. TRAE A TU TRIPULACIÓN.', en: 'BUILD A MISSION. BRING YOUR CREW.' },
  jugadores: { es: '1–4 JUGADORES', en: '1–4 PLAYERS' },
};

export const JUEGO = {
  NOMBRE: 'PROJECT ORBIT',                     // placeholder
  get LEMA() { return tx(MARCA.lema); },
  get JUGADORES() { return tx(MARCA.jugadores); },
  MAX_JUGADORES: 4,
  APP_ID: 'a-design-tale-2026',               // prefijo de los temas MQTT: separa nuestras salas de otras apps
};

// Brokers MQTT públicos (WebSocket seguro). Se usan todos a la vez, redundantes: basta con que uno funcione.
// El orden importa: la presencia (mirada) va solo por el primero conectado.
export const RED = {
  BROKERS: [
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
    'wss://broker.emqx.io:8084/mqtt',      // descarta por encima de ~10 msg/s por cliente: mejor el último
  ],
};

export const TEXTOS = textos({
  es: { unirse: 'UNIRSE A LA TRIPULACIÓN', ajustes: 'AJUSTES' },
  en: { unirse: 'JOIN CREW', ajustes: 'SETTINGS' },
});
