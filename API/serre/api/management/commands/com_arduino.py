import serial
import json
import os
import time

from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Serre

CMD_FILE = '/tmp/serre_cmds.txt'
SERIAL_PORT = '/dev/ttyACM0'
BAUDRATE = 9600
MAX_RECORDS = 500


class Command(BaseCommand):
    help = 'Lit les données Arduino via USB'

    def connect_serial(self):
        while True:
            try:
                ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=1)
                time.sleep(2)  # laisse le temps à l’Arduino de reset
                self.stdout.write(f"[OK] Connecté à {SERIAL_PORT}")
                return ser
            except Exception as e:
                self.stdout.write(f"[ERREUR] Connexion série: {e}")
                time.sleep(3)

    def handle(self, *args, **kwargs):
        ser = self.connect_serial()

        self.stdout.write("========================================")
        self.stdout.write(f"En écoute sur {SERIAL_PORT}...")
        self.stdout.write(f"Fichier commandes: {CMD_FILE}")
        self.stdout.write("========================================")

        while True:
            try:
                # ----------- LECTURE SERIE -----------
                line = ser.readline().decode('utf-8', errors='ignore').strip()

                if line:
                    print(f"[SERIAL] {line}")

                    if line.startswith('{'):
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

                                # Nettoyage optimisé
                                total = Serre.objects.count()
                                if total > MAX_RECORDS:
                                    Serre.objects.order_by('created_at')[:total - MAX_RECORDS].delete()

                            self.stdout.write("[DB] Données sauvegardées")

                        except json.JSONDecodeError:
                            self.stdout.write("[WARN] JSON invalide")

                # ----------- ENVOI COMMANDES -----------
                if os.path.exists(CMD_FILE):
                    with open(CMD_FILE, 'r+') as f:
                        lines = [l.strip() for l in f if l.strip()]
                        f.seek(0)
                        f.truncate()

                    for cmd in lines:
                        try:
                            ser.write((cmd + '\n').encode())
                            self.stdout.write(f"[CMD] Envoyé: {cmd}")
                            time.sleep(0.05)
                        except Exception as e:
                            self.stdout.write(f"[CMD] Erreur envoi: {e}")

            except serial.SerialException:
                self.stdout.write("[ERREUR] Arduino déconnecté. Reconnexion...")
                ser.close()
                ser = self.connect_serial()

            except Exception as e:
                self.stdout.write(f"[ERREUR] {e}")

            time.sleep(0.02)