from config.env_handler import API_URL, OTP_EXPIRATION_MINUTES

otp_email_template_html = """
<html>
    <body>
        <h1>Your OTP code is {otp_code}</h1>
        <h2> Click <a href="{API_URL}/auth/user/verify-otp?email={email}&otp_code={otp_code}">here</a> to verify your email</h2>
        <h2> This code will expire in {OTP_EXPIRATION_MINUTES} minutes</h2>
    </body>
</html>
"""

otp_forgot_password_email_template_html = """
<html>
    <body>
        <h1>Your OTP code is {otp_code}</h1>
        <h2> Click <a href="{API_URL}/auth/user/verify-otp-forgot-password?email={email}&otp_code={otp_code}">here</a> to reset your password</h2>
        <h2> This code will expire in {OTP_EXPIRATION_MINUTES} minutes</h2>
    </body>
</html>
"""

def otp_email_template(otp_code: str, email: str):
    return otp_email_template_html.format(otp_code=otp_code, API_URL=API_URL, OTP_EXPIRATION_MINUTES=OTP_EXPIRATION_MINUTES, email=email)

def otp_forgot_password_email_template(otp_code: str, email: str):
    return otp_forgot_password_email_template_html.format(otp_code=otp_code, API_URL=API_URL, OTP_EXPIRATION_MINUTES=OTP_EXPIRATION_MINUTES, email=email)