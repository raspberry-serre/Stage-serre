from rest_framework import serializers
from .models import Logs, Serre, Usr, Photo

class SerreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Serre
        fields = '__all__'

class UsrSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usr
        fields = '__all__'

class LogsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Logs
        fields = '__all__'

class PhotoSerializer(serializers.ModelSerializer):
    path = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'path', 'created_at']

    def get_path(self, obj):
        request = self.context.get('request')
        if obj.image:
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return None