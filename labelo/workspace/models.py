from django.db import models
from django.conf import settings
from projects.models import ProjectMember
from tasks.models import Annotation
from django.db.models.signals import post_save
from django.dispatch import receiver

# Create your models here.

class Workspaces(models.Model):

    title = models.CharField(null=True, blank=True, max_length=25)
    description = models.CharField(null=True, blank=True, max_length=100)
    color = models.CharField(null=True, blank=True, max_length=10)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, 
        related_name='created_workspaces',
        on_delete=models.SET_NULL,
        null=True)
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='workspaces', null=True
    )
    is_archived = models.BooleanField(default=False)

    def projects_count(self):
        return self.projects.count()
    
    def get_projects(self):
        return self.projects.all()
    

class WorkspaceMember(models.Model):

    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             related_name='workspace_members',
                             on_delete=models.SET_NULL,
                             null=True)
    workspace = models.ForeignKey(Workspaces, on_delete=models.CASCADE, 
                                   related_name='workspace_members')
                                   
    @staticmethod
    def delete_project_members(delete_choice, workspace, users):

        projects = workspace.get_projects()
        
        project_members = ProjectMember.objects.filter(project_id__in=projects, user_id__in=users)

        if delete_choice == 'DELETE_ALL':
            project_members.delete()

        if delete_choice == 'DELETE_EXCEPT_CONTRIBUTORS':

            members_to_exclude_ids = [
                member.id
                for member in project_members
                if Annotation.objects.filter(project=member.project, completed_by=member.user).exists()
            ]

            project_members_to_delete = project_members.exclude(id__in=members_to_exclude_ids)
            
            project_members_to_delete.delete()


@receiver(post_save, sender=WorkspaceMember)
def create_project_members(sender, instance=None, created=False, **kwargs):
    if created:

        projects = instance.workspace.get_projects()

        user = instance.user

        if projects:
            for project in projects:
                ProjectMember.objects.get_or_create(user=user, project=project)