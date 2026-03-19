import cv2
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from api.models import Photo

save_folder = './media/camera'
INTERVAL = 3600

def capture_frame():
    cap = cv2.VideoCapture(0)

    hour = datetime.now().hour
    is_night = hour < 7 or hour >= 20

    if is_night:
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)
        cap.set(cv2.CAP_PROP_EXPOSURE, -4)
        cap.set(cv2.CAP_PROP_GAIN, 100)
    else:
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.75)

    for _ in range(10):
        cap.read()

    ret, frame = cap.read()
    cap.release()

    if ret and is_night:
        frame = cv2.convertScaleAbs(frame, alpha=1.5, beta=30)

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