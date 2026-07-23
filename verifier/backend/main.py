from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel

# --- CONFIGURATION (STRICTLY VERIFIER ONLY) ---
# Talks ONLY to the Verifier ACA-Py Agent
ACAPY_ADMIN_URL = "http://127.0.0.1:8030"

# Credential Definition ID (Used to ensure the proof comes from the BRACU Registrar)
STUDENT_SCHEMA_ID = "GEX6Tv3ywc7HzWukCyveY5:2:student_id_credential:1.6948"
STUDENT_CRED_DEF_ID = "GEX6Tv3ywc7HzWukCyveY5:3:CL:3225236:brac_tag_6948"
# --- PYDANTIC REQUEST MODELS ---
class VerifyRequest(BaseModel):
    connection_id: str

# --- APPLICATION SETUP ---
app = FastAPI(
    title="BRACU Verifier Backend (Campus Services)",
    description="Handles Zero-Knowledge Proof requests and access control.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTES ---

@app.get("/")
def health_check():
    """Basic health check endpoint to confirm Verifier backend availability."""
    return {
        "status": "active",
        "role": "Verifier (Campus Services & Lab)",
        "acapy_url": ACAPY_ADMIN_URL,
        "zero_trust_mode": "Enabled (No Database)"
    }

@app.post("/protocol2/connect-verifier")
async def connect_verifier():
    """Generates a QR code invitation for the login/verification step."""
    print("📡 Generating Verifier Connection Invitation...")
    async with httpx.AsyncClient() as client:
        try:
            body = {
                "alias": "BRACU Student",
                "my_label": "BRAC University Services" # The phone will see this name!
            }
            response = await client.post(
                f"{ACAPY_ADMIN_URL}/connections/create-invitation", 
                json=body
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Agent Error: {response.text}")
                
            data = response.json()
            
            return {
                "status": "success",
                "connection_id": data["connection_id"],
                "invitation_url": data["invitation_url"],
                "message": "Scan this with BC Wallet to Log In"
            }
        except Exception as e:
            print(f"❌ Connection Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/protocol2/check-connection/{connection_id}")
async def check_verifier_connection(connection_id: str):
    """Allows the frontend to auto-detect when the user scans the login QR code."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ACAPY_ADMIN_URL}/connections/{connection_id}")
            state = response.json().get("state", "init")
            is_connected = state in ["active", "response"]
            return {"state": state, "connected": is_connected}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/protocol2/request-proof")
async def request_proof(req: VerifyRequest):
    """Requests proof of the BRACU Student ID credential."""
    print(f"\n--- 🕵️ PROTOCOL 2: REQUESTING PROOF FROM {req.connection_id} ---")

    # 1. Request the exact attributes from the Student ID schema
    # The 'restrictions' block ensures they can't submit a fake credential from a different issuer.
    requested_attributes = {
        "0_student_name_uuid": {"name": "student_name", "restrictions": [{"cred_def_id": STUDENT_CRED_DEF_ID}]},
        "1_student_id_uuid": {"name": "student_id", "restrictions": [{"cred_def_id": STUDENT_CRED_DEF_ID}]},
        "2_department_uuid": {"name": "department", "restrictions": [{"cred_def_id": STUDENT_CRED_DEF_ID}]},
        "3_email_uuid": {"name": "email", "restrictions": [{"cred_def_id": STUDENT_CRED_DEF_ID}]}
    }

    # 2. Construct Proof Request
    proof_request = {
        "name": "BRACU SSO & Lab Access",
        "version": "1.0",
        "requested_attributes": requested_attributes,
        "requested_predicates": {}
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{ACAPY_ADMIN_URL}/present-proof-2.0/send-request",
                json={
                    "connection_id": req.connection_id,
                    "presentation_request": {"indy": proof_request}
                }
            )
            
            if res.status_code != 200:
                print(f"❌ ACA-Py Error: {res.text}")
                raise HTTPException(status_code=500, detail="Failed to send proof request")

            pres_ex_id = res.json()["pres_ex_id"]
            print(f"✅ Proof Request Sent! Exchange ID: {pres_ex_id}")
            
            return {
                "status": "sent",
                "presentation_exchange_id": pres_ex_id,
                "message": "Verification request sent to phone."
            }
        except Exception as e:
            print(f"❌ PROOF REQUEST FAILED: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/protocol2/check-proof/{pres_ex_id}")
async def check_proof(pres_ex_id: str):
    """Polls the proof status and extracts verified attributes if successful."""
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{ACAPY_ADMIN_URL}/present-proof-2.0/records/{pres_ex_id}")
            if res.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch proof record")
            
            data = res.json()
            state = data.get("state")
            
            # If the proof is fully cryptographically verified
            if state == "done":
                # Deep extraction of the revealed attributes from ACA-Py's JSON structure
                revealed_attrs = (
                    data.get("by_format", {})
                    .get("pres", {})
                    .get("indy", {})
                    .get("requested_proof", {})
                    .get("revealed_attrs", {})
                )
                
                # Extract the raw values
                department = revealed_attrs.get("2_department_uuid", {}).get("raw", "Unknown")
                student_id = revealed_attrs.get("1_student_id_uuid", {}).get("raw", "Unknown")
                
                # Check Lab authorization rule (RBAC) directly based on the proof
                is_cse_authorized = "CSE" in department.upper() or "COMPUTER SCIENCE" in department.upper()

                user_data = {
                    "student_name": revealed_attrs.get("0_student_name_uuid", {}).get("raw", "Unknown"),
                    "student_id": student_id,
                    "department": department,
                    "email": revealed_attrs.get("3_email_uuid", {}).get("raw", "Unknown"),
                    "lab_authorized": is_cse_authorized
                }
                
                print(f"✅ Proof Verified for {student_id}! Lab Access: {'GRANTED' if is_cse_authorized else 'DENIED'}")
                return {"state": state, "verified": True, "user_data": user_data}
                
            return {"state": state, "verified": False}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))