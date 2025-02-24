import json
import time
import requests
import threading
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List

app = FastAPI()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

LM_STUDIO_URL = "http://192.168.1.3:1234/v1/chat/completions"
MODEL_NAME = "deepseek-r1-distill-qwen-7b"

@app.post("/chat")
async def get_llm_response(chat_request: ChatRequest):
    # Imprimir los datos recibidos para depuración
    print("🔄 Datos recibidos en la solicitud:")
    print(json.dumps(chat_request.dict(), indent=2))
    
    messages = chat_request.messages
    if not messages:
        raise HTTPException(status_code=400, detail="Falta el parámetro 'messages'")
    
    # Construir el payload y habilitar el streaming
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
        "temperature": 0.7,
        "max_tokens": 2048,  # Aumenta si esperas respuestas largas
        "stream": True       # Habilitamos el streaming en LM Studio
    }
    print("📤 Payload enviado a LM Studio:")
    print(json.dumps(payload, indent=2))
    
    try:
        r = requests.post(LM_STUDIO_URL, json=payload, stream=True, timeout=300)
    except requests.exceptions.RequestException as e:
        print(f"❌ Error en la solicitud a LM Studio: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener respuesta del modelo")
    
    def generate():
        last_token_time = time.time()

        # Función de heartbeat: si no hay tokens en X segundos, se envía un comentario vacío para mantener viva la conexión.
        def heartbeat():
            nonlocal last_token_time
            while True:
                time.sleep(5)  # cada 5 segundos
                if time.time() - last_token_time >= 5:
                    try:
                        yield "data: \n\n"
                    except Exception as ex:
                        print(f"❌ Error enviando heartbeat: {ex}")
                        break

        # Iniciamos un thread para el heartbeat (esto es opcional; también se puede integrar en el mismo loop)
        # En este ejemplo, lo integraremos en el mismo loop para evitar complicaciones.
        
        try:
            for line in r.iter_lines():
                if line:
                    decoded_line = line.decode("utf-8")
                    print("📥 Línea recibida:", decoded_line)
                    if decoded_line.startswith("data: "):
                        content = decoded_line[len("data: "):].strip()
                        # Si recibimos "[DONE]", salimos del loop
                        if content == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        try:
                            parsed = json.loads(content)
                            # Extraemos el token de respuesta
                            token = parsed.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            # Actualizamos el tiempo del último token recibido
                            if token:
                                last_token_time = time.time()
                                # Enviamos en formato SSE (por ejemplo, con el prefijo data:)
                                yield f"data: {token}\n\n"
                        except json.JSONDecodeError as e:
                            print(f"❌ Error decodificando JSON: {e}")
                    # Si no se reciben tokens en un tiempo, enviamos un heartbeat
                    if time.time() - last_token_time >= 5:
                        yield "data: \n\n"
                        last_token_time = time.time()
        except Exception as e:
            print(f"❌ Error en el generador de stream: {e}")
    
    # Devolvemos el stream con el header de SSE para que el cliente no lo interprete como finalizado
    return StreamingResponse(generate(), media_type="text/event-stream")
