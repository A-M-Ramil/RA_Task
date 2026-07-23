"""
Messaging router — 1:1 secure messaging bonus feature.

Attach this to your VERIFIER backend (the one that already owns login,
dashboard, and protected pages). It reuses that same ACA-Py agent —
it just opens a second, separate connection per person (student or
faculty), distinct from whatever connection was used for login/proof.

Usage in your main app:

    from messaging_router import router as messaging_router
    app.include_router(messaging_router)

ACA-Py must be started with a webhook URL pointing at this router, e.g.:

    --webhook-url http://127.0.0.1:8000/messaging

ACA-Py appends /topic/<topic>/ itself, so the resulting calls land on
POST /messaging/topic/<topic>/ — which is exactly the route defined below.

Remember to app.include_router(router) in your main app AFTER importing
this module — the routes only exist on the FastAPI app once that call runs.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import sqlite3

router = APIRouter(prefix="/messaging", tags=["messaging"])

# Point this at whichever agent should own these connections.
# Recommended: the same ACA-Py admin URL your verifier backend already uses.
ACAPY_ADMIN_URL = "http://127.0.0.1:8030"

db_conn = sqlite3.connect("messaging.db", check_same_thread=False)
# cursor = db_conn.cursor()

# cursor.execute('''
#     CREATE TABLE IF NOT EXISTS messaging_connections (
#         connection_id TEXT PRIMARY KEY,
#         role TEXT NOT NULL,          -- 'student' or 'faculty'
#         owner_id TEXT NOT NULL,      -- student_id, faculty email, etc.
#         label TEXT,
#         invitation_url TEXT,
#         created_at TEXT DEFAULT CURRENT_TIMESTAMP
#     )
# ''')
# cursor.execute('''
#     CREATE TABLE IF NOT EXISTS chat_messages (
#         id INTEGER PRIMARY KEY AUTOINCREMENT,
#         connection_id TEXT,
#         direction TEXT,               -- 'in' (arrived from a wallet) or 'out' (sent by backend)
#         content TEXT,
#         created_at TEXT DEFAULT CURRENT_TIMESTAMP
#     )
# ''')
# db_conn.commit()


class CreateInviteRequest(BaseModel):
    role: str            # 'student' or 'faculty'
    owner_id: str
    label: Optional[str] = None


class SendMessageRequest(BaseModel):
    connection_id: str
    content: str


@router.post("/create-invitation")
async def create_messaging_invitation(req: CreateInviteRequest):
    """Creates a connection dedicated purely to messaging — separate from
    the login/proof connection. Call once for the student, once for the
    faculty member."""
    cursor = db_conn.cursor()
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{ACAPY_ADMIN_URL}/connections/create-invitation",
            params={"auto_accept": "true"},
            json={"alias": req.label or f"messaging-{req.role}-{req.owner_id}"},
        )
        res.raise_for_status()
        data = res.json()

    cursor.execute(
        """INSERT OR REPLACE INTO messaging_connections
           (connection_id, role, owner_id, label, invitation_url)
           VALUES (?, ?, ?, ?, ?)""",
        (data["connection_id"], req.role, req.owner_id, req.label, data["invitation_url"]),
    )
    db_conn.commit()

    return {"connection_id": data["connection_id"], "invitation_url": data["invitation_url"]}


@router.get("/my-connection")
async def get_my_connection(role: str, owner_id: str):
    cursor = db_conn.cursor()
    """Lets the frontend resume an existing connection after a page reload
    instead of always generating a fresh QR code."""
    cursor.execute(
        "SELECT connection_id, invitation_url FROM messaging_connections WHERE role = ? AND owner_id = ? ORDER BY rowid DESC LIMIT 1",
        (role, owner_id),
    )
    row = cursor.fetchone()
    if not row:
        return {"connection_id": None}

    connection_id, invitation_url = row
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{ACAPY_ADMIN_URL}/connections/{connection_id}")
        state = res.json().get("state", "unknown") if res.status_code == 200 else "unknown"

    return {
        "connection_id": connection_id,
        "invitation_url": invitation_url,
        "state": state,
        "connected": state in ("active", "response"),
    }


@router.get("/check-connection/{connection_id}")
async def check_messaging_connection(connection_id: str):
    
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{ACAPY_ADMIN_URL}/connections/{connection_id}")
        if res.status_code == 404:
            raise HTTPException(status_code=404, detail="Connection not found")
        res.raise_for_status()
        state = res.json().get("state", "unknown")
    return {"connection_id": connection_id, "state": state, "connected": state in ("active", "response")}


@router.post("/send")
async def send_message(req: SendMessageRequest):
    cursor = db_conn.cursor()
    """Optional: lets the web page send a message too, in case someone
    prefers typing on the portal instead of inside BC Wallet."""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{ACAPY_ADMIN_URL}/connections/{req.connection_id}/send-message",
            json={"content": req.content},
        )
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail=f"ACA-Py error: {res.text}")

    cursor.execute(
        "INSERT INTO chat_messages (connection_id, direction, content) VALUES (?, 'out', ?)",
        (req.connection_id, req.content),
    )
    db_conn.commit()
    return {"status": "sent"}


@router.get("/history/{connection_id}")
def get_history(connection_id: str):
    cursor = db_conn.cursor()
    cursor.execute(
        "SELECT direction, content, created_at FROM chat_messages WHERE connection_id = ? ORDER BY id ASC",
        (connection_id,),
    )
    return {"messages": [{"direction": d, "content": c, "at": t} for d, c, t in cursor.fetchall()]}


def _paired_connection_id(connection_id: str):
    cursor = db_conn.cursor()
    """Given one side's connection_id, find the other party's connection_id.
    Simple demo logic (one active student <-> one active faculty). Swap in
    a real `conversations` table if you need multiple concurrent chats."""
    cursor.execute("SELECT role FROM messaging_connections WHERE connection_id = ?", (connection_id,))
    row = cursor.fetchone()
    if not row:
        return None
    other_role = "faculty" if row[0] == "student" else "student"
    cursor.execute(
        "SELECT connection_id FROM messaging_connections WHERE role = ? ORDER BY rowid DESC LIMIT 1",
        (other_role,),
    )
    other = cursor.fetchone()
    return other[0] if other else None


@router.post("/topic/{topic}/")
async def messaging_webhook(topic: str, payload: dict):
    cursor = db_conn.cursor()
    """ACA-Py posts every event here (connections, present_proof, etc.) —
    only 'basicmessages' is handled; everything else is ignored, so this
    is safe to use as your only --webhook-url even if you add more
    webhook-driven features later."""
    if topic == "basicmessages":
        connection_id = payload.get("connection_id")
        content = payload.get("content")

        cursor.execute(
            "INSERT INTO chat_messages (connection_id, direction, content) VALUES (?, 'in', ?)",
            (connection_id, content),
        )
        db_conn.commit()

        other_id = _paired_connection_id(connection_id)
        if other_id:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{ACAPY_ADMIN_URL}/connections/{other_id}/send-message",
                    json={"content": content},
                )
            cursor.execute(
                "INSERT INTO chat_messages (connection_id, direction, content) VALUES (?, 'out', ?)",
                (other_id, content),
            )
            db_conn.commit()

    return {"status": "ok"}


@router.delete("/connection/{connection_id}")
async def end_messaging_connection(connection_id: str):
    """Terminates a messaging connection: removes it from the agent's
    wallet and clears local records, so the next visit shows a fresh QR
    instead of resuming the old thread."""
    cursor = db_conn.cursor()

    async with httpx.AsyncClient() as client:
        res = await client.delete(f"{ACAPY_ADMIN_URL}/connections/{connection_id}")
        # 404 just means ACA-Py already has no record of it — treat as success.
        if res.status_code not in (200, 404):
            raise HTTPException(status_code=500, detail=f"ACA-Py error: {res.text}")

    cursor.execute("DELETE FROM messaging_connections WHERE connection_id = ?", (connection_id,))
    cursor.execute("DELETE FROM chat_messages WHERE connection_id = ?", (connection_id,))
    db_conn.commit()
    return {"status": "disconnected"}