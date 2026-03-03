from rest_framework import serializers
from .models import Serre, Usr

class SerreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Serre
        fields = '__all__'

class UsrSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usr
        fields = '__all__'