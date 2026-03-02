import os
import subprocess
import sys
import threading
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

application = get_wsgi_application()

def start_arduino():
    subprocess.Popen([sys.executable, 'manage.py', 'com_arduino'])

thread = threading.Thread(target=start_arduino, daemon=True)
thread.start()