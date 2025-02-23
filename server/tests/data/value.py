import random


def random_string():
    return "".join(random.choices("abcdefghijklmnopqrstuvwxyz", k=10))


def random_email():
    return "".join(random.choices("abcdefghijklmnopqrstuvwxyz", k=5)) + "@example.com"


username = random_string()
email = random_email()
password = random_string()

register_input_data = {
    "username": username,
    "email": email,
    "auth_provider": "email&password",
    "password": password,
}

login_input_data = {
    "email": register_input_data["email"],
    "password": register_input_data["password"],
}
