from rest_framework import generics
from rest_framework.response import Response
from notifications.models import Notifications
from notifications.serializers import NotificationSerializer
from users.models import User


class NotificationListApi(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notifications.objects.filter(read=False, user=self.request.user).order_by('-timestamp')

    def get(self, request, *args, **kwargs):
        data = self.get_queryset()
        serializer = NotificationSerializer(data, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        message = request.data['message']
        title = request.data['title']
        users = [User.objects.get(id=self.request.data["user"])]
        Notifications.create_notification(users=users, content=message, title=title, current_user=self.request.user)
        return Response(status=200)


class NotificationMarkAsRead(generics.CreateAPIView):

    def post(self, request, *args, **kwargs):
        notification_id = kwargs.get('id')
        notification = Notifications.objects.get(id=notification_id)
        notification.read = True
        notification.save()
        return Response(status=200)
