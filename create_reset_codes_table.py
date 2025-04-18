import sqlite3

DB_PATH = 'users.db'

def create_reset_codes_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS reset_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL
    )''')
    conn.commit()
    conn.close()
    print("reset_codes table created successfully.")

if __name__ == "__main__":
    create_reset_codes_table()
