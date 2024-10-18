from rest_framework import filters, generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from workspace.serializers import WorkspaceSerializer, WorkspacesMemberSerializer
from workspace.models import Workspaces, WorkspaceMember
from projects.models import Project
from rest_framework.permissions import IsAuthenticated
from users.models import User
from django.shortcuts import get_object_or_404

from projects.serializers import ProjectSerializer
from rest_framework.response import Response
from django.db.models import Q

class WorkspacesListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = WorkspaceSerializer
    
    def get_queryset(self):
        workspaces = Workspaces.objects.filter(organization=self.request.user.active_organization)

        if self.request.user.groups.filter(Q(name='annotator') | Q(name='reviewer') | Q(name='manager')).exists():
            
            workspace_ids = WorkspaceMember.objects.filter(user=self.request.user).values_list('workspace_id', flat=True)
            workspaces = workspaces.filter(id__in=workspace_ids)

        return workspaces

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, organization=self.request.user.active_organization)

class WorkspaceAPI(generics.RetrieveUpdateDestroyAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Workspaces.objects.all()
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]
    # lookup_field = 'pk'

    # def get_queryset(self):
    #     return Workspaces.objects.all()

class WorkspaceProjectsAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs.get('pk')
        try:
            workspace = Workspaces.objects.get(id=workspace_id)
        except Workspaces.DoesNotExist:
            return Project.objects.none()  # Return an empty queryset if workspace doesn't exist
        return workspace.projects.all()

class WorkspaceMemberAPI(generics.ListCreateAPIView):
    serializer_class = WorkspacesMemberSerializer

    def get_queryset(self):
        workspace_id = self.kwargs.get('pk') 
        if workspace_id:
            workspace = get_object_or_404(Workspaces, id=workspace_id)
            return WorkspaceMember.objects.filter(workspace=workspace)
        return WorkspaceMember.objects.none()

    def post(self, request, *args, **kwargs):
        workspace_id = kwargs.get('pk') 
        users = request.data.get('users', [])
        delete_choice = request.data.get('delete_choice', '')

        workspace = get_object_or_404(Workspaces, id=workspace_id)
        users_obj = User.objects.filter(id__in=users)

        for user in users_obj:
            WorkspaceMember.objects.get_or_create(user=user, workspace=workspace)

        excluded_users = WorkspaceMember.objects.filter(workspace=workspace).exclude(user__in=users_obj)
        if excluded_users.exists():
            excluded_user_ids = list(excluded_users.values_list('user_id', flat=True))
            excluded_users.delete()
            WorkspaceMember.delete_project_members(delete_choice, workspace, excluded_user_ids)


        return Response({"detail": "Workspace members updated successfully."}, status=200)

