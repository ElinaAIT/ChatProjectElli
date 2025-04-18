import sqlite3

DB_PATH = 'users.db'

def check_email(email):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT email FROM users WHERE email = ?", (email,))
    result = c.fetchone()
    conn.close()
    if result:
        print(f"Email found: {result[0]}")
    else:
        print("Email not found.")

if __name__ == "__main__":
    email_to_check = "test@example.com"  # Замените на email, который вы вводите в Postman
    check_email(email_to_check)
