import subprocess
import sys

subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
migrations = subprocess.Popen([sys.executable, "manage.py", "makemigrations"])
migrations.wait()
migrate = subprocess.Popen([sys.executable, "manage.py", "migrate"])
migrate.wait()

arduino = subprocess.Popen([sys.executable, "manage.py", "com_arduino"])
django = subprocess.Popen([sys.executable, "manage.py", "runserver", "0.0.0.0:8000"])
picture = subprocess.Popen([sys.executable, "manage.py", "picture"])

django.wait()
arduino.terminate()
picture.terminate()