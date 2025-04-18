import sqlite3

DB_PATH = 'users.db'

def list_users():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, username, email FROM users")
    users = c.fetchall()
    conn.close()
    if users:
        print("Список пользователей:")
        for user in users:
            print(f"ID: {user[0]}, Username: {user[1]}, Email: {user[2]}")
    else:
        print("Таблица пользователей пуста.")

if __name__ == "__main__":
    list_users()
