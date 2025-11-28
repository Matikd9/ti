const { SerialPort, ReadlineParser } = require("serialport");

const port = new SerialPort({ path: "/dev/rfcomm0", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

parser.on("data", async (line) => {
  const value = Number(line.replace("BACHE", "").trim());
  if (!Number.isFinite(value)) return;

  await fetch("https://detectarbaches.netlify.app/api/detections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ depth: value, location: "Ruta demo", source: "HC-05", raw: line.trim() })
  });
});