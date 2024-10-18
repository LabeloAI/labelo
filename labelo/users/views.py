"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.conf import settings
from django.contrib import auth
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect, render, reverse
from django.utils.http import is_safe_url, urlsafe_base64_decode
from django.contrib.auth.views import PasswordResetView, PasswordResetConfirmView
from django.urls import reverse_lazy
from django.contrib import messages

from rest_framework.authtoken.models import Token

from core.middleware import enforce_csrf_checks
from core.utils.common import load_func

from organizations.forms import OrganizationSignupForm
from organizations.models import Organization, OrganizationMember
from organizations.functions import organization_token_generator, organization_required

from users import forms
from users.functions import login, proceed_registration, proceed_create_user
from users.models import User
from django.contrib.auth.models import Group


logger = logging.getLogger()


@login_required
def logout(request):
    auth.logout(request)
    if settings.HOSTNAME:
        redirect_url = settings.HOSTNAME
        if not redirect_url.endswith('/'):
            redirect_url += '/'
        return redirect(redirect_url)
    return redirect('/')


@enforce_csrf_checks
def user_invite(request):
    """Invitation page"""
    user = request.user 
    next_page = request.GET.get('next')
    token = request.GET.get('token')

    # checks if the URL is a safe redirection.
    if not next_page or not is_safe_url(url=next_page, allowed_hosts=request.get_host()):
        next_page = reverse('projects:project-index')

    user_form = forms.UserSignupForm()
    organization_form = OrganizationSignupForm()

    if token:
        try:
            organization = Organization.objects.get(token=token)
        except Organization.DoesNotExist:
            messages.error(request, "Invalid token")
            return render(request,'users/user_invite.html',{
                        'token_invalid': True
                    })
    else:
        messages.error(request, "No token found in the invitation URL.")
        return render(request,'users/user_invite.html',{
                    'token_invalid': True
                })

    if user.is_authenticated:
        try :
            org_member = OrganizationMember.objects.get(user=user, organization=organization)
        except:
            org_member = False

        if org_member:

            if org_member.deleted_at:
                org_member.deleted_at = None
                org_member.role = 'pending'
                org_member.status = 'active'
                org_member.save()

            user.active_organization = organization
            user.save()

            try:
                group = Group.objects.get(name=org_member.role)
            except:
                group = None

            if user.is_owner and org_member.role == 'owner':
                user.is_superuser = True
            else:
                user.is_superuser = False
            user.groups.set([group])
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect(next_page)

        else:
            org_member = OrganizationMember.objects.create(user=user, organization=organization, role='pending')
            group = Group.objects.get(name='pending')
            user.active_organization = organization
            user.groups.set([group])
            user.save()
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect(next_page)


    # if user.is_authenticated:
    #     return redirect(next_page)

    # make a new user
    if request.method == 'POST':

        # organization = Organization.objects.first()
        if settings.DISABLE_SIGNUP_WITHOUT_LINK is True:
            if not (token and organization and token == organization.token):
                raise PermissionDenied()
        else:
            if token and organization and token != organization.token:
                raise PermissionDenied()

        user_form = forms.UserSignupForm(request.POST)
        organization_form = OrganizationSignupForm(request.POST)

        if user_form.is_valid():
            redirect_response = proceed_registration(request, user_form, organization, next_page)
            if redirect_response:
                messages.success(request, "Account created successfully")
                return redirect_response
        else:
            for field, errors in user_form.errors.items():
                for error in errors:
                    messages.error(request, f'{error}')


    return render(
        request,
        'users/user_invite.html',
        {
            'user_form': user_form,
            'organization_form': organization_form,
            'next': next_page,
            'token': token,
            'organization': organization.title,
        },
    )


@enforce_csrf_checks
def user_login(request):
    """Login page"""
    user = request.user
    next_page = request.GET.get('next')
    token = request.GET.get('token')

    if not token:
        hide_toggler = True

    # checks if the URL is a safe redirection.
    if not next_page or not is_safe_url(url=next_page, allowed_hosts=request.get_host()):
        next_page = reverse('projects:project-index')

    login_form = load_func(settings.USER_LOGIN_FORM)
    form = login_form()

    if user.is_authenticated:
        return redirect(next_page)

    if request.method == 'POST':
        form = login_form(request.POST)
        if form.is_valid():
            user = form.cleaned_data['user']
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            if form.cleaned_data['persist_session'] is not True:
                # Set the session to expire when the browser is closed
                request.session['keep_me_logged_in'] = False
                request.session.set_expiry(0)
            # user is organization member
            if (not user.active_organization or 
                not OrganizationMember.objects.filter(user=user, organization=user.active_organization).exists()):

                org_pk = Organization.find_by_user(user).pk
                user.active_organization_id = org_pk
                user.save(update_fields=['active_organization'])
            return redirect(next_page)
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{error}')
                    
    return render(request, 'users/user_login.html', {'form': form, 'next': next_page})


@login_required
def user_account(request):
    user = request.user

    if user.active_organization is None and 'organization_pk' not in request.session:
        return redirect(reverse('main'))

    form = forms.UserProfileForm(instance=user)
    token = Token.objects.get(user=user)

    if request.method == 'POST':
        form = forms.UserProfileForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            return redirect(reverse('user-account'))

    return render(
        request,
        'users/user_account.html',
        {'settings': settings, 'user': user, 'user_profile_form': form, 'token': token},
    )

