import pytest
import json
from httpx import AsyncClient
from data.value import register_input_data, login_input_data
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pytest_asyncio
from config.env_handler import API_URL, FRONTEND_URL


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(base_url=API_URL) as client:
        yield client


@pytest.mark.asyncio
async def test_register(client):
    print("Testing register route with data:", register_input_data)
    response = await client.post("/auth/register", json=register_input_data)
    assert response.status_code == 200
    data = response.json()
    print("Response:", data)
    assert (
        data["user"]["email"] == register_input_data["email"]
        and data["user"]["username"] == register_input_data["username"]
    )
    assert "session_token" in data
    global otp_code_register_test
    otp_code_register_test = data["user"]["otp_code"]


@pytest.mark.asyncio
async def test_register_user_already_exists(client):
    response = await client.post("/auth/register", json=register_input_data)
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Email already exists"


@pytest.mark.asyncio
async def test_login_user_not_verified(client):
    print(
        "Testing login route with data:",
        login_input_data,
        "otp_code_register_test:",
        otp_code_register_test,
    )
    response = await client.post("/auth/login", json=login_input_data)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_user_verified(client):
    print(
        "Testing verify otp route with data:",
        login_input_data,
        "otp_code_register_test:",
        otp_code_register_test,
    )
    verify_otp_response = await client.get(
        f"/auth/user/verify-otp?email={register_input_data['email']}&otp_code={otp_code_register_test}"
    )
    assert verify_otp_response.status_code == 200
    data = verify_otp_response.json()
    assert (
        data["message"]
        == f"OTP verified successfully, you can now login at {FRONTEND_URL}/auth/login"
    )

    login_response = await client.post("/auth/login", json=login_input_data)
    assert login_response.status_code == 200
    data = login_response.json()
    assert "session_token" in data
    assert (
        data["user"]["email"] == register_input_data["email"]
        and data["user"]["username"] == register_input_data["username"]
    )


@pytest.mark.asyncio
async def test_logout(client):
    login_response = await client.post("/auth/login", json=login_input_data)
    assert login_response.status_code == 200
    data = login_response.json()
    session_token = data["session_token"]
    print("Testing logout route with session_token:", session_token)
    logout_response = await client.post(
        "/auth/logout", json={"session_token": session_token}
    )
    assert logout_response.status_code == 200
