"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import uuid
from time import time

from django import forms
from django.conf import settings
from django.contrib import auth, messages
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.images import get_image_dimensions
from django.core.mail import send_mail
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.models import Group

from rest_framework import status
from rest_framework.response import Response

from core.utils.common import load_func

from organizations.models import Organization, OrganizationMember
from organizations.functions import organization_token_generator

from workspace.models import Workspaces


def hash_upload(instance, filename):
    filename = str(uuid.uuid4())[0:8] + '-' + filename
    return settings.AVATAR_PATH + '/' + filename


def check_avatar(files):
    images = list(files.items())
    if not images:
        return None

    _, avatar = list(files.items())[0]  # get first file
    w, h = get_image_dimensions(avatar)
    if not w or not h:
        raise forms.ValidationError("Can't read image, try another one")

    # validate dimensions
    max_width = max_height = 1200
    if w > max_width or h > max_height:
        raise forms.ValidationError('Please use an image that is %s x %s pixels or smaller.' % (max_width, max_height))

    valid_extensions = ['jpeg', 'jpg', 'gif', 'png']

    filename = avatar.name
    # check file extension
    ext = os.path.splitext(filename)[1].lstrip('.').lower()
    if ext not in valid_extensions:
        raise forms.ValidationError('Please upload a valid image file with extensions: JPEG, JPG, GIF, or PNG.')

    # validate content type
    main, sub = avatar.content_type.split('/')
    if not (main == 'image' and sub.lower() in valid_extensions):
        raise forms.ValidationError('Please use a JPEG, GIF or PNG image.')

    # validate file size
    max_size = 1024 * 1024
    if len(avatar) > max_size:
        raise forms.ValidationError('Avatar file size may not exceed ' + str(max_size / 1024) + ' kb')

    return avatar


def save_user(request, next_page, user_form, organization):
    """Save user instance to DB"""
    user = user_form.save()
    user.username = user.email.split('@')[0]
    user.save()

    # if Organization.objects.exists():
    #     org = Organization.objects.first()
    #     org.add_user(user)
    # else:
    #     org = Organization.create_organization(created_by=user, title='Labelo')

    # org = Organization.create_organization(created_by=user, title=organization_title)


    org = organization

    org_member = OrganizationMember.objects.create(user=user, organization=org, status='active')
    org_member.role = 'pending'
    org_member.save()

    pending_group, created = Group.objects.get_or_create(name='pending')
    user.groups.add(pending_group)

    request.advanced_json = {
        'email': user.email,
        'allow_newsletters': user.allow_newsletters,
        'update-notifications': 1,
        'new-user': 1,
    }
    redirect_url = next_page if next_page else reverse('projects:project-index')



    """A new function is added to check if the user is in the pending group. 
    If the user is in the pending group, the next page will be set as the login 
    page in order to prevent direct login after creating an account."""

    if user.groups.filter(name='pending').exists():
        redirect_url = reverse('user-login')
    else:
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    user.active_organization = org
    user.save()
    return redirect(redirect_url)


def proceed_registration(request, user_form, organization, next_page):
    """Register a new user for POST user_signup"""
    # save user to db
    save_user = load_func(settings.SAVE_USER)
    response = save_user(request, next_page, user_form, organization)

    return response


def login(request, *args, **kwargs):
    request.session['last_login'] = time()
    return auth.login(request, *args, **kwargs)

def proceed_create_user(request, user_form, username, organization_title, next_page):
    """Create a new user, set up their organization, and handle post-creation logic."""
    # Save the user from the form
    user = user_form.save()
    user.username = username
    user.is_owner = True    
    user.save()

    # Create a new organization with the user as the creator
    org = Organization.create_organization(created_by=user, title=organization_title)

    org_member = OrganizationMember.objects.get(user=user, organization=org)
    org_member.status = 'active'
    org_member.role = 'owner'
    org_member.save()

    # Add the user to the 'owner' group and make them a superuser
    owner_group, created = Group.objects.get_or_create(name='owner')
    user.groups.add(owner_group)
    user.is_superuser = True
    user.save(update_fields=['is_superuser'])

    Workspaces.objects.create(title="Sandbox", created_by=user, organization=org)

    # Set advanced JSON data for further processing
    request.advanced_json = {
        'email': user.email,
        'allow_newsletters': user.allow_newsletters,
        'update-notifications': 1,
        'new-user': 1,
    }
    if settings.ACCOUNT_ACTIVATION is True:
        user.is_active = False
        user.save()
        send_activation_mail(request,user,org)
    else:
        # Determine the redirect URL
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    redirect_url = next_page if next_page else reverse('projects:project-index')

    user.active_organization = org
    user.save()

    # Redirect to the appropriate URL
    return redirect(redirect_url)


def create_user_with_email(request, email, role, org):
    """
    Create or update a user with the given email, role, and organization.

    Args:
        request: The request object.
        email (str): The email of the user.
        role (str): The role to be assigned to the user.
        org: The organization to associate with the user.

    Returns:
        Response: An HTTP response indicating success or failure.
        User: The created or updated user object on success.

    Raises:
        HTTP_400_BAD_REQUEST: If the specified role group does not exist or the organization member already exists.
    """
    from users.models import User

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        user = None

    try:
        user_group = Group.objects.get(name=role)
    except ObjectDoesNotExist:
        return Response({'error': 'The specified role group does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

    if user:

        try:
            org_member = OrganizationMember.objects.get(user=user, organization=org)
        except:
            org_member = None

        if org_member:

            if org_member.deleted_at:
                # org_member.deleted_at = None
                org_member.status='invited'
                org_member.role = role
                org_member.save()

                return user
            else:
                return Response({'error': 'The organization member already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.active_organization:
            user.active_organization = org
            user.groups.set([user_group])
            user.save()
    else:
        user = User.objects.create(email=email, active_organization=org, is_active=False)
        user.groups.add(user_group)

    OrganizationMember.objects.create(user=user, organization=org, role=role, status='invited')
    return user

def send_activation_mail(request,user, org):

    base_url = f"{request.scheme}://{request.get_host()}"
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = organization_token_generator.make_token(user, org.pk)
    org = urlsafe_base64_encode(force_bytes(org.pk))
    activation_url = '{}{}?org={}'.format(
        base_url,
        reverse('user-signup-activate', kwargs={'uidb64': uid, 'token': token}),org
    )
    html_message = render_to_string('users/activation_mail_template.html', {'invite_url': activation_url})
    subject = "Activate your account"
    email_from = settings.EMAIL_HOST_USER
    recipient_list = [user.email]

    send_mail(subject, '', email_from, recipient_list, html_message=html_message, fail_silently=False)

    redirect_url = reverse('user-login')
    messages.success(request, 'Account activation link has been sent to your email.')
    return redirect_url
