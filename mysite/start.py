import subprocess
import sys

arduino = subprocess.Popen([sys.executable, "manage.py", "com_arduino"])
django = subprocess.Popen([sys.executable, "manage.py", "runserver"])

django.wait()
arduino.terminate()