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
Se incluye una página en `app/page.tsx` construida con Next.js 14 y Tailwind CSS para visualizar las detecciones en tiempo real.

### Cómo ejecutar
1. Instala dependencias: `npm install`.
2. Arranca el servidor de desarrollo: `npm run dev`.
3. Abre `http://localhost:3000` y deja visible el panel durante la demo.

### Qué muestra
- Tarjetas con totales, promedio de profundidad y conteo por severidad.
- Tabla con las últimas detecciones (ID, severidad, profundidad y ubicación GPS simulada).
- Tendencia semanal con barras y un mosaico “Mapa rápido” que ayuda a explicar la georreferenciación.
- Checklist de demo para guiar la presentación.

Para conectar datos reales, reemplaza el arreglo `detections` en `app/page.tsx` por la respuesta de tu backend o del puerto Serial/Bluetooth.
