from django.db import models
from django.db.models import JSONField

# Create your models here.

class ProjectDashboardLayout(models.Model):
    """Dashboard model to store the layout and configuration of widgets on a dashboard.
    The layout information is stored in a JSON field."""

    project = models.OneToOneField(
        'projects.Project',
        related_name='project_dashboard',
        on_delete=models.CASCADE,
        unique=True,
        help_text='Project ID for dashboard',
    )
    overview_layout = JSONField(
        'Overview Layout',
        default=list,
        help_text='Data of layout parameters of overview of project '
                  'dashboard.',
    )
    performance_layout = JSONField(
        'Performance Layout',
        default=list,
        help_text='Data of layout parameters of performance part of '
                  'dashboard.',
    )

    class Meta:
        db_table = 'project_dashboard'

    def __str__(self):
        return f"Dashboard {self.id} for project {self.project_id}"

