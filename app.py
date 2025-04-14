from flask import Flask, request, redirect, url_for, session, render_template, flash
import sqlite3
import hashlib

app = Flask(__name__)  # Без указания static_folder и template_folder
app.secret_key = 'your_secret_key'

# Путь к базе данных
DATABASE = 'chat.db'

# Инициализация базы данных
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      username TEXT UNIQUE, 
                      email TEXT UNIQUE, 
                      password TEXT)''')
    conn.commit()
    conn.close()

init_db()

# Главная страница
@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('chat'))
    return redirect(url_for('login'))

# Страница логина и регистрации
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST' and 'login' in request.form:
        username = request.form['username']
        password = hashlib.sha256(request.form['password'].encode()).hexdigest()
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ? AND password = ?', (username, password))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            session['username'] = username
            return redirect(url_for('chat'))
        else:
            flash('Неверное имя пользователя или пароль')
    
    return render_template('index.html')

@app.route('/signup', methods=['POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = hashlib.sha256(request.form['password'].encode()).hexdigest()
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
                          (username, email, password))
            conn.commit()
            session['username'] = username
            return redirect(url_for('chat'))
        except sqlite3.IntegrityError:
            flash('Имя пользователя или email уже заняты')
        finally:
            conn.close()
    
    return redirect(url_for('login'))

# Страница чата
@app.route('/chat')
def chat():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('chat.html', username=session['username'])

# Выход
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)