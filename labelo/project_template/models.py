from django.db import models
from django.utils.translation import gettext_lazy as _

from users.models import User

class ProjectTemplate(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)

    label_config = models.TextField(_('label config'), blank=True,
                                    null=True, default='<View></View>')
    expert_instruction = models.TextField(blank=True)
    show_instruction = models.BooleanField(default=False)
    show_skip_button = models.BooleanField(default=True)
    sampling = models.CharField(max_length=50, default='uniform')
    color = models.CharField(max_length=7, blank=True)
    skip_queue = models.CharField(max_length=100, default="REQUEUE_FOR_OTHERS")
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE,
        related_name='projects_template', null=True
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        db_table = 'project_template'
        indexes = [
            models.Index(fields=['id']),
            # models.Index(fields=['reviewer']),
        ]


    def __str__(self):
        return self.name