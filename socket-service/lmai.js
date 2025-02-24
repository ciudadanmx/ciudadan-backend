const axios = require("axios");

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://192.168.1.3:1234/v1/chat/completions";
const MODEL_NAME = process.env.MODEL_NAME || "deepseek-r1-distill-qwen-7b";

async function getLlmResponse(messages, res) {
  try {
    const response = await axios.post(
      LM_STUDIO_URL,
      {
        model: MODEL_NAME,
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true, // ✅ Activar streaming
      },
      { responseType: "stream" }
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let buffer = ""; // ✅ Almacena la respuesta parcial

    response.data.on("data", (chunk) => {
      const data = chunk.toString().trim();
      console.log("📥 Chunk recibido:", data);

      if (data === "[DONE]") {
        console.log("✅ Finalizando streaming...");
        res.write("\n\n");
        res.end(); // ✅ Cerrar correctamente
        return;
      }

      try {
        const parsed = JSON.parse(data.replace(/^data: /, ""));
        const text = parsed.choices?.[0]?.delta?.content || "";

        buffer += text; // ✅ Acumula la respuesta
        res.write(text);
      } catch (error) {
        console.error("❌ Error parseando chunk:", error);
      }
    });

    response.data.on("end", () => {
      console.log("✅ Respuesta final:", buffer);
      res.end();
    });

  } catch (error) {
    console.error("❌ Error al obtener respuesta del LLM:", error?.response?.data || error.message);
    res.status(500).json({ error: "Error en la generación de respuesta." });
  }
}

module.exports = { getLlmResponse };
