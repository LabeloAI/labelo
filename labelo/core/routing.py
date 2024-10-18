from django.urls import path
from .consumer import Consumer

websocket_urlpatterns = [
    path('ws/notification', Consumer.as_asgi()),
]
