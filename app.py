from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.mime.text import MIMEText
import random
import string
from datetime import datetime, timedelta
import logging

app = Flask(__name__)
CORS(app)
app.secret_key = 'your_secret_key'

DB_PATH = 'users.db'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        name TEXT NOT NULL
    )''')

    # Таблица участников групп
    c.execute('''CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
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
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Ошибка при отправке email: {e}")
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
            session['username'] = username
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
        c.execute('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', (email,))
        user = c.fetchone()
        if not user:
            conn.close()
            return jsonify({'error': 'Пользователь с таким email не найден'}), 404

        code = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.now() + timedelta(minutes=10)
        c.execute('INSERT INTO reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
                  (email, code, expires_at))
        conn.commit()
        conn.close()

        if send_email(email, code):
            return jsonify({'message': 'Код отправлен на ваш email'}), 200
        else:
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

@app.route('/api/groups', methods=['GET'])
def get_groups():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT id, name FROM groups')
        groups = [{'id': row[0], 'name': row[1]} for row in c.fetchall()]
        conn.close()
        return jsonify({'groups': groups}), 200
    except Exception as e:
        print(f"Ошибка при получении списка групп: {e}")
        return jsonify({'error': 'Ошибка сервера'}), 500

@app.route('/api/groups', methods=['POST'])
def create_group():
    data = request.get_json()
    print(f"Получен запрос на создание группы: {data}")
    name = data.get('name')
    members = data.get('members', [])

    if not name:
        print("Ошибка: Название группы не указано")
        return jsonify({'success': False, 'error': 'Название группы обязательно'}), 400
    if not members:
        print("Ошибка: Участники не указаны")
        return jsonify({'success': False, 'error': 'Должен быть хотя бы один участник'}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Проверка существования пользователей (игнорируем регистр)
        print(f"Проверка пользователей: {members}")
        placeholders = ','.join('?' * len(members))
        query = f'SELECT id, username FROM users WHERE LOWER(username) IN ({placeholders})'
        print(f"Выполняем SQL-запрос: {query} с параметрами {members}")
        c.execute(query, [m.lower() for m in members])
        valid_members = c.fetchall()
        print(f"Найденные пользователи: {valid_members}")

        # Проверяем, какие пользователи не найдены
        valid_usernames = [row[1] for row in valid_members]
        invalid_members = [m for m in members if m.lower() not in [vm.lower() for vm in valid_usernames]]
        if invalid_members:
            print(f"Ошибка: Пользователи не найдены: {invalid_members}")
            conn.close()
            return jsonify({'success': False, 'error': f'Пользователи не найдены: {", ".join(invalid_members)}'}), 400

        # Создание группы
        print(f"Создание группы: {name}")
        c.execute('INSERT INTO groups (name) VALUES (?)', (name,))
        group_id = c.lastrowid
        print(f"ID новой группы: {group_id}")

        # Добавление участников
        print(f"Добавление участников: {valid_members}")
        for user_id, username in valid_members:
            c.execute('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', (group_id, user_id))

        conn.commit()
        conn.close()
        print(f"Группа успешно создана: {name}")
        return jsonify({'success': True}), 201
    except sqlite3.IntegrityError as e:
        conn.close()
        print(f"Ошибка базы данных: {e}")
        return jsonify({'success': False, 'error': 'Группа с таким названием уже существует'}), 400
    except Exception as e:
        conn.close()
        print(f"Ошибка при создании группы: {e}")
        return jsonify({'success': False, 'error': 'Ошибка сервера'}), 500

@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    try:
        if 'username' not in session:
            logger.warning("Неавторизованный доступ к /api/user/profile")
            return jsonify({'success': False, 'error': 'Пользователь не авторизован'}), 401

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT username, email FROM users WHERE username = ?', (session['username'],))
        user = c.fetchone()
        conn.close()

        if user:
            return jsonify({
                'success': True,
                'name': user[0],
                'email': user[1]
            }), 200
        logger.warning(f"Пользователь {session['username']} не найден при получении профиля")
        return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
    except Exception as e:
        logger.error(f"Ошибка при получении профиля пользователя: {e}")
        return jsonify({'success': False, 'error': 'Ошибка сервера'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)