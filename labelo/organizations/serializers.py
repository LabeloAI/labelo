"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from collections import OrderedDict

import ujson as json

from drf_dynamic_fields import DynamicFieldsMixin

from rest_framework import serializers

from organizations.models import Organization, OrganizationMember
from users.serializers import UserSerializer, UserSimpleSerializer



class OrganizationIdSerializer(DynamicFieldsMixin, serializers.ModelSerializer):

    created_by = UserSimpleSerializer(read_only=True)
    current_user_role = serializers.SerializerMethodField()

    def get_current_user_role(self, instance):
        current_user = self.context.get('current_user')
        if not current_user:
            return None
        try:
            org_member = OrganizationMember.objects.get(user=current_user, organization=instance)
            return org_member.role.capitalize()
        except:
            return None

    class Meta:
        model = Organization
        fields = ['id', 'title', 'contact_info', 'users', 'created_by', 'current_user_role', 'created_at']
        extra_kwargs = {
            'created_by': {'read_only': True},  # Make sure it's read-only
        }


class OrganizationSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'


class OrganizationMemberSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = OrganizationMember
        fields = ['id', 'organization', 'user']


class UserSerializerWithProjects(UserSerializer):
    created_projects = serializers.SerializerMethodField(read_only=True)
    contributed_to_projects = serializers.SerializerMethodField(read_only=True)

    def get_created_projects(self, user):
        if not self.context.get('contributed_to_projects', False):
            return None

        current_user = self.context['request'].user
        return user.created_projects.filter(organization=current_user.active_organization).values('id', 'title')

    def get_contributed_to_projects(self, user):
        if not self.context.get('contributed_to_projects', False):
            return None

        current_user = self.context['request'].user
        projects = user.annotations.filter(project__organization=current_user.active_organization).values(
            'project__id', 'project__title'
        )
        contributed_to = [(json.dumps({'id': p['project__id'], 'title': p['project__title']}), 0) for p in projects]
        contributed_to = OrderedDict(contributed_to)  # remove duplicates without ordering losing
        return [json.loads(key) for key in contributed_to]

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ('created_projects', 'contributed_to_projects')


class OrganizationMemberUserSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    """Adds all user properties"""

    user = UserSerializerWithProjects()

    class Meta:
        model = OrganizationMember
        fields = ['id', 'organization', 'user', 'status', 'role']


class OrganizationInviteSerializer(serializers.Serializer):
    token = serializers.CharField(required=False)
    invite_url = serializers.CharField(required=False)


class OrganizationsParamsSerializer(serializers.Serializer):
    active = serializers.BooleanField(required=False, default=False)
    contributed_to_projects = serializers.BooleanField(required=False, default=False)
