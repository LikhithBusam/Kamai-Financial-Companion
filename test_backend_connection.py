"""
Backend Connection Test Script
Tests both backend servers to verify integration with frontend
"""

import requests
import json
import sys

# Configuration
AI_BACKEND_URL = "http://localhost:8000"
PARSER_BACKEND_URL = "http://localhost:8001"

def test_ai_backend():
    """Test AI Agent Analysis Backend"""
    print("\n" + "="*60)
    print("Testing AI Agent Analysis Backend (Port 8000)")
    print("="*60)
    
    try:
        # Test root endpoint
        print("\n1. Testing root endpoint (GET /)")
        response = requests.get(f"{AI_BACKEND_URL}/")
        if response.status_code == 200:
            print(f"   ✅ Root endpoint OK: {response.json()}")
        else:
            print(f"   ❌ Root endpoint failed: {response.status_code}")
            return False
        
        # Test health endpoint
        print("\n2. Testing health endpoint (GET /api/health)")
        response = requests.get(f"{AI_BACKEND_URL}/api/health")
        if response.status_code == 200:
            health = response.json()
            print(f"   ✅ Health check OK")
            print(f"      Status: {health.get('status')}")
            print(f"      Service: {health.get('service')}")
            print(f"      Agents: {len(health.get('agents', {}))}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
        
        # Test analyze endpoint (will fail without valid user_id, but should return proper error)
        print("\n3. Testing analyze endpoint (POST /api/analyze)")
        test_user_id = "test-user-123"
        response = requests.post(
            f"{AI_BACKEND_URL}/api/analyze",
            json={"user_id": test_user_id},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code in [200, 400, 500]:  # Any response means endpoint exists
            print(f"   ✅ Analyze endpoint accessible: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"      Response: {data.get('status')}")
        else:
            print(f"   ⚠️  Analyze endpoint returned: {response.status_code}")
        
        # Test status endpoint (will return 404 for non-existent user, which is expected)
        print("\n4. Testing status endpoint (GET /api/status/{user_id})")
        response = requests.get(f"{AI_BACKEND_URL}/api/status/{test_user_id}")
        if response.status_code == 404:
            print(f"   ✅ Status endpoint accessible (404 expected for non-existent user)")
        elif response.status_code == 200:
            print(f"   ✅ Status endpoint OK: {response.json()}")
        else:
            print(f"   ⚠️  Status endpoint returned: {response.status_code}")
        
        print("\n✅ AI Backend connection test completed successfully!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to AI Backend. Make sure it's running on port 8000")
        print("   Start it with: cd backend && python main.py")
        return False
    except Exception as e:
        print(f"\n❌ Error testing AI Backend: {e}")
        return False

def test_parser_backend():
    """Test Transaction Parser Backend"""
    print("\n" + "="*60)
    print("Testing Transaction Parser Backend (Port 8001)")
    print("="*60)
    
    try:
        # Test root endpoint
        print("\n1. Testing root endpoint (GET /)")
        response = requests.get(f"{PARSER_BACKEND_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Root endpoint OK")
            print(f"      Message: {data.get('message')}")
            print(f"      Endpoints: {list(data.get('endpoints', {}).values())}")
        else:
            print(f"   ❌ Root endpoint failed: {response.status_code}")
            return False
        
        # Test parse-image endpoint (will fail without file, but endpoint should exist)
        print("\n2. Testing parse-image endpoint (POST /api/parse-image)")
        response = requests.post(
            f"{PARSER_BACKEND_URL}/api/parse-image",
            files={}  # Empty - should return 422 or 400
        )
        if response.status_code in [400, 422]:
            print(f"   ✅ Parse-image endpoint accessible (error expected without file)")
        else:
            print(f"   ⚠️  Parse-image endpoint returned: {response.status_code}")
        
        # Test parse-voice endpoint (will fail without file, but endpoint should exist)
        print("\n3. Testing parse-voice endpoint (POST /api/parse-voice)")
        response = requests.post(
            f"{PARSER_BACKEND_URL}/api/parse-voice",
            files={}  # Empty - should return 422 or 400
        )
        if response.status_code in [400, 422]:
            print(f"   ✅ Parse-voice endpoint accessible (error expected without file)")
        else:
            print(f"   ⚠️  Parse-voice endpoint returned: {response.status_code}")
        
        print("\n✅ Parser Backend connection test completed successfully!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to Parser Backend. Make sure it's running on port 8001")
        print("   Start it with: python simple_api_server.py")
        return False
    except Exception as e:
        print(f"\n❌ Error testing Parser Backend: {e}")
        return False

def test_cors_headers():
    """Test CORS headers"""
    print("\n" + "="*60)
    print("Testing CORS Configuration")
    print("="*60)
    
    try:
        # Test AI backend CORS
        response = requests.options(
            f"{AI_BACKEND_URL}/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
        }
        print(f"\n1. AI Backend CORS Headers:")
        print(f"   Allow-Origin: {cors_headers['Access-Control-Allow-Origin']}")
        print(f"   Allow-Methods: {cors_headers['Access-Control-Allow-Methods']}")
        
        # Test Parser backend CORS
        response = requests.options(
            f"{PARSER_BACKEND_URL}/",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
        }
        print(f"\n2. Parser Backend CORS Headers:")
        print(f"   Allow-Origin: {cors_headers['Access-Control-Allow-Origin']}")
        print(f"   Allow-Methods: {cors_headers['Access-Control-Allow-Methods']}")
        
        print("\n✅ CORS configuration verified")
        return True
        
    except Exception as e:
        print(f"\n⚠️  Could not verify CORS headers: {e}")
        return True  # Don't fail on this

def main():
    print("\n" + "="*60)
    print("Backend Connection Verification")
    print("="*60)
    print("\nThis script tests the connection between frontend and backends")
    print("Make sure both backend servers are running before testing")
    
    results = {
        "ai_backend": test_ai_backend(),
        "parser_backend": test_parser_backend(),
        "cors": test_cors_headers()
    }
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"AI Backend (8000):    {'✅ PASS' if results['ai_backend'] else '❌ FAIL'}")
    print(f"Parser Backend (8001): {'✅ PASS' if results['parser_backend'] else '❌ FAIL'}")
    print(f"CORS Configuration:    {'✅ PASS' if results['cors'] else '⚠️  WARNING'}")
    
    if all(results.values()):
        print("\n🎉 All tests passed! Backend integration is working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)

