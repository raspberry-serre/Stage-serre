import serial
import time
import os
import json
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Serre  # adjust import

CMD_FILE = "/tmp/serre_cmds.txt"
SERIAL_PORTS = ["/dev/ttyACM0", "/dev/ttyACM1"]
BAUDRATE = 9600
MAX_RECORDS = 1000  # or whatever you need


class Command(BaseCommand):
    help = "Read command file and send to Arduino"

    def connect_serial(self):
        while True:
            for port in SERIAL_PORTS:
                try:
                    ser = serial.Serial(port, BAUDRATE, timeout=1)
                    time.sleep(2)
                    self.stdout.write(f"[OK] Connected to {port}")
                    return ser
                except serial.SerialException:
                    self.stdout.write(f"[WARN] Port {port} not available")
            time.sleep(3)

    def handle(self, *args, **kwargs):
        ser = self.connect_serial()
        self.stdout.write("=== Arduino manager started ===")

        while True:
            # ----------- READ SERIAL -----------
            try:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    if line.startswith("{"):
                        try:
                            data = json.loads(line)
                            with transaction.atomic():
                                Serre.objects.create(
                                    sol=data.get('sol'),
                                    temp=data.get('temp'),
                                    hum=data.get('hum'),
                                    lumière=data.get('lumiere'),
                                    periode=data.get('periode'),
                                    servo=data.get('servo'),
                                    pompe=data.get('pompe'),
                                    led=data.get('led', 'OFF')
                                )
                                total = Serre.objects.count()
                                if total > MAX_RECORDS:
                                    Serre.objects.order_by('created_at')[:total - MAX_RECORDS].delete()
                        except json.JSONDecodeError:
                            self.stdout.write("[WARN] Invalid JSON")
            except serial.SerialException:
                self.stdout.write("[ERROR] Arduino disconnected. Reconnecting...")
                ser.close()
                ser = self.connect_serial()
            except Exception as e:
                self.stdout.write(f"[ERROR] {e}")

            # ----------- SEND COMMANDS -----------
            try:
                if os.path.exists(CMD_FILE):
                    with open(CMD_FILE, "r") as f:
                        lines = f.readlines()
                    open(CMD_FILE, "w").close()  # clear file

                    for line in lines:
                        cmd = line.strip()
                        if cmd:
                            ser.write((cmd + "\n").encode("utf-8"))
                            ser.flush()
                            print(f"[SERIAL] Command sent: {cmd}")
            except Exception as e:
                self.stdout.write(f"[ERROR sending command] {e}")

            time.sleep(0.1)