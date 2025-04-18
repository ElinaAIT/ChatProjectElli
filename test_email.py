import smtplib
from email.mime.text import MIMEText

def send_test_email():
    smtp_server = 'smtp.gmail.com'
    smtp_port = 587
    smtp_user = 'your_email@gmail.com'  # Укажите ваш email
    smtp_password = 'your_regular_password'  # Укажите ваш пароль Gmail

    to_email = 'recipient_email@gmail.com'  # Укажите email получателя
    subject = 'Тестовое письмо'
    body = 'Это тестовое письмо из приложения ChatProject.'

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        print(f"Подключение к SMTP серверу: {smtp_server}:{smtp_port}")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        print("Начало аутентификации...")
        server.login(smtp_user, smtp_password)
        print("Аутентификация успешна. Отправка письма...")
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"Тестовое письмо успешно отправлено на {to_email}")
    except smtplib.SMTPAuthenticationError as e:
        print("Ошибка аутентификации SMTP: Проверьте ваш email и пароль.")
        print(f"Детали ошибки: {e}")
    except Exception as e:
        print(f"Ошибка при отправке тестового письма: {e}")

if __name__ == "__main__":
    send_test_email()
