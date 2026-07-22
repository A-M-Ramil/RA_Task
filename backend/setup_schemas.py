import asyncio
import time
import httpx

# The Admin URL of your local ACA-Py instance (University Agent)
ACAPY_ADMIN_URL = "http://127.0.0.1:8020"


async def create_schema_and_cred_def(
    client: httpx.AsyncClient, schema_name: str, attributes: list[str]
):
  try:
    # Dynamic versioning & tagging prevents duplicate ledger registration errors
    unique_version = f"1.{int(time.time()) % 10000}"
    unique_tag = f"brac_tag_{int(time.time()) % 10000}"

    # 1. Publish Schema to BCovrin Ledger
    print(f"\n[1/2] Publishing Schema: {schema_name} (v{unique_version})...")
    schema_res = await client.post(
        f"{ACAPY_ADMIN_URL}/schemas",
        json={
            "schema_name": schema_name,
            "schema_version": unique_version,
            "attributes": attributes,
        },
        timeout=30.0,
    )
    schema_res.raise_for_status()
    schema_id = schema_res.json()["schema_id"]
    print(f"   ✅ Schema ID: {schema_id}")

    # Non-blocking pause to allow ledger write confirmation
    print("   ⏳ Waiting for Ledger synchronization (3 seconds)...")
    await asyncio.sleep(3)

    # 2. Publish Credential Definition to BCovrin Ledger
    print("[2/2] Publishing Credential Definition...")
    cred_def_res = await client.post(
        f"{ACAPY_ADMIN_URL}/credential-definitions",
        json={
            "schema_id": schema_id,
            "tag": unique_tag,
            "support_revocation": False,
        },
        timeout=30.0,
    )
    cred_def_res.raise_for_status()
    cred_def_id = cred_def_res.json()["credential_definition_id"]
    print(f"   ✅ Cred Def ID: {cred_def_id}")

    return schema_id, cred_def_id

  except Exception as e:
    print(f"❌ Error creating {schema_name}: {e}")
    return None, None


async def main():
  print("🚀 INITIALIZING UNIVERSITY STUDENT ID SCHEMA ON BCOVRIN...")

  async with httpx.AsyncClient() as client:
    # Verify agent connectivity
    try:
      health = await client.get(f"{ACAPY_ADMIN_URL}/status")
      health.raise_for_status()
    except Exception:
      print("❌ Could not connect to ACA-Py Agent at http://127.0.0.1:8020")
      print("Ensure your Docker container is running and port 8020 is exposed.")
      return

    # Create Student ID Schema
    student_s, student_c = await create_schema_and_cred_def(
        client=client,
        schema_name="student_id_credential",
        attributes=["student_name", "student_id", "department", "email"],
    )

    if student_s and student_c:
      print("\n\n🎉 SUCCESS! COPY THESE KEYS INTO YOUR MAIN.PY CONFIG:")
      print("=" * 60)
      print(f'STUDENT_SCHEMA_ID = "{student_s}"')
      print(f'STUDENT_CRED_DEF_ID = "{student_c}"')
      print("=" * 60)


if __name__ == "__main__":
  asyncio.run(main())