otp_email_template_html = """
<html>
    <body>
        <h1>Your OTP code is {otp_code}</h1>
    </body>
</html>
"""

def otp_email_template(otp_code: str):
    return otp_email_template_html.format(otp_code=otp_code)
