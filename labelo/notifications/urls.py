from django.urls import path

from notifications.api import NotificationListApi, NotificationMarkAsRead

urlpatterns = [
    path('api/notifications', NotificationListApi.as_view(), name="notifications"),
    path('api/notification/read/<int:id>', NotificationMarkAsRead.as_view(), name="notification_read"),
]
