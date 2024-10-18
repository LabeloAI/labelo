from django.urls import include, path

from . import api
app_name = 'projects_template'

_api_urlpatterns = [
    path('', api.ProjectTemplateViewSet.as_view(), name='project-template'),
    path('<int:pk>/', api.ProjectTemplateDetails.as_view(), name='project-template-detail'),
    path('create_project', api.CreateProjectFromTemplate.as_view(), name='project-from-template'),
    ]

urlpatterns = [
    path('api/project_templates/', include((_api_urlpatterns, app_name), namespace='api-project-templates')),
]