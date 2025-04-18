import sqlite3

DB_PATH = 'users.db'

def verify_tables():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    conn.close()
    print("Existing tables:", tables)

if __name__ == "__main__":
    verify_tables()
