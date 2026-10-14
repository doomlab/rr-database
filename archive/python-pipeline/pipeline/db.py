import os

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")


def get_connection():
    database_url = os.environ["DATABASE_URL"]
    return psycopg2.connect(database_url)


def get_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
