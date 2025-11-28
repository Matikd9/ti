# MVP detección de baches con Arduino y Bluetooth

## 1. Objetivo general
MVP funcional para detectar baches con un Arduino montado en un auto de juguete, transmitiendo por Bluetooth las detecciones para almacenarlas, clasificarlas y analizarlas posteriormente.

## 2. Hardware
- Arduino Uno R3
- Sensor ultrasónico HC-SR04
- Módulo Bluetooth HC-05 / ZS-040
- Protoboard y cables Dupont
- Alimentación por USB

## 3. Conexiones
### HC-SR04
- VCC → 5V  
- GND → GND  
- TRIG → Pin 9  
- ECHO → Pin 10

### HC-05 (Bluetooth)
- TX → Pin 2  
- RX → Pin 3  
- VCC → 5V  
- GND → GND

## 4. Lógica del Arduino
1. Mide distancia al suelo con el HC-SR04.  
2. Detecta bache cuando la distancia supera `distancia_normal + umbral_bache`.  
3. Calcula la profundidad como `distancia - distancia_normal`.  
4. Envía por Bluetooth (o Serial USB) el mensaje `BACHE <profundidad>`.  
5. Repite cada 200 ms.

## 5. Código Arduino (versión sin LEDs)
```cpp
#define TRIG 9
#define ECHO 10

long duracion;
float distancia;
float distancia_normal = 5.0;
float umbral_bache = 3.0;

#include <SoftwareSerial.h>
SoftwareSerial BT(2, 3);

void setup() {
  Serial.begin(9600);
  BT.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

float medirDistancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  duracion = pulseIn(ECHO, HIGH);
  distancia = (duracion * 0.0343) / 2;
  return distancia;
}

void loop() {
  float d = medirDistancia();

  Serial.print("Distancia: ");
  Serial.println(d);

  if (d > distancia_normal + umbral_bache) {
    float profundidad = d - distancia_normal;

    BT.print("BACHE ");
    BT.println(profundidad);

    Serial.print("BACHE ");
    Serial.println(profundidad);
  }

  delay(200);
}
```

## 6. Flujo del MVP demostrado
- Detección física real del bache.
- Envío inalámbrico por Bluetooth.
- Recepción y registro automático en base de datos.
- Clasificación por gravedad según profundidad.
- Visualización/análisis posterior en dashboard o web.

## 7. Escalabilidad
El flujo se puede replicar en vehículos municipales (basureros, patrullas, etc.) con sensores montados para generar un mapa de baches en tiempo real.

## 8. Ideas para mostrar el MVP
- **Recorrido guiado con laptop visible:** conecta el receptor Bluetooth al laptop y abre un visor de consola para que se lean en tiempo real los mensajes `BACHE <profundidad>` mientras el auto cruza la caja con hoyos.
- **Profundidad coloreada:** muestra en la consola (o app sencilla) el nivel de gravedad con colores/etiquetas (ej. verde <2 cm, amarillo 2‑4 cm, rojo >4 cm) para que el público entienda la clasificación.
- **Mini dashboard local:** levanta un script en el laptop que grafique las detecciones en una lista o timeline (p. ej. con Python y `matplotlib`/`dash`) para que se vea el historial de baches.
- **Comparativa con y sin bache:** marca un tramo “liso” y un tramo con hoyos; al pasar por ambos, muestra cómo sólo en el tramo dañado se generan lecturas de bache.
- **Mapa rápido:** usa un cuadriculado impreso (calles) y simula posiciones del auto; cada bache detectado se pinta en la cuadrícula para ilustrar cómo se vería un mapa municipal.

## 9. Panel web (Next.js + Tailwind)
Se incluye una página en `app/page.tsx` construida con Next.js 14 y Tailwind CSS para visualizar las detecciones reales que envía el Arduino.

### Cómo ejecutar
1. Instala dependencias: `npm install`.
2. Arranca el servidor de desarrollo: `npm run dev`.
3. Abre `http://localhost:3000` y deja visible el panel durante la demo.

### Qué muestra
- Tarjetas con totales, promedio de profundidad y el máximo registrado.
- Tabla con las lecturas parseadas directamente de líneas `BACHE <profundidad>`.
- Estado de conexión (puerto, baudrate y parser usado) alineado con el puente Node/Serial.
- Umbrales usados en el sketch para clasificar severidad.
- Log crudo tal cual sale del monitor serie, para confirmar que lo que imprime el Arduino aparece en el panel.
- Checklist de demo con los pasos reales para que el público vea la lectura en vivo.

Para conectar datos reales, reemplaza el arreglo `detections` en `app/page.tsx` pegando las líneas que entrega tu puente Node/Serial, o modifica la página para leer de un endpoint local que exponga los objetos JSON `{ id, depth, severity, timestamp, location, raw, source }`.

## 10. Qué hacer con el Arduino y cómo usar el panel

### A. Cargar y probar el Arduino
1) Conecta el HC-SR04 y el HC-05 como se indica en la sección 3.
2) Abre el IDE de Arduino, pega el sketch de la sección 5 y súbelo a la placa.
3) Conecta el Arduino por USB, abre el monitor serie a **9600 baudios** y revisa que ves líneas como `Distancia: 5.1` y, cuando hay bache, `BACHE <profundidad>`.
4) Ajusta `distancia_normal` y `umbral_bache` si tu superficie de prueba es más alta/baja.

### B. Preparar el Bluetooth
1) Enciende el HC-05, empareja con tu laptop y anota el puerto/COM asignado (ej. `/dev/rfcomm0` o `COM7`).
2) Si no usas Bluetooth, puedes leer por USB Serial sin cambios.

### C. Conectar con el panel web
1) Arranca el panel (`npm run dev`) y déjalo abierto en el navegador.
2) Crea un puente rápido para leer el puerto serie y generar un JSON consumible por el panel. Ejemplo con Node:
   ```bash
   npm install serialport
   cat > serial-bridge.js <<'EOF'
   import { SerialPort, ReadlineParser } from "serialport";

   const port = new SerialPort({ path: process.env.SERIAL_PORT || "/dev/rfcomm0", baudRate: 9600 });
   const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

   parser.on("data", (line) => {
     // Espera líneas tipo "BACHE 3.4"
     if (line.startsWith("BACHE")) {
       const depth = Number(line.split(" ")[1]);
       console.log(JSON.stringify({ id: Date.now(), depth, severity: depth > 3.5 ? "Alta" : depth > 2 ? "Media" : "Baja", timestamp: new Date().toISOString() }));
     }
   });
   EOF
   node serial-bridge.js
   ```
3) Copia los JSON que imprime el puente y pégalos en el array `detections` de `app/page.tsx`, o modifica esa página para consumir un endpoint/local file según tu preferencia.
4) Cada vez que añadas una lectura, recarga el panel para verla reflejada. Para un flujo continuo, puedes exponer un endpoint en `app/api` que entregue el arreglo actualizado y en el panel cambiar el arreglo estático por una llamada `fetch` en un componente cliente.

Con estos pasos tienes el circuito completo: el Arduino detecta y envía, el puente lee y normaliza, y el panel Next.js muestra los datos durante la demo.
