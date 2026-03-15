#!/usr/bin/env python3
"""
Simple test script to verify the example tutorial server endpoints
Run this to test the server without needing Blender
"""

import requests
import json
import sys

# Server configuration
BASE_URL = "http://localhost:8080"


def test_endpoint(method, endpoint, data=None, description=""):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Method: {method}")
    print(f"URL: {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            print(f"❌ Unknown method: {method}")
            return False
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code in [200, 201]:
            try:
                json_data = response.json()
                print(f"Response: {json.dumps(json_data, indent=2)}")
                print("✅ Test passed")
                return True
            except (json.JSONDecodeError, ValueError):
                print(f"Response: {response.text}")
                print("✅ Test passed (non-JSON response)")
                return True
        else:
            print(f"❌ Test failed: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - Is the server running?")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def run_tests():
    """Run all endpoint tests"""
    print("="*60)
    print("Tutorial Server Test Suite")
    print("="*60)
    print(f"Testing server at: {BASE_URL}")
    
    tests = [
        ("GET", "/status", None, "Server status check"),
        ("GET", "/current_step", None, "Get current tutorial step"),
        ("GET", "/progress", None, "Get tutorial progress"),
        ("GET", "/next_step", None, "Move to next step"),
        ("GET", "/current_step", None, "Verify step changed"),
        ("POST", "/event", {
            "type": "test_event",
            "data": "test_data",
            "timestamp": 0
        }, "Send test event"),
        ("POST", "/mark_complete", {
            "step_id": 2,
            "completed": True
        }, "Mark step 2 complete"),
        ("GET", "/progress", None, "Check progress after completion"),
        ("GET", "/previous_step", None, "Move to previous step"),
    ]
    
    passed = 0
    failed = 0
    
    for method, endpoint, data, description in tests:
        result = test_endpoint(method, endpoint, data, description)
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n{'='*60}")
    print("Test Results")
    print(f"{'='*60}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Total: {passed + failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return 1


if __name__ == '__main__':
    # Check if requests is available
    try:
        import requests
    except ImportError:
        print("Error: 'requests' module not found")
        print("Install it with: pip install requests")
        sys.exit(1)
    
    # Run tests
    exit_code = run_tests()
    sys.exit(exit_code)
