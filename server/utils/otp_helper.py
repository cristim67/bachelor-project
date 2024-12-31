import random
import string
from config.env_handler import OTP_EXPIRATION_MINUTES

def generate_otp_code():
    return ''.join(random.choices(string.digits, k=OTP_EXPIRATION_MINUTES))

def is_otp_code_valid(otp_code: str):
    return otp_code in string.digits and len(otp_code) == OTP_EXPIRATION_MINUTES