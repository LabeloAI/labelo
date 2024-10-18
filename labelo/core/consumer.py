from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.layers import get_channel_layer


class Consumer(AsyncWebsocketConsumer):
    async def connect(self):
        name = f"user_{self.scope['user'].id}"
        self.group_name = name
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        name = f"user_{self.scope['user'].id}"
        await self.channel_layer.group_discard(name, self.channel_name)

    async def notification(self, event):
        await self.send(text_data=json.dumps(event))


def send_notification(notification_data, group_name):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(group_name, notification_data)
