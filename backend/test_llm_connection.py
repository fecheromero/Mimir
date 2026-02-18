#!/usr/bin/env python
"""
Quick script to test LLM connection.
Run this to verify your API keys and LLM setup before deploying.

Usage:
    python test_llm_connection.py
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_anthropic():
    """Test Anthropic API connection."""
    print("🧪 Testing Anthropic API...")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY not found in environment")
        return False

    print(f"✅ API key found: {api_key[:15]}...")

    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)

        print("📡 Sending test request to Claude...")
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=50,
            messages=[
                {"role": "user", "content": "Say 'Hello, I am working!' and nothing else."}
            ]
        )

        result = response.content[0].text
        print(f"✅ Response received: {result}")
        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_openai():
    """Test OpenAI API connection."""
    print("🧪 Testing OpenAI API...")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False

    print(f"✅ API key found: {api_key[:15]}...")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        print(f"📡 Sending test request to OpenAI ({model})...")

        response = client.chat.completions.create(
            model=model,
            max_tokens=50,
            messages=[
                {"role": "user", "content": "Say 'Hello, I am working!' and nothing else."}
            ]
        )

        result = response.choices[0].message.content
        print(f"✅ Response received: {result}")
        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_redis():
    """Test Redis connection."""
    print("🧪 Testing Redis connection...")

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    print(f"📍 Redis URL: {redis_url}")

    try:
        import redis
        client = redis.from_url(redis_url)

        print("📡 Pinging Redis...")
        result = client.ping()

        if result:
            print("✅ Redis connection successful")
            return True
        else:
            print("❌ Redis ping failed")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def main():
    """Run all connection tests."""
    print("\n" + "="*60)
    print("🔍 Mimir LLM & Redis Connection Tester")
    print("="*60 + "\n")

    # Check LLM provider
    provider = os.getenv("LLM_PROVIDER", "anthropic")
    print(f"📌 LLM_PROVIDER: {provider}\n")

    results = {}

    # Test LLM based on provider
    if provider == "anthropic":
        results["anthropic"] = test_anthropic()
    elif provider == "openai":
        results["openai"] = test_openai()
    else:
        print(f"❌ Unknown LLM_PROVIDER: {provider}")
        results["llm"] = False

    print()

    # Test Redis
    results["redis"] = test_redis()

    # Summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)

    for service, status in results.items():
        icon = "✅" if status else "❌"
        print(f"{icon} {service.upper()}: {'PASS' if status else 'FAIL'}")

    all_passed = all(results.values())

    print("\n" + "="*60)
    if all_passed:
        print("✨ All tests passed! You're ready to deploy.")
    else:
        print("⚠️  Some tests failed. Fix the issues before deploying.")
        print("\nTroubleshooting:")
        print("  1. Check your .env file has the correct API keys")
        print("  2. Verify LLM_PROVIDER is set to 'anthropic' or 'openai'")
        print("  3. Ensure Redis is running (docker run -d -p 6379:6379 redis)")
        print("  4. Check API key permissions and billing status")
    print("="*60 + "\n")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
