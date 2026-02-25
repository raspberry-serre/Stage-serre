# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import render
from .models import Serre
from .serializers import SerreSerializer
import os

CMD_FILE = '/tmp/serre_cmds.txt'

def index(request):
    """Page d'accueil avec rafraîchissement automatique"""
    return render(request, 'index.html')

@api_view(['GET'])
def get_serre(request):
    serre = Serre.objects.all().order_by('-created_at')[:10]
    serializer = SerreSerializer(serre, many=True)
    return Response(serializer.data)   

@api_view(['GET'])
def last_serre(request):
    lastserre = Serre.objects.latest('created_at')
    serializer = SerreSerializer(lastserre)
    return Response(serializer.data)


@api_view(['POST'])
def toit_cmd(request):
    """Queue a roof command for the serial manager.

    Expected JSON: {"action": "open"|"close"|"stop"}
    """
    action = request.data.get('action')
    if not action:
        return Response({'error': 'missing action'}, status=400)

    action = action.lower()
    if action not in ('open', 'close', 'stop'):
        return Response({'error': 'invalid action'}, status=400)

    cmd = 'TOIT:OPEN' if action == 'open' else 'TOIT:CLOSE' if action == 'close' else 'TOIT:STOP'
    
    # Write to command file - lire_arduino.py will read and send it
    try:
        print(f"[TOIT] Writing command to {CMD_FILE}: {cmd}")
        with open(CMD_FILE, 'a') as f:
            f.write(cmd + '\n')
        print(f"[TOIT] Successfully queued: {cmd}")
        return Response({'status': 'queued', 'cmd': cmd, 'file': CMD_FILE})
    except Exception as e:
        print(f"[TOIT] Error writing to {CMD_FILE}: {e}")
        return Response({'error': str(e)}, status=500)
