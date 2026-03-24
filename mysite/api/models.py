from django.db import models

# Create your models here.

class Serre(models.Model):
    sol = models.IntegerField()
    temp = models.FloatField()
    hum = models.FloatField()
    lumière = models.IntegerField()
    periode = models.CharField(max_length=10)
    servo = models.IntegerField()
    pompe = models.CharField(max_length=10)
    led = models.CharField(max_length=10, default='OFF')
    pompe_lock = models.IntegerField(default=600)
    eau = models.IntegerField(default=100000)
    debit = models.FloatField(default=0.0)
    pump_on_time = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Serre {self.id} - Sol: {self.sol}, Temp: {self.temp}, Hum: {self.hum}, Lumière: {self.lumière}, Période: {self.periode}, Servo: {self.servo}, Pompe: {self.pompe}, Led: {self.led}"

class Usr(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)

    def __str__(self):
        return self.username

class Logs(models.Model):
    username = models.CharField(max_length=150, null=True, blank=True)
    action = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log {self.username}: {self.id}: {self.action}"

class Photo(models.Model):
    image = models.ImageField(upload_to='camera/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo {self.id}"
