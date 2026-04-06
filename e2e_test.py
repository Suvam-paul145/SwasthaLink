"""End-to-end test for patient ID + prescription linking flow."""
import requests
import json
import sys

BASE = "http://localhost:8000"

def log(msg):
    print(msg, flush=True)

def main():
    # 1. Login as doctor
    doc = requests.post(f"{BASE}/api/auth/login", json={
        "email": "doctor@swasthalink.demo",
        "password": "Doctor@123",
        "role": "doctor",
    }).json()
    doc_token = doc["access_token"]
    doc_id = doc["user"]["id"]
    log(f"[1] Doctor logged in: {doc_id}")

    # 2. Login as patient
    pat = requests.post(f"{BASE}/api/auth/login", json={
        "email": "patient@swasthalink.demo",
        "password": "Patient@123",
        "role": "patient",
    }).json()
    pat_token = pat["access_token"]
    pat_id = pat["user"]["id"]
    log(f"[2] Patient logged in: {pat_id}")

    # 3. Login as admin
    adm = requests.post(f"{BASE}/api/auth/login", json={
        "email": "admin@swasthalink.demo",
        "password": "Admin@123",
        "role": "admin",
    }).json()
    adm_token = adm["access_token"]
    adm_id = adm["user"]["id"]
    log(f"[3] Admin logged in: {adm_id}")

    # 4. Upload prescription as doctor with system-generated PID
    test_pid = "PID-TEST01"
    with open(r"C:\Users\suvam\AppData\Local\Temp\test_prescription.jpg", "rb") as f:
        resp = requests.post(
            f"{BASE}/api/prescriptions/extract",
            files={"file": ("prescription.jpg", f, "image/jpeg")},
            data={"doctor_id": doc_id, "patient_id": test_pid, "report_type": "prescription"},
            timeout=120,
        )
    log(f"[4] Upload status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"    ERROR: {resp.text}")
        sys.exit(1)
    upload_result = resp.json()
    rx_id = upload_result["prescription_id"]
    rx_status = upload_result["status"]
    log(f"    Prescription ID: {rx_id}")
    log(f"    Status: {rx_status}")
    log(f"    Patient ID in record: {test_pid}")

    # 5. Check pending prescriptions (should include our upload)
    pending = requests.get(f"{BASE}/api/prescriptions/pending").json()
    log(f"[5] Pending prescriptions: {pending['count']}")
    found = any(item.get("prescription_id") == rx_id for item in pending.get("items", []))
    log(f"    Our prescription in pending: {found}")

    # 6. Admin approves the prescription
    approve_resp = requests.post(
        f"{BASE}/api/prescriptions/{rx_id}/approve",
        json={"admin_id": adm_id},
    )
    log(f"[6] Approve status: {approve_resp.status_code}")
    if approve_resp.status_code == 200:
        print(f"    Approved successfully")
    else:
        print(f"    Approve response: {approve_resp.text}")

    # 7. Fetch prescriptions for PID (should return the approved one)
    rx_for_pid = requests.get(f"{BASE}/api/prescriptions/for-patient/{test_pid}").json()
    log(f"[7] Prescriptions for {test_pid}: {rx_for_pid['count']}")
    if rx_for_pid["count"] > 0:
        print(f"    First prescription status: {rx_for_pid['items'][0].get('status', 'N/A')}")

    # 8. Patient profile before linking (no PID linked yet)
    profile_resp = requests.get(
        f"{BASE}/api/patient/profile",
        headers={"Authorization": f"Bearer {pat_token}"},
    )
    profile = profile_resp.json()
    log(f"[8] Patient profile: linked_pid = {profile.get('linked_pid')}")

    # 9. Patient links the PID
    link_resp = requests.post(
        f"{BASE}/api/patient/link-pid",
        json={"pid": test_pid},
        headers={"Authorization": f"Bearer {pat_token}"},
    )
    log(f"[9] Link PID status: {link_resp.status_code}")
    link_result = link_resp.json()
    log(f"    Result: {link_result}")

    # 10. Patient profile after linking
    profile2 = requests.get(
        f"{BASE}/api/patient/profile",
        headers={"Authorization": f"Bearer {pat_token}"},
    ).json()
    log(f"[10] Patient profile after link: linked_pid = {profile2.get('linked_pid')}")

    # 11. Prescriptions for patient UUID (should be empty â€” prescriptions stored under PID)
    rx_uuid = requests.get(f"{BASE}/api/prescriptions/for-patient/{pat_id}").json()
    log(f"[11] Prescriptions for patient UUID ({pat_id}): {rx_uuid['count']}")

    # 12. Prescriptions for linked PID (should have the approved one)
    rx_pid = requests.get(f"{BASE}/api/prescriptions/for-patient/{test_pid}").json()
    log(f"[12] Prescriptions for linked PID ({test_pid}): {rx_pid['count']}")

    # Summary
    log("\n--- SUMMARY ---")
    log(f"Patient UUID (system-generated at signup): {pat_id}")
    log(f"Prescription PID (system-generated at upload): {test_pid}")
    log(f"Prescription uploaded: {'YES' if rx_id else 'NO'}")
    log(f"Prescription approved: {'YES' if rx_for_pid['count'] > 0 else 'NO'}")
    log(f"PID linked to patient: {'YES' if profile2.get('linked_pid') == test_pid else 'NO'}")
    log(f"Patient can see prescriptions via PID: {'YES' if rx_pid['count'] > 0 else 'NO'}")

    all_ok = (
        rx_id is not None
        and rx_for_pid["count"] > 0
        and profile2.get("linked_pid") == test_pid
        and rx_pid["count"] > 0
    )
    log(f"\nAll flows working: {'YES âœ“' if all_ok else 'NO âœ—'}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
