from django.urls import include, path
from workspace import api

app_name = 'workspace'

_api_urlpatterns = [
    path('',api.WorkspacesListAPI.as_view(), name='workspace-list'),
    path('<int:pk>/',api.WorkspaceAPI.as_view(), name='workspace-detail'),
    path('<int:pk>/projects', api.WorkspaceProjectsAPI.as_view(), name='workspace-projects'),
    path('<int:pk>/members', api.WorkspaceMemberAPI.as_view(), name='workspace-members'),
]

urlpatterns = [
    path('api/workspaces/', include((_api_urlpatterns, app_name), namespace='api')),
]

