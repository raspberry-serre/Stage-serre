import subprocess
import sys

#install/upgrade pip
subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
#instale les dépendances
subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
#applique les migrations
migrations = subprocess.Popen([sys.executable, "manage.py", "makemigrations"])
migrations.wait()
migrate = subprocess.Popen([sys.executable, "manage.py", "migrate"])
migrate.wait()

#lance les processus pour le serveur Django, la communication avec l'Arduino et la prise de photos
arduino = subprocess.Popen([sys.executable, "manage.py", "com_arduino"])
django = subprocess.Popen([sys.executable, "manage.py", "runserver", "0.0.0.0:8000"])
picture = subprocess.Popen([sys.executable, "manage.py", "picture"])

django.wait()
arduino.terminate()
picture.terminate()