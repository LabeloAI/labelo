"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.conf import settings
from django.contrib.auth.models import Group
from django.db import transaction
from django.db.models import Q
from django.urls import reverse
from django.utils.decorators import method_decorator

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from rest_framework import generics, status, filters
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django_filters.rest_framework import DjangoFilterBackend

from core.feature_flags import flag_set
from core.mixins import GetParentObjectMixin
from core.permissions import OrganizationPermissions, OrganizationMemberPermissions
from core.utils.common import load_func

from labelo.core.permissions import all_permissions
from labelo.core.utils.params import bool_from_request

from organizations.functions import create_activation_url, send_activation_email
from organizations.models import Organization, OrganizationMember
from organizations.serializers import (
    OrganizationIdSerializer,
    OrganizationInviteSerializer,
    OrganizationMemberUserSerializer,
    OrganizationSerializer,
    OrganizationsParamsSerializer,
)

from projects.models import Project
from workspace.models import Workspaces

from users.functions import create_user_with_email
from users.models import User
from users.serializers import UserSimpleSerializer


logger = logging.getLogger(__name__)

HasObjectPermission = load_func(settings.MEMBER_PERM)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary='List your organizations',
        operation_description="""
        Return a list of the organizations you've created or that you have access to.
        """,
    ),
)
class OrganizationListAPI(generics.ListCreateAPIView):
    queryset = Organization.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    # permission_required = ViewClassPermission(
    #     GET=all_permissions.organizations_view,
    #     PUT=all_permissions.organizations_change,
    #     POST=all_permissions.organizations_create,
    #     PATCH=all_permissions.organizations_change,
    #     DELETE=all_permissions.organizations_change,
    # )
    serializer_class = OrganizationIdSerializer
    permission_classes = [OrganizationPermissions]

    def get_serializer_context(self):

        return {
            'current_user': self.request.user
        }

    def filter_queryset(self, queryset):
        return queryset.filter(
            organizationmember__in=self.request.user.om_through.filter(deleted_at__isnull=True)
        ).distinct()

    def get(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).get(request, *args, **kwargs)
    
    def perform_create(self, serializer):

        user = self.request.user
        organization = serializer.save(created_by=user)
        OrganizationMember.objects.create(user=user, organization=organization, role='owner', status='active')
        user.is_owner = True
        if not user.active_organization:
            user.active_organization = organization
        user.save()
    
        Workspaces.objects.create(title="Sandbox", created_by=user, organization=organization)
        
    def post(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).post(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def post(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).post(request, *args, **kwargs)


class OrganizationMemberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'

    def get_page_size(self, request):
        # emulate "unlimited" page_size
        if (
            self.page_size_query_param in request.query_params
            and request.query_params[self.page_size_query_param] == '-1'
        ):
            return 1000000
        return super().get_page_size(request)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary='Get organization members list',
        operation_description='Retrieve a list of the organization members and their IDs.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this organization.',
            ),
        ],
    ),
)
class OrganizationMemberListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    # permission_required = ViewClassPermission(
    #     GET=all_permissions.organizations_view,
    #     PUT=all_permissions.organizations_change,
    #     PATCH=all_permissions.organizations_change,
    #     DELETE=all_permissions.organizations_change,
    # )
    permission_classes = [OrganizationMemberPermissions]
    serializer_class = OrganizationMemberUserSerializer
    pagination_class = OrganizationMemberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status','role']
    search_fields = ['user__username', 'user__email'] 

    def get_serializer_context(self):
        return {
            'contributed_to_projects': bool_from_request(self.request.GET, 'contributed_to_projects', False),
            'request': self.request,
            'current_organization': self.request.user.active_organization,
        }

    def get_queryset(self):
        org = generics.get_object_or_404(self.request.user.organizations, pk=self.kwargs[self.lookup_field])
        if flag_set('fix_backend_dev_3134_exclude_deactivated_users', self.request.user):
            serializer = OrganizationsParamsSerializer(data=self.request.GET)
            serializer.is_valid(raise_exception=True)
            active = serializer.validated_data.get('active')

            # return only active users (exclude DISABLED and NOT_ACTIVATED)
            if active:
                return org.members.filter(Q(deleted_at__isnull=True) | Q(deleted_at__isnull=False, status='invited')).order_by('user__username')

            # organization page to show all members
            return org.members.filter(Q(deleted_at__isnull=True) | Q(deleted_at__isnull=False, status='invited')).order_by('user__username')
        else:
            return org.members.filter(Q(deleted_at__isnull=True) | Q(deleted_at__isnull=False, status='invited')).order_by('user__username')
            

