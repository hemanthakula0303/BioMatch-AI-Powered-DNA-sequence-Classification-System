import sys
import os
import json
import asyncio
sys.path.append(os.path.abspath("backend"))

from fastapi.testclient import TestClient
from main import app

def run():
    client = TestClient(app)
    # Test 1: root
    print("GET /")
    print(client.get("/").json())
    
    # Test 2: validation error
    print("POST /classify with invalid seq")
    print(client.post("/classify", json={"sequence": "ABCDE", "label": "test"}).json())

    # Test 3: valid classification
    print("POST /classify with valid seq")
    res = client.post("/classify", json={"sequence": "ATGCATGCATGC", "label": "test"})
    print(res.status_code)
    try:
        print(json.dumps(res.json(), indent=2))
    except Exception as e:
        print("Error parsing json:", res.text)

if __name__ == "__main__":
    run()
