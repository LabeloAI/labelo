"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django import forms
from django.conf import settings
from django.contrib import auth
from django.contrib.auth.forms import SetPasswordForm, PasswordResetForm
from django.utils.translation import gettext_lazy as _

from organizations.models import Organization
from users.models import User


EMAIL_MAX_LENGTH = 256
PASS_MAX_LENGTH = 64
PASS_MIN_LENGTH = 8
USERNAME_MAX_LENGTH = 30
DISPLAY_NAME_LENGTH = 100
USERNAME_LENGTH_ERR = 'Please enter a username 30 characters or fewer in length'
DISPLAY_NAME_LENGTH_ERR = 'Please enter a display name 100 characters or fewer in length'
PASS_LENGTH_ERR = 'Please enter a password 8-12 characters in length'
INVALID_USER_ERROR = "Invalid email or password."
PENDING_USER_ERROR = "Your account is not activated in this organization yet, contact with your organization administrator"
ORGANIZATION_MAX_LENGTH = 30
ORGANIZATION_LENGTH_ERR = 'Please enter a Organization name 30 characters or fewer in length'

logger = logging.getLogger(__name__)


class LoginForm(forms.Form):
    """For logging in to the app and all - session based"""

    # use username instead of email when LDAP enabled
    email = forms.CharField(label='User') if settings.USE_USERNAME_FOR_LOGIN else forms.EmailField(label='Email')
    password = forms.CharField(widget=forms.PasswordInput())
    persist_session = forms.BooleanField(widget=forms.CheckboxInput(), required=False)

    def clean(self, *args, **kwargs):
        cleaned = super(LoginForm, self).clean()
        email = cleaned.get('email', '').lower()
        password = cleaned.get('password', '')
        if len(email) >= EMAIL_MAX_LENGTH:
            raise forms.ValidationError('Email is too long')

        # advanced way for user auth
        user = settings.USER_AUTH(User, email, password)

        # regular access
        if user is None:
            user = auth.authenticate(email=email, password=password)

        # pending_group = Group.objects.get(name='pending')

        if user and user.is_active:

            """A new condition is added to check if the user is in a pending state, 
            and if they are in the pending state, an error message is displayed."""

            # if user.groups.filter(name='pending').exists():
            #     raise forms.ValidationError(PENDING_USER_ERROR)

            persist_session = cleaned.get('persist_session', False)
            return {'user': user, 'persist_session': persist_session}
        else:
            raise forms.ValidationError(INVALID_USER_ERROR)


class UserSignupForm(forms.Form):
    email = forms.EmailField(label='Work Email', error_messages={'required': 'Invalid email'})
    password = forms.CharField(
        max_length=PASS_MAX_LENGTH,
        error_messages={'required': PASS_LENGTH_ERR},
        widget=forms.TextInput(attrs={'type': 'password'}),
    )
    allow_newsletters = forms.BooleanField(required=False)

    def clean_password(self):
        password = self.cleaned_data['password']
        if len(password) < PASS_MIN_LENGTH:
            raise forms.ValidationError(PASS_LENGTH_ERR)
        return password

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username.lower()).exists():
            raise forms.ValidationError('User with username already exists')
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email').lower()
        if len(email) >= EMAIL_MAX_LENGTH:
            raise forms.ValidationError('Email is too long')

        if email and User.objects.filter(email=email).exists():
            raise forms.ValidationError('User with this email already exists')

        return email

    def save(self):
        cleaned = self.cleaned_data
        password = cleaned['password']
        email = cleaned['email'].lower()
        allow_newsletters = None
        if 'allow_newsletters' in cleaned:
            allow_newsletters = cleaned['allow_newsletters']
        user = User.objects.create_user(email, password, allow_newsletters=allow_newsletters)
        return user

class UserProfileForm(forms.ModelForm):
    """This form is used in profile account pages"""

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone', 'allow_newsletters')

class UserCreateForm(forms.Form):


    """This form is used for User creation and validation"""

    name = forms.CharField(max_length=USERNAME_MAX_LENGTH)
    organization_name = forms.CharField(max_length=ORGANIZATION_MAX_LENGTH)
    email = forms.EmailField(label='Work Email')
    password = forms.CharField(
        max_length=PASS_MAX_LENGTH,
        error_messages={'required': PASS_LENGTH_ERR},
        widget=forms.TextInput(attrs={'type': 'password'}),
    )
    re_password = forms.CharField(
        max_length=PASS_MAX_LENGTH,
        error_messages={'required': PASS_LENGTH_ERR},
        widget=forms.TextInput(attrs={'type': 'password'}),
    )

    def clean_name(self):
        name = self.cleaned_data.get('name')
        if len(name) > USERNAME_MAX_LENGTH:
            raise forms.ValidationError(USERNAME_LENGTH_ERR)
        return name

    def clean_organization_name(self):
        organization_name = self.cleaned_data.get('organization_name')
        if len(organization_name) > ORGANIZATION_MAX_LENGTH:
            raise forms.ValidationError(ORGANIZATION_LENGTH_ERR)
        return organization_name

    def clean_email(self):
        email = self.cleaned_data.get('email').lower()
        # if len(email) >= EMAIL_MAX_LENGTH:
        #     raise forms.ValidationError('Email is too long')

        if email and User.objects.filter(email=email).exists():
            raise forms.ValidationError('User with this email already exists')

        return email

    def clean_password(self):
        password = self.cleaned_data.get('password')
        if password and not (PASS_MIN_LENGTH <= len(password) <= PASS_MAX_LENGTH):
            raise forms.ValidationError(PASS_LENGTH_ERR)
        return password


    def clean_re_password(self):
        password = self.cleaned_data.get('password')
        re_password = self.cleaned_data.get('re_password')

        if re_password != password:
            raise forms.ValidationError('Passwords dont match')
        return re_password

    def save(self):
        cleaned = self.cleaned_data
        password = cleaned['password']
        email = cleaned['email'].lower()
        user = User.objects.create_user(email, password)
        return user


class SetPasswordForm(SetPasswordForm):
    """
    A form that lets a user change set their password without entering the old
    password
    """
    pass

class PasswordResetForm(PasswordResetForm):

    def clean_email(self):
        email = self.cleaned_data.get('email')
        user = User.objects.filter(email=email).first()

        if not user:
            raise forms.ValidationError(_("No user is associated with this email address."))
        
        if not user.password or not user.is_active:
            raise forms.ValidationError(_("User account is not activated."))

        return email
