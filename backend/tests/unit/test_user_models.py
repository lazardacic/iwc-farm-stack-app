import pytest

from pydantic import ValidationError

from models.user import UserInDB, UserRegister, UserResponse
from security import hash_password, verify_password


def test_user_register_valid():
    user = UserRegister(
        email="user@example.com",
        password="secret123",
    )

    assert user.email == "user@example.com"
    assert user.password == "secret123"


def test_user_register_default_role_is_user():
    user = UserResponse(
        id="123",
        email="user@example.com",
    )

    assert user.role == "user"


def test_user_register_invalid_email():
    with pytest.raises(ValidationError):
        UserRegister(
            email="not-an-email",
            password="secret123",
        )


def test_user_register_missing_email():
    with pytest.raises(ValidationError):
        UserRegister(
            password="secret123",
        )


def test_user_register_missing_password():
    with pytest.raises(ValidationError):
        UserRegister(
            email="user@example.com",
        )


def test_user_register_password_min_length():
    with pytest.raises(ValidationError):
        UserRegister(
            email="user@example.com",
            password="short",
        )


def test_user_response_valid():
    user = UserResponse(
        id="123",
        email="user@example.com",
        role="user",
    )

    assert user.id == "123"
    assert user.email == "user@example.com"
    assert user.role == "user"


def test_user_in_db_requires_password_hash():
    with pytest.raises(ValidationError):
        UserInDB(
            id="123",
            email="user@example.com",
            role="user",
        )


def test_password_hash_is_not_plaintext():
    password = "secret123"
    hashed = hash_password(password)

    assert hashed != password
    assert hashed.startswith("$argon2")


def test_password_verification_success_and_failure():
    password = "secret123"
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False
