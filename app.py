from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os
import smtplib
import random
import string
from email.mime.text import MIMEText
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

DB_PATH = 'users.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Таблица пользователей
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )''')

    # Таблица сброса паролей
    c.execute('''CREATE TABLE IF NOT EXISTS reset_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL
    )''')

    conn.commit()
    conn.close()

init_db()

def send_email(to_email, code):
    smtp_server = 'smtp.gmail.com'
    smtp_port = 587
    smtp_user = 'ellabaktygulova@gmail.com'
    smtp_password = 'tmyz tpza nvsw rzcv'

    subject = 'Код для сброса пароля'
    body = f'Ваш код для сброса пароля: {code}\nКод действителен в течение 10 минут.'
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        print(f"Подключение к SMTP серверу: {smtp_server}:{smtp_port}")
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.starttls()
        print("Начало аутентификации...")
        server.login(smtp_user, smtp_password)
        print("Аутентификация успешна. Отправка письма...")
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"Email успешно отправлен на {to_email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"Ошибка аутентификации SMTP: Проверьте email и пароль. Детали: {e}")
        return False
    except Exception as e:
        print(f"Ошибка при отправке email: {e}, Тип ошибки: {type(e).__name__}")
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'Все поля обязательны'}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        print(f"Регистрация пользователя: {username}, {email}")
        c.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                  (username, email, hashed_password))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Пользователь успешно зарегистрирован'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Имя пользователя или email уже существуют'}), 400
    except Exception as e:
        print(f"Ошибка при регистрации: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Имя пользователя и пароль обязательны'}), 400
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT password FROM users WHERE username = ?', (username,))
        user = c.fetchone()
        conn.close()
        if user and check_password_hash(user[0], password):
            return jsonify({'message': 'Авторизация успешна'}), 200
        return jsonify({'error': 'Неверное имя пользователя или пароль'}), 401
    except Exception as e:
        print(f"Ошибка при авторизации: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

@app.route('/api/request-reset', methods=['POST'])
def request_reset():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email обязателен'}), 400
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        print(f"Проверка email: {email}")
        c.execute('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', (email,))
        user = c.fetchone()
        if not user:
            conn.close()
            print(f"Email не найден: {email}")
            return jsonify({'error': 'Пользователь с таким email не найден'}), 404
        code = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.now() + timedelta(minutes=10)
        print(f"Сохранение кода сброса для email: {email}, код: {code}")
        c.execute('INSERT INTO reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
                  (email, code, expires_at))
        conn.commit()
        conn.close()
        print(f"Отправка email на: {email}")
        if send_email(email, code):
            print(f"Код успешно отправлен на: {email}")
            return jsonify({'message': 'Код отправлен на ваш email'}), 200
        else:
            print(f"Не удалось отправить email на: {email}")
            return jsonify({'error': 'Ошибка при отправке email'}), 500
    except Exception as e:
        print(f"Ошибка в /api/request-reset: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')
    new_password = data.get('new_password')
    if not email or not code or not new_password:
        return jsonify({'error': 'Все поля обязательны'}), 400
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT code, expires_at FROM reset_codes WHERE email = ? ORDER BY expires_at DESC LIMIT 1', (email,))
        reset_data = c.fetchone()
        if not reset_data:
            conn.close()
            return jsonify({'error': 'Код не найден'}), 400
        stored_code, expires_at = reset_data
        expires_at = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S.%f')
        if datetime.now() > expires_at:
            conn.close()
            return jsonify({'error': 'Код истек'}), 400
        if code != stored_code:
            conn.close()
            return jsonify({'error': 'Неверный код'}), 400
        hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')
        c.execute('UPDATE users SET password = ? WHERE email = ?', (hashed_password, email))
        c.execute('DELETE FROM reset_codes WHERE email = ?', (email,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Пароль успешно изменен'}), 200
    except Exception as e:
        print(f"Ошибка в /api/reset-password: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT username FROM users')
        users = [row[0] for row in c.fetchall()]
        conn.close()
        return jsonify({'users': users}), 200
    except Exception as e:
        print(f"Ошибка при получении списка пользователей: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)