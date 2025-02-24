const express = require("express");
const compression = require("compression");
const { getLlmResponse } = require("./lmai");

const app = express();
const LMAI_PORT = process.env.LMAI_PORT || 5000;

app.use(compression()); // ✅ Habilita flush() en streams
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: "Falta el parámetro 'messages'" });
  }

  try {
    console.log("🔄 Recibiendo solicitud de chat:", messages);
    await getLlmResponse(messages, res);
  } catch (error) {
    console.error("❌ Error en la respuesta del modelo:", error);
    res.status(500).json({ error: "Error en la respuesta del modelo" });
  }
});

app.listen(LMAI_PORT, () => {
  console.log(`🚀 LMAI Server corriendo en http://localhost:${LMAI_PORT}`);
});
