from rest_framework import serializers
from workspace.models import Workspaces, WorkspaceMember
from users.serializers import BaseUserSerializer

class WorkspaceSerializer(serializers.ModelSerializer):

    projects_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspaces
        fields = ['id', 'title', 'description', 'color', 'created_by', 'projects_count', 'is_archived']

    def get_projects_count(self, obj):
        return obj.projects_count()
    

class WorkspacesMemberSerializer(serializers.ModelSerializer):

    user = BaseUserSerializer()

    class Meta:
        model = WorkspaceMember
        fields = '__all__'

