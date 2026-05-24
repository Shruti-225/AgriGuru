import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "your_default_secret_key")
    DEBUG = os.getenv("DEBUG", "False").lower() in ['true', '1', 't']
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",") if os.getenv("ALLOWED_HOSTS") else []
    API_VERSION = os.getenv("API_VERSION", "v1")