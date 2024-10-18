from functools import wraps

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.crypto import salted_hmac, constant_time_compare
from django.utils.encoding import force_bytes
from django.utils.http import (base36_to_int, urlsafe_base64_encode, int_to_base36)
from django.views.decorators.cache import never_cache

from core.utils.common import temporary_disconnect_all_signals
from organizations.models import Organization, OrganizationMember
from projects.models import Project


def create_organization(title, created_by):
    with transaction.atomic():
        org = Organization.objects.create(title=title, created_by=created_by)
        OrganizationMember.objects.create(user=created_by, organization=org)
        return org


def destroy_organization(org):
    with temporary_disconnect_all_signals():
        Project.objects.filter(organization=org).delete()
        if hasattr(org, 'saml'):
            org.saml.delete()
        org.delete()

def create_activation_url(user, base_url, org):

    """
    Creates an activation URL for the provided user using the given base URL.

    Args:
        user: A user object for whom the activation URL is to be created.
        base_url (str): The base URL to which the activation endpoint will be appended.

    Returns:
        str: The complete activation URL.

    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = organization_token_generator.make_token(user, org.pk)
    org = urlsafe_base64_encode(force_bytes(org.pk))
    activation_url = '{}{}?org={}'.format(
        base_url,
        reverse('user-activate', kwargs={'uidb64': uid, 'token': token}),
        org
    )

    # activation_url = '{}{}/uidb64={}/token={}&org={}'.format(base_url, reverse('user-activate'), uid, token, org)

    return activation_url


def send_activation_email(recipient_email, role, host_user, activation_url, host_user_org):
    """
    Sends an activation email to the provided recipient with the activation URL.

    Args:
        recipient_email (str): The email address of the recipient.
        role (str): The role assigned to the user being activated.
        host_user (User): The user sending the activation email.
        activation_url (str): The URL for activating the user account.
        host_user_org (Organization): The organization to which the host user belongs.

    """
    html_message = render_to_string('organizations/invite_mail_template.html', {'role': role,
                                                                                 'user': host_user,
                                                                                 'invite_url': activation_url,
                                                                                 'org': host_user_org.title})
    subject = "Activate Your Account on Labelo"
    email_from = settings.EMAIL_HOST_USER
    recipient_list = [recipient_email]

    send_mail(subject, '', email_from, recipient_list, html_message=html_message, fail_silently=False)


class OrganizationInviteToken(PasswordResetTokenGenerator):
    """
    Token generator class for creating and validating organization member invitation tokens.

    This class extends PasswordResetTokenGenerator to include organization-specific information in the token.
    """

    def _make_hash_value(self, user, timestamp, organization_id):
        return f"{user.pk}{timestamp}{user.is_active}{organization_id}"

    def _make_token_with_timestamp(self, user, timestamp, organization_id):
        ts_b36 = int_to_base36(timestamp)
        hash_value = self._make_hash_value(user, timestamp, organization_id)
        hash = salted_hmac(
            self.key_salt,
            hash_value,
            secret=self.secret,
        ).hexdigest()[::2]
        return f"{ts_b36}-{hash}"

    def make_token(self, user, organization_id):
        timestamp = self._num_seconds(self._now())
        return self._make_token_with_timestamp(user, timestamp, organization_id)

    def check_token(self, user, token, organization_id, invited=False):
        if not (user and token):
            return False, "User or token missing"
        
        try:
            ts_b36, hash = token.split("-")
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False, "Invalid token format"
        
        try:
            org_member = OrganizationMember.objects.get(user=user, organization=organization_id)
        except OrganizationMember.DoesNotExist:
            return False, "Organization member not found"

        # Check if the token is expired
        if (self._num_seconds(self._now()) - ts) > settings.INVITATION_TOKEN_EXPIRY:
            return False, "Token expired"
        
        if org_member.status != 'invited' and invited:
            return False, "Account already activated"

        expected_token = self._make_token_with_timestamp(user, ts, organization_id)
        if not constant_time_compare(expected_token, token):
            return False, "Token does not match"

        return True, None


organization_token_generator = OrganizationInviteToken()

def organization_required():
    def decorator(view):
        @wraps(view)
        @never_cache
        def _wrapped_view(request, *args, **kwargs):
            user = request.user
            if user.is_authenticated:
                org_members = OrganizationMember.objects.filter(user=user, deleted_at__isnull=True)
                if not org_members.exists() or user.active_organization is None:
                    return redirect(reverse('organizations:organization-warning'))
            return view(request, *args, **kwargs)
        return _wrapped_view
    return decorator
