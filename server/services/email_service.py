import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config.env_handler import SMTP_PASSWORD, SMTP_PORT, SMTP_SERVER, SMTP_USERNAME


class EmailService:
    def __init__(self):
        self.smtp_server = SMTP_SERVER
        self.smtp_port = SMTP_PORT
        self.smtp_username = SMTP_USERNAME
        self.smtp_password = SMTP_PASSWORD

    def send_email(self, to: str, subject: str, body: str, is_html: bool = False):
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.smtp_username
            message["To"] = to

            content_type = "html" if is_html else "plain"
            message.attach(MIMEText(body, content_type))

            self.server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            self.server.starttls()
            self.server.login(self.smtp_username, self.smtp_password)

            self.server.send_message(message)
            return True

        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False

        finally:
            if self.server:
                self.server.quit()


email_service = EmailService()
