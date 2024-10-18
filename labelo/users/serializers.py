"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from django.contrib.auth.models import Group

from rest_framework import serializers
from rest_flex_fields import FlexFieldsModelSerializer

from core.feature_flags import flag_set
from core.utils.common import load_func
from core.utils.db import fast_first

from organizations.models import OrganizationMember

from users.models import User


class GroupSimplerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ('id', 'name')


class BaseUserSerializer(FlexFieldsModelSerializer):
    # short form for user presentation
    initials = serializers.SerializerMethodField(default='?', read_only=True)
    avatar = serializers.SerializerMethodField(read_only=True)
    groups = GroupSimplerSerializer(many=True)
    active_org_role = serializers.SerializerMethodField()
    active_org_status = serializers.SerializerMethodField()

    def get_active_org_status(self, instance):
        current_org = self.context.get('current_organization')
        if not current_org:
            return None
        try:
            org_member = OrganizationMember.objects.get(user=instance, organization=current_org)
            if org_member.status == 'invited':
                return org_member.status.capitalize()
            elif instance.active_organization == current_org:
                return 'Active'
            else:
                return 'In Active'
        except:
            return None
    def get_active_org_role(self, instance):
        current_org = self.context.get('current_organization')
        if not current_org:
            return None
        try:
            org_member = OrganizationMember.objects.get(user=instance, organization=current_org)
            return org_member.role.capitalize()
        except:
            return None

    def get_avatar(self, instance):
        return instance.avatar_url

    def get_initials(self, instance):
        if flag_set('fflag_feat_all_optic_114_soft_delete_for_churned_employees', user=instance):
            return instance.get_initials(self._is_deleted(instance))
        else:
            return instance.get_initials()

    def _is_deleted(self, instance):
        if organization_members := self.context.get('organization_members', None):
            # Finds the first organization_member matching the instance's id. If not found, set to None.
            organization_member_for_user = next(
                (
                    organization_member
                    for organization_member in organization_members
                    if organization_member.user_id == instance.id
                ),
                None,
            )
        else:
            if 'user' in self.context:
                org_id = self.context['user'].active_organization_id
            elif 'request' in self.context:
                org_id = self.context['request'].user.active_organization_id
            else:
                org_id = None

            if not org_id:
                return False

            organization_member_for_user = fast_first(
                OrganizationMember.objects.filter(user_id=instance.id, organization_id=org_id)
            )
            if not organization_member_for_user:
                return True
                    # Check if the organization member is invited and not deleted
            if organization_member_for_user.status == 'invited':
                return False
        return bool(organization_member_for_user.deleted_at)

    def to_representation(self, instance):
        """Returns user with cache, this helps to avoid multiple s3/gcs links resolving for avatars"""

        uid = instance.id
        key = 'user_cache'

        if key not in self.context:
            self.context[key] = {}
        if uid not in self.context[key]:
            self.context[key][uid] = super().to_representation(instance)

        # if flag_set('fflag_feat_all_optic_114_soft_delete_for_churned_employees', user=instance):
        if self._is_deleted(instance):
            for field in ['username', 'first_name', 'last_name', 'email']:
                self.context[key][uid][field] = 'User' if field == 'last_name' else 'Deleted'

        return self.context[key][uid]

    class Meta:
        model = User
        fields = (
            'id',
            'first_name',
            'last_name',
            'username',
            'email',
            'last_activity',
            'avatar',
            'initials',
            'phone',
            'active_organization',
            'active_org_role',
            'active_org_status',
            'allow_newsletters',
            'groups',
        )


class BaseUserSerializerUpdate(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        read_only_fields = ('email',)


class UserSimpleSerializer(BaseUserSerializer):
    groups = GroupSimplerSerializer(many=True)
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email', 'avatar', 'groups')


UserSerializer = load_func(settings.USER_SERIALIZER)
UserSerializerUpdate = load_func(settings.USER_SERIALIZER_UPDATE)
