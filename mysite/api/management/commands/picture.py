import cv2
import time
from datetime import datetime
from django.conf import settings
from django.core.management.base import BaseCommand
from api.models import Photo
from django.core.files import File

save_folder = settings.MEDIA_ROOT / 'camera'
INTERVAL = 3597 # seconds (10 minutes - 3 seconds for processing)
ZOOM = 2.5  # ← 1.0 = no zoom, 1.5 = 50% zoom, 2.0 = 2x zoom

NIGHT_START = 20  
NIGHT_END = 7     

def is_night():
    hour = datetime.now().hour
    return hour < NIGHT_END or hour >= NIGHT_START

def capture_frame():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.75)

    for _ in range(10):
        cap.read()

    ret, frame = cap.read()
    cap.release()

    if ret and ZOOM != 1.0:
        h, w = frame.shape[:2]
        new_h = int(h / ZOOM)
        new_w = int(w / ZOOM)
        y1 = (h - new_h) // 2
        x1 = (w - new_w) // 2
        frame = frame[y1:y1+new_h, x1:x1+new_w]
        frame = cv2.resize(frame, (w, h))

    return ret, frame

class Command(BaseCommand):
    help = 'Take a picture from webcam every X minutes'

    def handle(self, *args, **kwargs):
        while True:
            if not is_night():
                ret, frame = capture_frame()
                if ret:
                    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                    cv2.imwrite(f'{save_folder}/{timestamp}.jpg', frame)
                    cv2.imwrite(f'{save_folder}/photo_latest.jpg', frame)
                    try:
                        with open(f'{save_folder}/{timestamp}.jpg', 'rb') as f:
                            django_file = File(f, name=f"{timestamp}.jpg")
                            Photo.objects.create(image=django_file)

                    except Exception as e:
                        print(f"[ERROR] Failed to save photo: {e}")
                else:
                    self.stdout.write('Failed to capture')
            time.sleep(INTERVAL)