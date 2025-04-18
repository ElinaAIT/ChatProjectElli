from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os
import random
import string
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

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

    # Таблица групп
    c.execute('''CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )''')

    # Таблица участников групп
    c.execute('''CREATE TABLE IF NOT EXISTS group_members (
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )''')

    conn.commit()
    conn.close()

init_db()

def send_email(to_email, code):
    sendgrid_api_key = 'your_sendgrid_api_key'  # Replace with your SendGrid API key

    subject = 'Код для сброса пароля'
    body = f'Ваш код для сброса пароля: {code}\nКод действителен в течение 10 минут.'

    message = Mail(
        from_email='your_email@example.com',  # Replace with your verified sender email
        to_emails=to_email,
        subject=subject,
        plain_text_content=body
    )

    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        print(f"Email sent successfully to {to_email}. Status code: {response.status_code}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
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
        print(f"Регистрация пользователя: {username}, {email}")  # Логирование
        c.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                  (username, email, hashed_password))  # Corrected line
        conn.commit()
        conn.close()
        return jsonify({'message': 'Пользователь успешно зарегистрирован'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Имя пользователя или email уже существуют'}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Имя пользователя и пароль обязательны'}), 400
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT password FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    conn.close()
    if user and check_password_hash(user[0], password):
        return jsonify({'message': 'Авторизация успешна'}), 200
    return jsonify({'error': 'Неверное имя пользователя или пароль'}), 401

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
        # Generate a random 6-digit reset code
        code = ''.join(random.choices(string.digits, k=6))
        expires_at = (datetime.now() + timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')  # Fix for SQLite
        # Store the reset code in the database
        print(f"Storing reset code for email: {email}")
        c.execute('INSERT INTO reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
                  (email, code, expires_at))
        conn.commit()
        conn.close()
        # Send the reset code to the user's email
        print(f"Sending email to: {email}")
        if send_email(email, code):
            print(f"Reset code sent successfully to: {email}")
            return jsonify({'message': 'Код отправлен на ваш email'}), 200
        else:
            print(f"Failed to send email to: {email}")
            return jsonify({'error': 'Ошибка при отправке email'}), 500
    except Exception as e:
        print(f"Error in /api/request-reset: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')
    new_password = data.get('new_password')
    if not email or not code or not new_password:
        return jsonify({'error': 'Все поля обязательны'}), 400
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
        print(f"Error fetching users: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

@app.route('/api/create-group', methods=['POST'])
def create_group():
    data = request.get_json()
    group_name = data.get('group_name')
    user_ids = data.get('user_ids')  # List of user IDs

    if not group_name or not user_ids:
        return jsonify({'error': 'Название группы и участники обязательны'}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Создание группы
        c.execute('INSERT INTO groups (name) VALUES (?)', (group_name,))
        group_id = c.lastrowid

        # Добавление участников в группу
        for user_id in user_ids:
            c.execute('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', (group_id, user_id))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Группа успешно создана'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Группа с таким названием уже существует'}), 400
    except Exception as e:
        print(f"Error creating group: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
