import sqlite3
import os
import glob
import json

db_path = os.path.expanduser(r'~\.codex\state_5.sqlite')
db = sqlite3.connect(db_path)
c = db.cursor()

# List tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Tables:", tables)

for (tname,) in tables:
    c.execute(f"PRAGMA table_info([{tname}])")
    cols = c.fetchall()
    col_names = [col[1] for col in cols]
    print(f"\n--- {tname} columns: {col_names}")
    c.execute(f"SELECT * FROM [{tname}] LIMIT 5")
    rows = c.fetchall()
    for row in rows:
        print(row)

db.close()
