import cv2
import time
import os
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.management.base import BaseCommand
from api.models import Photo
from django.core.files import File

save_folder = settings.MEDIA_ROOT / 'camera'
ZOOM = 2.5


def capture_frame(cap):
    for _ in range(10):
        cap.read()

    ret, frame = cap.read()

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
        except Exception as e:
            print("Cleanup error:", e)

        photo.delete()


def seconds_until_next_slot():
    now = timezone.now()
    minute = now.minute

    if minute < 30:
        next_time = now.replace(minute=30, second=0, microsecond=0)
    else:
        next_time = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)

    return (next_time - now).total_seconds()


class Command(BaseCommand):
    help = 'Take a picture from webcam every 30 minutes'

    def handle(self, *args, **kwargs):
        os.makedirs(save_folder, exist_ok=True)

        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.75)

        if not cap.isOpened():
            print("Camera failed to open")
            return

        while True:
            wait_time = seconds_until_next_slot()
            time.sleep(wait_time)

            ret, frame = capture_frame(cap)

            if not ret:
                print("Capture failed, reconnecting camera")
                cap.release()
                time.sleep(2)
                cap = cv2.VideoCapture(0)
                cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.75)
                continue

            timestamp = timezone.now().strftime('%Y-%m-%d_%H-%M-%S')
            filepath = save_folder / f"{timestamp}.jpg"

            cv2.imwrite(str(save_folder / "photo_latest.jpg"), frame)

            try:
                with open(filepath, 'rb') as f:
                    django_file = File(f, name=f"{timestamp}.jpg")
                    Photo.objects.create(image=django_file)

                cleanup_old_photos(max_count=500)

            except Exception as e:
                print("ERROR SAVING PHOTO:", e)