@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary='Soft delete an organization member',
        operation_description='Soft delete a member from the organization.',
        manual_parameters=[
            openapi.Parameter(
                name='pk',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this organization.',
            ),
            openapi.Parameter(
                name='user_pk',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying the user to be deleted from the organization.',
            ),
        ],
        responses={
            204: 'Member deleted successfully.',
            405: 'User cannot soft delete self.',
            404: 'Member not found',
        },
    ),
)


class OrganizationDeleteAPI(generics.DestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer

    def delete(self, request, *args, **kwargs):
        user = request.user
        organization_id = kwargs.get('pk')
        
        # Get the organization instance
        org = get_object_or_404(Organization, id=organization_id)
        
        # Ensure the user is the creator of the organization
        if org.created_by != user:
            raise PermissionDenied("You do not have permission to delete this organization.")
        
        with transaction.atomic():
            try:
                # Update user's active organization before deleting the organization
                org_members = OrganizationMember.objects.filter(user=user, deleted_at__isnull=True).exclude(organization=org)
                user.active_organization = org_members.first().organization if org_members.exists() else None
                user.save(update_fields=['active_organization'])

                projects = Project.objects.filter(organization=org)
                for project in projects:
                    project.delete()
                
                org.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Exception as e:
                logger.error("Error deleting organization: %s", e)
                return Response({'error': 'An error occurred while deleting the organization'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class OrganizationMemberDetailAPI(GetParentObjectMixin, generics.RetrieveDestroyAPIView):
    # permission_required = ViewClassPermission(
    #     DELETE=all_permissions.organizations_change,
    # )
    permission_classes = [OrganizationMemberPermissions]
    parent_queryset = Organization.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsAuthenticated, HasObjectPermission)
    serializer_class = OrganizationMemberUserSerializer  # Assuming this is the right serializer
    http_method_names = ['delete']

    def delete(self, request, pk=None, user_pk=None):
        # org = self.get_parent_object()
        # if org != request.user.active_organization:
        #     raise PermissionDenied('You can delete members only for your current active organization')

        org = get_object_or_404(Organization, pk=pk)
        user = get_object_or_404(User, pk=user_pk)
        member = get_object_or_404(OrganizationMember, user=user, organization=org)
        if member.deleted_at is not None:
            raise NotFound('Member not found')

        # if member.user_id == request.user.id:
        #     return Response({'detail': 'User cannot soft delete self'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

        member.soft_delete()
        return Response(status=204)  # 204 No Content is a common HTTP status for successful delete requests


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary=' Get organization settings',
        operation_description='Retrieve the settings for a specific organization by ID.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary='Update organization settings',
        operation_description='Update the settings for a specific organization by ID.',
    ),
)
class OrganizationAPI(generics.RetrieveUpdateAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Organization.objects.all()
    # permission_required = all_permissions.organizations_change

    permission_classes = [OrganizationMemberPermissions]
    serializer_class = OrganizationSerializer

    redirect_route = 'organizations-dashboard'
    redirect_kwarg = 'pk'

    def get(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).put(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Invites'],
        operation_summary='Get organization invite link',
        operation_description='Get a link to use to invite a new member to an organization in Labelo.',
        responses={200: OrganizationInviteSerializer()},
    ),
)
class OrganizationInviteAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_change

    def get(self, request, *args, **kwargs):
        org = request.user.active_organization
        invite_url = '{}?token={}'.format(reverse('user-invite'), org.token)
        if hasattr(settings, 'FORCE_SCRIPT_NAME') and settings.FORCE_SCRIPT_NAME:
            invite_url = invite_url.replace(settings.FORCE_SCRIPT_NAME, '', 1)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=200)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Invites'],
        operation_summary='Reset organization token',
        operation_description='Reset the token used in the invitation link to invite someone to an organization.',
        responses={200: OrganizationInviteSerializer()},
    ),
)
class OrganizationResetTokenAPI(APIView):
    permission_required = all_permissions.organizations_invite
    parser_classes = (JSONParser,)

    def post(self, request, *args, **kwargs):
        org = request.user.active_organization
        org.reset_token()
        logger.debug(f'New token for organization {org.pk} is {org.token}')
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=201)
    
    
class OrganizationMemberUpdate(generics.UpdateAPIView):
    """
    A view to update user role when a user makes an API call from the frontend.
    """

    queryset = User.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = UserSimpleSerializer

    permission_classes = [OrganizationMemberPermissions]

    def patch(self, request, *args, **kwargs):
        """
        Partially updates a user's group membership within an organization.

        Expects 'group' in the request data, which is the new role for the user.
        The user ID is taken from the URL parameters as 'user_id'.
        The organization ID is taken from the URL parameters as 'pk'.
        """
        group_name = request.data.get('group')
        user_id = kwargs.get('user_id')
        organization_id = kwargs.get('pk')

        # Retrieve the user and organization member instance
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            org_member = OrganizationMember.objects.get(user=user, organization=organization_id)
        except OrganizationMember.DoesNotExist:
            return Response({'error': 'Organization member not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Update the role
        org_member.role = group_name
        org_member.save()

        org = Organization.objects.get(id=organization_id)
        if user.active_organization == org:
            if user.is_owner and group_name != 'owner':
                user.is_superuser = False
                user.save()

            try:
                group_obj = Group.objects.get(name=group_name)
            except Group.DoesNotExist:
                return Response({'error': f'Group "{group_name}" does not exist'}, status=status.HTTP_400_BAD_REQUEST)

            user.groups.set([group_obj])

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SendEmailAPIView(APIView):
    """
    A view to send signup invitation emails to users.

    This view handles the process of inviting new users by email.
    It expects a POST request with 'email' and 'role' in the data.
    """

    def post(self, request, *args, **kwargs):
        """
        Handles the POST request to send a signup invitation email.

        Extracts the recipient email and role from the request data, 
        creates a new user, generates an activation URL, 
        and sends an activation email.

        Parameters:
        - request: The HTTP request object.

        Returns:
        - Response: A response object with a success message and HTTP status 201 if the email is sent successfully,
          or an error message and HTTP status 500 if an exception occurs.
        """
        try:
            recipient_email = request.data.get('email')
            role = request.data.get('role')
            base_url = f"{request.scheme}://{request.get_host()}"
            host_user = request.user.email
            host_user_org = request.user.active_organization

            response = create_user_with_email(request, recipient_email, role, host_user_org)

            if isinstance(response, Response):
                return response
            new_user = response
            

            activation_url = create_activation_url(new_user, base_url, host_user_org)
            send_activation_email(recipient_email, role, host_user, activation_url, host_user_org)

            return Response({'message': 'Email sent successfully.'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
class ResendEmailAPI(APIView):
    """
    API endpoint to resend activation email to a user.

    Expects a POST request with 'user' in the data, which should be the user's ID.
    The email is sent to the user's email address with a new activation URL.
    """

    def post(self, request, *args, **kwargs):
        try:
            user_id = request.data.get('user')
            org = request.user.active_organization
            base_url = f"{request.scheme}://{request.get_host()}"

            user = User.objects.get(id=user_id)
            org_member = OrganizationMember.objects.get(user=user, organization=org)

            if org_member.status != 'invited':
                return Response({'error': 'Mail only resent to invited users'}, status=status.HTTP_400_BAD_REQUEST)

            activation_url = create_activation_url(user, base_url, org)
            send_activation_email(user.email, org_member.role, request.user, activation_url, org)

            return Response({'message': 'Email sent successfully.'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class RevokInvitationAPIView(APIView):
    """
    API endpoint to revoke a user's invitation to an organization.

    Expects a POST request with 'user' in the data, which should be the user's ID.
    The user's organization membership is deleted, effectively revoking their invitation.
    """

    def post(self, request, *args, **kwargs):

        try:

            user_id = request.data.get('user')
            organization = request.user.active_organization

            user = User.objects.get(id=user_id)
            org_member = OrganizationMember.objects.get(user=user, organization=organization)

            if org_member.status != 'invited':
                return Response({'error': 'Only invited members are revoked'}, status=status.HTTP_400_BAD_REQUEST)
            org_member.delete()

            return Response({'message': 'Email revoked successfully.'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
class SwitchOrganizationAPI(APIView):
        
    """
    API endpoint to allow users to switch their active organization.

    Methods
    -------
    patch(request, *args, **kwargs)
        Handles the PATCH request to switch the user's active organization.
    """

    def patch(self, request, *args, **kwargs):
        user_id = kwargs.get('pk')
        organization_id = request.data.get('organization_id')

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            organization = Organization.objects.get(pk=organization_id)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found.'}, status=status.HTTP_404_NOT_FOUND)


        if request.user != user:
            return Response({'error': 'Only users are able to switch their organization.'}, status=status.HTTP_403_FORBIDDEN)


        if not OrganizationMember.objects.filter(user=user, organization=organization).exists():
            return Response({'error': 'No Organization Member found with the provided user and organization.'}, status=status.HTTP_404_NOT_FOUND)
 
        user.active_organization = organization

        # new_org_member = OrganizationMember.objects.get(user=user, organization=organization)
        # group = Group.objects.get(name=new_org_member.role)

        # user.groups.set([group])
        
        # if user.is_owner and new_org_member.role == 'owner':
        #     user.is_superuser = True
        # else:
        #     user.is_superuser = False

        user.save()

        return Response({'message': 'Active organization updated successfully.'}, status=status.HTTP_200_OK)