@enforce_csrf_checks
def user_signup(request):  
    user = request.user
    next_page = request.GET.get('next')
    token = request.GET.get('token')

    # checks if the URL is a safe redirection.
    if not next_page or not is_safe_url(url=next_page, allowed_hosts=request.get_host()):
        next_page = reverse('projects:project-index')

    user_form = forms.UserCreateForm()

    if user.is_authenticated:
        return redirect(next_page)

    if request.method == 'POST':

        user_form = forms.UserCreateForm(request.POST)

        if user_form.is_valid():
            organization_title = request.POST.get('organization_name')
            username = request.POST.get('name')
            redirect_response = proceed_create_user(request, user_form, username, organization_title, next_page)
            if redirect_response:
                print
                return redirect_response
        else:
            for field, errors in user_form.errors.items():
                for error in errors:
                    messages.error(request, f'{error}')
    account_activation = settings.ACCOUNT_ACTIVATION
    return render(request,'users/user_signup.html',{
                'user_form': user_form,
                'next': next_page,
                'token': token,
                'account_activation': account_activation
            },)

@enforce_csrf_checks
def activate_user(request, uidb64, token):
    """
    Activates a user based on a token received via GET parameters and assigns them to an organization.

    Args:
        request (HttpRequest): The HTTP request object containing GET parameters 'uidb64', 'token', and 'org'.

    Returns:
        HttpResponse: Redirects to different pages based on the activation status, or renders the activation form.
    """
    if request.user.is_authenticated:
        auth.logout(request)
    org_id = request.GET.get('org', None)
    form = None
    is_invalid = False

    if org_id is None:
        messages.error(request, "The invitation link is invalid or has expired. Please request a new link")
        return render(request, 'users/user_activate.html', {
            'token_invalid': False,
            'form': form,
        })

    # Decode the user ID and organization ID
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    try:
        org_id_decoded = urlsafe_base64_decode(org_id).decode()
        org = Organization.objects.get(pk=org_id_decoded)
    except (TypeError, ValueError, OverflowError, Organization.DoesNotExist):
        org = None

    if user is not None and org is not None:
        is_valid, message = organization_token_generator.check_token(user, token, org.id, invited=True)
        if is_valid:
            if user.is_active and user.password:
                user.active_organization = org
                user.save()

                new_org_member = OrganizationMember.objects.get(user=user, organization=org)

                if new_org_member.deleted_at:
                    new_org_member.deleted_at = None
                    
                new_org_member.status = 'active'
                new_org_member.save()

                if new_org_member.role != 'owner' and user.is_owner:
                    user.is_superuser = False
                    user.save()

                group = Group.objects.get(name=new_org_member.role)
                user.groups.set([group])

                login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                return redirect(reverse('projects:project-index'))
            
            if request.method == 'POST':
                form = forms.SetPasswordForm(user, request.POST)
                if form.is_valid():
                    form.save()
                    user.is_active = True
                    user.save()

                    new_org_member = OrganizationMember.objects.get(user=user, organization=org)
                    new_org_member.status = 'active'
                    new_org_member.save()
                    messages.success(request, "Your account has been activated successfully! You can now log in using your new password.")
                    return redirect('user-login')
                else:
                    for field, errors in form.errors.items():
                        for error in errors:
                            messages.error(request, f"{error}")

            else:
                form = forms.SetPasswordForm(user)
        else:
            if message == "Account already activated":
                messages.success(request, "Your account is already activated. You can log in using your existing credentials.")
            else:
                messages.error(request, "The invitation link is invalid or has expired. Please request a new link")
            is_invalid = True
    else:
        messages.error(request, "The invitation link is invalid or has expired. Please request a new link")
        is_invalid = True

    return render(request, 'users/user_activate.html', {
        'token_invalid': is_invalid,
        'form': form,
    })
    
class ForgetPasswordView(PasswordResetView):

    form_class = forms.PasswordResetForm
    from_email = settings.EMAIL_HOST_USER
    html_email_template_name = 'users/forgot_password/reset_password_email_template.html'
    template_name = 'users/forgot_password/user_forgot_password.html'
    success_url = reverse_lazy('user-login')
    subject_template_name = 'users/forgot_password/mail_subject.txt'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context['hide_toggler'] = True
        return context
    
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, 'A password reset link has been sent to your email.')
        return response
    def form_invalid(self, form):
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(self.request, f"{error}")
        response = super().form_invalid(form)
        return response

class NewPasswordView(PasswordResetConfirmView):

    template_name = 'users/forgot_password/reset_password.html'
    success_url = reverse_lazy('user-login')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        if self.request.user.is_authenticated:
            auth.logout(self.request)
        if not self.validlink:
            messages.error(self.request, "The password reset link is invalid or expired. Please request a new one.")
            context['token_invalid'] = True

        context['hide_toggler'] = True
        return context
    
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, 'Your password has been successfully changed. You can now log in with your new password.')
        return response
    
    def form_invalid(self, form):
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(self.request, f"{error}")
        response = super().form_invalid(form)
        return response
    

@enforce_csrf_checks
def user_signup_activate(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    org_id = request.GET.get('org', None)

    try:
        org_id_decoded = urlsafe_base64_decode(org_id).decode()
        org = Organization.objects.get(pk=org_id_decoded)
    except (TypeError, ValueError, OverflowError, Organization.DoesNotExist):
        org = None


    if user is not None and org is not None:
        if request.user.is_authenticated:
            if request.user != user:
                auth.logout(request)

        is_valid, message = organization_token_generator.check_token(user, token, org.id)
        if is_valid and not user.is_active:
            user.is_active = True
            user.save()
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        else:
            messages.error(request, "Account activation failed due to invalid token.")
    return redirect(reverse('projects:project-index'))