from fastapi import WebSocket
from typing import Dict, List
import json
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, rfq_id: str):
        await websocket.accept()
        if rfq_id not in self.active_connections:
            self.active_connections[rfq_id] = []
        self.active_connections[rfq_id].append(websocket)

    def disconnect(self, websocket: WebSocket, rfq_id: str):
        if rfq_id in self.active_connections:
            if websocket in self.active_connections[rfq_id]:
                self.active_connections[rfq_id].remove(websocket)
            if not self.active_connections[rfq_id]:
                del self.active_connections[rfq_id]

    async def broadcast(self, rfq_id: str, message: dict):
        if rfq_id in self.active_connections:
            for connection in self.active_connections[rfq_id]:
                try:
                    await connection.send_text(json.dumps(message, default=str)) #json.dumps converts python dict to json string 
                except Exception:
                    pass

manager = ConnectionManager()
