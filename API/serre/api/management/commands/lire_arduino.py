import serial
import json
import os
import time
from django.core.management.base import BaseCommand
from api.models import Serre

class Command(BaseCommand):
    help = 'Lit les données Arduino via USB'

    def handle(self, *args, **kwargs):
        # Sur Raspberry Pi le port est /dev/ttyUSB0 ou /dev/ttyACM0
        ser = serial.Serial('/dev/ttyACM0', 9600, timeout=1)
        self.stdout.write("En écoute sur /dev/ttyACM0...")

        CMD_FILE = '/tmp/serre_cmds.txt'

        while True:
            try:
                # Read any incoming JSON lines from Arduino
                line = ser.readline().decode('utf-8').strip()
                if line.startswith('{'):
                    data = json.loads(line)
                    Serre.objects.create(
                        sol=data['sol'],
                        temp=data['temp'],
                        hum=data['hum'],
                        lumière=data['lumiere'],
                        periode=data['periode'],
                        servo=data['servo'],
                        pompe=data['pompe'],
                        led=data.get('led', 'OFF')
                    )
                    self.stdout.write(f"Sauvegardé : {data}")
                    
                    # Vérifier si on dépasse 500 enregistrements
                    total_count = Serre.objects.count()
                    if total_count > 500:
                        # Supprimer les plus anciens enregistrements
                        to_delete = total_count - 500
                        oldest_ids = Serre.objects.order_by('created_at').values_list('id', flat=True)[:to_delete]
                        Serre.objects.filter(id__in=oldest_ids).delete()
            except Exception as e:
                self.stdout.write(f"Erreur : {e}")

            # Check for queued commands to send to Arduino
            try:
                if os.path.exists(CMD_FILE):
                    # Read and clear the command file atomically
                    with open(CMD_FILE, 'r+') as f:
                        lines = [l.strip() for l in f.readlines() if l.strip()]
                        if lines:
                            # Truncate file after reading
                            f.seek(0)
                            f.truncate()
                    for cmd in lines:
                        # send command as a line
                        ser.write((cmd + '\n').encode('utf-8'))
                        self.stdout.write(f"Envoyé commande: {cmd}")
                        # small delay to let Arduino process
                        time.sleep(0.1)
            except Exception as e:
                self.stdout.write(f"Erreur en envoyant commandes: {e}")