import re

def is_valid_email(email: str):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email) is not None

def is_valid_password(password: str):
    return len(password) >= 8 and re.match(r"[a-zA-Z0-9]+", password) is not None