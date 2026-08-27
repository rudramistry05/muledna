import socketio

# Create the Socket.IO AsyncServer
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@sio.event
async def connect(sid, environ):
    print(f"[MuleDNA Socket.IO] Terminal client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[MuleDNA Socket.IO] Terminal client disconnected: {sid}")

class SocketManager:
    """
    Unified manager class for emitting real-time telemetry updates 
    to React dashboards and active investigator terminals.
    """
    @staticmethod
    async def emit_new_transaction(data: dict):
        print(f"[MuleDNA Socket.IO] Broadcasting new_transaction event")
        await sio.emit('new_transaction', data)

    @staticmethod
    async def emit_dashboard_update(data: dict):
        print(f"[MuleDNA Socket.IO] Broadcasting dashboard_update event")
        await sio.emit('dashboard_update', data)

    @staticmethod
    async def emit_fraud_ring_update(data: dict):
        print(f"[MuleDNA Socket.IO] Broadcasting fraud_ring_update event")
        await sio.emit('fraud_ring_update', data)

    @staticmethod
    async def emit_browser_notification(data: dict):
        print(f"[MuleDNA Socket.IO] Broadcasting browser_notification event: {data.get('message')}")
        await sio.emit('browser_notification', data)

    @staticmethod
    async def emit_alert_update(data: dict):
        print(f"[MuleDNA Socket.IO] Broadcasting alert_update event")
        await sio.emit('alert_update', data)
