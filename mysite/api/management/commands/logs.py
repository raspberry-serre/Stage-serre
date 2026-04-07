from api.models import Logs

# Importer le modèle Logs utilisé pour stocker les actions utilisateur

def log(username,action):
    """Log a user action to the Logs model"""
    try:
        # Créer une nouvelle entrée dans la table Logs
        Logs.objects.create(
            username=username,
            action=action
        )
    except Exception as e:
        # Afficher une erreur si l'écriture en base échoue
        print(f"[ERROR] Failed to log action: {e}")


def get_connection_logs(limit=50):
    """Get recent user connections"""
    try:
        # Récupérer les logs les plus récents triés par date de création
        logs = Logs.objects.all().order_by('-created_at')[:limit]
        return list(logs)
    except Exception as e:
        # Afficher une erreur et retourner une liste vide si la lecture échoue
        print(f"[ERROR] Failed to read logs: {e}")
        return []
    
