"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging   # noqa: I001
from typing import Optional

from rest_framework import permissions

from pydantic import BaseModel

import rules
from django.contrib.auth.models import Permission, Group

logger = logging.getLogger(__name__)


class AllPermissions(BaseModel):
    organizations_create = 'organizations.create'
    organizations_view = 'organizations.view'
    organizations_change = 'organizations.change'
    organizations_delete = 'organizations.delete'
    organizations_invite = 'organizations.invite'
    projects_create = 'projects.create'
    projects_view = 'projects.view'
    projects_change = 'projects.change'
    projects_delete = 'projects.delete'
    tasks_create = 'tasks.create'
    tasks_view = 'tasks.view'
    tasks_change = 'tasks.change'
    tasks_delete = 'tasks.delete'
    annotations_create = 'annotations.create'
    annotations_view = 'annotations.view'
    annotations_change = 'annotations.change'
    annotations_delete = 'annotations.delete'
    actions_perform = 'actions.perform'
    predictions_any = 'predictions.any'
    avatar_any = 'avatar.any'
    labels_create = 'labels.create'
    labels_view = 'labels.view'
    labels_change = 'labels.change'
    labels_delete = 'labels.delete'
    models_create = 'models.create'
    models_view = 'models.view'
    models_change = 'models.change'
    models_delete = 'models.delete'
    model_provider_connection_create = 'model_provider_connection.create'
    model_provider_connection_view = 'model_provider_connection.view'
    model_provider_connection_change = 'model_provider_connection.change'
    model_provider_connection_delete = 'model_provider_connection.delete'


all_permissions = AllPermissions()


class ViewClassPermission(BaseModel):
    GET: Optional[str] = None
    PATCH: Optional[str] = None
    PUT: Optional[str] = None
    DELETE: Optional[str] = None
    POST: Optional[str] = None


def make_perm(name, pred, overwrite=False):
    if rules.perm_exists(name):
        if overwrite:
            rules.remove_perm(name)
        else:
            return
    rules.add_perm(name, pred)


for _, permission_name in all_permissions:
    make_perm(permission_name, rules.is_authenticated)

class ProjectPermissions(permissions.BasePermission):

    """
    Custom permission class is created for controlling access to project-related API endpoints.

    This permission class checks the user's permissions based on the HTTP method used in the request.
    Users are allowed access if they have specific permissions for each method:
    - GET: 'projects.view_project'
    - POST: 'projects.add_project'
    - PUT, PATCH: 'projects.change_project'
    - DELETE: 'projects.delete_project'
    """

    def has_permission(self, request, view):
        if request.method == 'GET':
            return request.user.has_perm('projects.view_project')
        elif request.method == 'POST':
            return request.user.has_perm('projects.add_project')
        elif request.method in ['PUT', 'PATCH']:
            return request.user.has_perm('projects.change_project')
        elif request.method == 'DELETE':
            return request.user.has_perm('projects.delete_project')
        
class OrganizationPermissions(permissions.BasePermission):

    def has_permission(self, request, view):
        if request.method == 'GET':
            return request.user.has_perm('organizations.view_organization')
        elif request.method == 'POST':
            return request.user.has_perm('organizations.add_organization')
        elif request.method in ['PUT', 'PATCH']:
            return request.user.has_perm('organizations.change_organization')
        elif request.method == 'DELETE':
            return request.user.has_perm('organizations.delete_organization')
        
class OrganizationMemberPermissions(permissions.BasePermission):

    def has_permission(self, request, view):
        if request.method == 'GET':
            return request.user.has_perm('organizations.view_organizationmember')
        elif request.method == 'POST':
            return request.user.has_perm('organizations.add_organizationmember')
        elif request.method in ['PUT', 'PATCH']:
            return request.user.has_perm('organizations.change_organizationmember')
        elif request.method == 'DELETE':
            return request.user.has_perm('organizations.delete_organizationmember')
        
class TaskPermissions(permissions.BasePermission):

    def has_permission(self, request, view):
        if request.method == 'GET':
            return request.user.has_perm('tasks.view_task')
        elif request.method == 'POST':
            return request.user.has_perm('tasks.add_task')
        elif request.method in ['PUT', 'PATCH']:
            return request.user.has_perm('tasks.change_task')
        elif request.method == 'DELETE':
            return request.user.has_perm('tasks.delete_task')
        
class UserGroupsAndPermissions:
    """
    A class to create user groups and add necessary permissions.
    """

    def setup_groups_and_permissions(self):

        groups_permissions = {
            'manager': [
                'Can view project',
                'Can add project',
                'Can change project',
                'Can delete project',
                'Can view organization',
                'Can add organization',
                'Can view task',
                'Can add task',
                'Can change task',
                'Can delete task',
            ],
            'administrator': [
                'Can view project',
                'Can add project',
                'Can change project',
                'Can delete project',
                'Can view organization',
                'Can add organization',
                'Can change organization',
                'Can delete organization',
                'Can view organization member',
                'Can add organization member',
                'Can change organization member',
                'Can delete organization member',
                'Can view task',
                'Can add task',
                'Can change task',
                'Can delete task',
            ],
            'reviewer': [
                'Can view project',
                'Can view organization',
                'Can add organization',
                'Can view task',
                'Can change task',

            ],
            'annotater': [
                'Can view project',
                'Can view organization',
                'Can add organization',
                'Can view task',
                'Can change task',
            ],
            'pending': [
                'Can view project',
                'Can view organization'
            ],
            'no_org': [
                'Can view organization',
                'Can add organization'
            ]
        }

        for group_name, permission_names in groups_permissions.items():
            group, created = Group.objects.get_or_create(name=group_name)
            permissions = Permission.objects.filter(name__in=permission_names)
            group.permissions.set(permissions)
            group.save()

        other_groups = ['owner']
        for group_name in other_groups:
            Group.objects.get_or_create(name=group_name)

try:
    groups_and_permissions = UserGroupsAndPermissions()
    groups_and_permissions.setup_groups_and_permissions()


except Exception as e:

    print('-------------------------')
    print(e)
    print('-------------------------')
