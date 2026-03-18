import cv2
import time
from datetime import datetime
from django.core.management.base import BaseCommand

save_folder = './api/management/commands/pictures'
INTERVAL = 60  # seconds between pictures

class Command(BaseCommand):
    help = 'Take a picture from webcam every X minutes'

    def handle(self, *args, **kwargs):
        while True:
            cap = cv2.VideoCapture(0)

            # warm up: discard first few frames
            for _ in range(5):
                cap.read()

            ret, frame = cap.read()
            if ret:
                timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                filename = f'{save_folder}/photo_{timestamp}.jpg'
                cv2.imwrite(filename, frame)
                self.stdout.write(f'Saved: {filename}')
            else:
                self.stdout.write('Failed to capture')

            cap.release()  # release between shots
            time.sleep(INTERVAL)