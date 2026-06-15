"""
Test script to verify authentication flow.
Run this after starting the server: python test_auth.py
"""
import json
import sys

try:
    import requests
except ImportError:
    print("requests not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

BASE_URL = "http://localhost:8000"

def test_auth():
    session = requests.Session()

    # Test 1: Register a new user
    print("\n=== Test 1: Register new user ===")
    register_data = {
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "Test123456"
    }
    try:
        r = session.post(f"{BASE_URL}/register", json=register_data)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Success! Token received: {data.get('access_token', 'N/A')[:50]}...")
            print(f"User: {data.get('user', {})}")
        elif r.status_code == 409:
            print(f"User already exists (expected if already registered): {r.json()}")
        else:
            print(f"Error: {r.text}")
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {BASE_URL}. Is the server running?")
        return False

    # Test 2: Login with the same credentials
    print("\n=== Test 2: Login with same credentials ===")
    login_data = {
        "email": "test@example.com",
        "password": "Test123456"
    }
    try:
        r = session.post(f"{BASE_URL}/login", json=login_data)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Success! Token received: {data.get('access_token', 'N/A')[:50]}...")
            print(f"User: {data.get('user', {})}")
        else:
            print(f"Error: {r.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {BASE_URL}. Is the server running?")
        return False

    # Test 3: Access protected profile endpoint
    print("\n=== Test 3: Access protected profile endpoint ===")
    if r.status_code == 200:
        token = r.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        r2 = session.get(f"{BASE_URL}/profile", headers=headers)
        print(f"Status: {r2.status_code}")
        if r2.status_code == 200:
            print(f"Profile: {r2.json()}")
        else:
            print(f"Error: {r2.text}")
            return False

    print("\n=== ALL TESTS PASSED ===")
    return True

if __name__ == "__main__":
    success = test_auth()
    sys.exit(0 if success else 1)