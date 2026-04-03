import cv2
import time
import os
from datetime import datetime, timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from api.models import Photo
from django.core.files import File

save_folder = settings.MEDIA_ROOT / 'camera'
ZOOM = 2.5


def capture_frame():
    cap = cv2.VideoCapture("/dev/video0")
    cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 3)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920) 
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    for _ in range(20):
        cap.read()

    ret, frame = cap.read()
    cap.release()

    if not ret:
        return False, None

    if ZOOM != 1.0:
        h, w = frame.shape[:2]
        new_h = int(h / ZOOM)
        new_w = int(w / ZOOM)
        y1 = (h - new_h) // 2
        x1 = (w - new_w) // 2
        frame = frame[y1:y1+new_h, x1:x1+new_w]
        frame = cv2.resize(frame, (w, h))

    return True, frame


def cleanup_old_photos(max_count=500):
    total = Photo.objects.count()
    if total <= max_count:
        return

    to_delete = total - max_count
    old_photos = Photo.objects.order_by('id')[:to_delete]

    for photo in old_photos:
        try:
            if photo.image and os.path.exists(photo.image.path):
                os.remove(photo.image.path)
        except:
            pass

        photo.delete()


def seconds_until_next_slot():
    now = datetime.now()
    minute = now.minute

    if minute < 30:
        next_time = now.replace(minute=30, second=0, microsecond=0)
    else:
        next_time = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)

    return max(0, (next_time - now).total_seconds())



class Command(BaseCommand):
    help = 'Take a picture from webcam every new hour'

    def handle(self, *args, **kwargs):
        while True:
            wait_time = seconds_until_next_slot()

            time.sleep(wait_time)

            ret, frame = capture_frame()
            if not ret:
                continue

            timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            filepath = save_folder / f"{timestamp}.jpg"

            cv2.imwrite(str(filepath), frame)
            cv2.imwrite(str(save_folder / "photo_latest.jpg"), frame)

            try:
                with open(filepath, 'rb') as f:
                    django_file = File(f, name=f"{timestamp}.jpg")
                    Photo.objects.create(image=django_file)

                cleanup_old_photos(max_count=500)

            except Exception as e:
                print("ERROR SAVING PHOTO:", e)
