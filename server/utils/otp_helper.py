import random
import string

def generate_otp_code():
    return ''.join(random.choices(string.digits, k=6))

def is_otp_code_valid(otp_code: str):
    return otp_code in string.digits and len(otp_code) == 6