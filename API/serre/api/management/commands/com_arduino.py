import serial
import time
import os

from django.core.management.base import BaseCommand

CMD_FILE = "/tmp/serre_cmds.txt"


class Command(BaseCommand):
    help = "Read command file and send to Arduino"

    def handle(self, *args, **kwargs):
        try:
            ser = serial.Serial('/dev/ttyACM0', 9600, timeout=1)
        except serial.SerialException:
            try:
                ser = serial.Serial('/dev/ttyACM1', 9600, timeout=1)
            except serial.SerialException:
                self.stdout.write("Erreur: Impossible d'ouvrir le port série")
                return

        self.stdout.write("========================================")
        self.stdout.write("Serial manager started")
        self.stdout.write("========================================")

        while True:
            try:
                # Lire fichier commandes
                if os.path.exists(CMD_FILE):
                    with open(CMD_FILE, "r") as f:
                        lines = f.readlines()

                    # Vider le fichier après lecture
                    open(CMD_FILE, "w").close()

                    for line in lines:
                        cmd = line.strip()
                        if cmd:
                            ser.write((cmd + "\n").encode("utf-8"))
                            ser.flush()
                            print(f"[SERIAL] Command sent: {cmd}")

                time.sleep(0.5)

            except Exception as e:
                self.stdout.write(f"Erreur: {e}")
                time.sleep(1)