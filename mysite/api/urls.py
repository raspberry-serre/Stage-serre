from django.urls import path
from . import views

urlpatterns = [
    path('', views.login, name='login'),
    path('index/', views.index, name='index'),
    path('api/last/', views.last_serre),
    path('api/toit/', views.toit_cmd),
    path('api/led/', views.led_cmd),
    path('api/mode/', views.auto_manuel, name='auto_manuel'),
    path('api/logs/', views.logs_api, name='logs_api'),
    path('logout/', views.logout, name='logout'),
    path('new_account/', views.new_account, name='new_account'),
    path('logs/', views.logs, name='logs'),
    path('api/pompe/', views.pompe_cmd, name='pompe_cmd'),
    path('api/refill/', views.refill_cmd, name='refill_cmd'),
    path('api/eau/', views.eau_cmd, name='eau_cmd'),
    path('api/photos/', views.photo_list),

]