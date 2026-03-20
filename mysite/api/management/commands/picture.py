import cv2
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from api.models import Photo

save_folder = './media/camera'
INTERVAL = 597 # seconds (10 minutes - 3 seconds for processing)
ZOOM = 2.5  # ← 1.0 = no zoom, 1.5 = 50% zoom, 2.0 = 2x zoom

def capture_frame():
    cap = cv2.VideoCapture(0)
    hour = datetime.now().hour
    is_night = hour < 7 or hour >= 20

    if is_night:
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)
        cap.set(cv2.CAP_PROP_EXPOSURE, -1)
        cap.set(cv2.CAP_PROP_GAIN, 200)
    else:
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.75)

    for _ in range(10):
        cap.read()

    ret, frame = cap.read()
    cap.release()

    if ret:
        if is_night:
            frame = cv2.convertScaleAbs(frame, alpha=2.5, beta=60)

        if ZOOM != 1.0:
            h, w = frame.shape[:2]
            new_h = int(h / ZOOM)
            new_w = int(w / ZOOM)
            y1 = (h - new_h) // 2
            x1 = (w - new_w) // 2
            frame = frame[y1:y1+new_h, x1:x1+new_w]
            frame = cv2.resize(frame, (w, h))  # resize back to original resolution

    return ret, frame

class Command(BaseCommand):
    help = 'Take a picture from webcam every X minutes'

    def handle(self, *args, **kwargs):
        while True:
            ret, frame = capture_frame()
            if ret:
                timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                cv2.imwrite(f'{save_folder}/{timestamp}.jpg', frame)
                cv2.imwrite(f'{save_folder}/photo_latest.jpg', frame)
                try:
                    Photo.objects.create(path=f'/media/camera/{timestamp}.jpg')
                except Exception as e:
                    print(f"[ERROR] Failed to log action: {e}")
                self.stdout.write(f'Saved: {timestamp}.jpg')
            else:
                self.stdout.write('Failed to capture')
            time.sleep(INTERVAL)