from django.db import models

# Create your models here.

class blogPost(models.model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_add_now=True) 

    def __str__(self):
        return self.title
