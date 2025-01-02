import random
import string
from config.env_handler import OTP_CODE_LENGTH

def generate_otp_code():
    return ''.join(random.choices(string.digits, k=OTP_CODE_LENGTH))

def is_otp_code_valid(otp_code: str):
    return len(otp_code) == OTP_CODE_LENGTH
