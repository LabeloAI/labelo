from django.db import models
from core.consumer import send_notification


class Notifications(models.Model):
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        help_text='Project ID for this notification',
    )
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    from_user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='my_notifications', null=True)
    notification = models.TextField()
    title = models.CharField(max_length=255, default="")
    read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now=True)

    def send(self):
        from notifications.serializers import NotificationSerializer
        group_name = f"user_{self.user.id}"
        notification_data = {
            "type": "notification",
            **NotificationSerializer(instance=self).data,
        }
        send_notification(notification_data, group_name)

    @staticmethod
    def create_notification(users, content, title, current_user=None, project=None):
        for user in users:
            notif = Notifications(from_user=current_user, project=project,
                                  user=user, notification=content, title=title)
            notif.save()
            notif.send()
