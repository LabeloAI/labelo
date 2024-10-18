from .views import project_dashboard
from django.urls import include, path
from . import api


_api_urlpatterns = [
    path('<int:pk>/dashboard_viewset', api.ProjectDashboardLayoutApi.as_view(),
         name='dashboard_viewset'),
    path('<int:pk>/dashboard', api.ProjectDashboardAPI.as_view(),
         name='project_dash'),
    path('<int:pk>/dashboard/chart', api.ProjectPerformanceAPI.as_view(),
         name='project_chart'),
]

urlpatterns = [
        path('api/projects/', include((_api_urlpatterns, "projects"),
                                  namespace='api_project')),
        path('projects/<int:pk>/dashboard/', project_dashboard, name='project-dashboard', kwargs={'sub_path': ''}),
        path('projects/<int:pk>/dashboard/<sub_path>', project_dashboard, name='project-dashboard-anything'),
]
