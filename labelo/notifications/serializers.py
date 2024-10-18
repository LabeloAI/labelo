from rest_framework import serializers
from notifications.models import Notifications
from rest_framework.fields import SerializerMethodField
from users.serializers import BaseUserSerializer


class NotificationSerializer(serializers.ModelSerializer):
    user = SerializerMethodField()
    class Meta:
        model = Notifications
        fields = "__all__"

    def get_user(self, obj):
        return BaseUserSerializer(obj.from_user).data

