import cv2
import time
from datetime import datetime
from django.core.management.base import BaseCommand

save_folder = './media/camera'
INTERVAL = 60

class Command(BaseCommand):
    help = 'Take a picture from webcam every X minutes'

    def handle(self, *args, **kwargs):
        while True:
            cap = cv2.VideoCapture(0)
            for _ in range(5):
                cap.read()
            ret, frame = cap.read()
            if ret:
                # save timestamped archive
                timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                cv2.imwrite(f'{save_folder}/photo_{timestamp}.jpg', frame)
                # save latest for WebGL
                cv2.imwrite(f'{save_folder}/photo_latest.jpg', frame)
                self.stdout.write(f'Saved: photo_{timestamp}.jpg')
            else:
                self.stdout.write('Failed to capture')
            cap.release()
            time.sleep(INTERVAL)