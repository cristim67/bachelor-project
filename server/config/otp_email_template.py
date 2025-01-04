from config.env_handler import APP_URL, OTP_EXPIRATION_MINUTES

otp_email_template_html = """
<html>
    <body>
        <h1>Your OTP code is {otp_code}</h1>
        <h2> Click <a href="{APP_URL}/auth/user/verify-otp?otp_code={otp_code}">here</a> to verify your email</h2>
        <h2> This code will expire in {OTP_EXPIRATION_MINUTES} minutes</h2>
    </body>
</html>
"""

def otp_email_template(otp_code: str):
    return otp_email_template_html.format(otp_code=otp_code, APP_URL=APP_URL, OTP_EXPIRATION_MINUTES=OTP_EXPIRATION_MINUTES)