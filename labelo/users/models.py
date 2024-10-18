"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import datetime
from typing import Optional

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin, Group
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from rest_framework.authtoken.models import Token

from core.feature_flags import flag_set
from core.utils.common import load_func
from core.utils.db import fast_first

from organizations.models import Organization, OrganizationMember

from users.functions import hash_upload


YEAR_START = 1980
YEAR_CHOICES = []
for r in range(YEAR_START, (datetime.datetime.now().year + 1)):
    YEAR_CHOICES.append((r, r))

year = models.IntegerField(_('year'), choices=YEAR_CHOICES, default=datetime.datetime.now().year)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """
        Create and save a user with the given email and password.
        """
        if not email:
            raise ValueError('Must specify an email address')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)


class UserLastActivityMixin(models.Model):
    last_activity = models.DateTimeField(_('last activity'), default=timezone.now, editable=False)

    def update_last_activity(self):
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])

    class Meta:
        abstract = True


UserMixin = load_func(settings.USER_MIXIN)


class User(UserMixin, AbstractBaseUser, PermissionsMixin, UserLastActivityMixin):
    """
    An abstract base class implementing a fully featured User model with
    admin-compliant permissions.

    Username and password are required. Other fields are optional.
    """

    username = models.CharField(_('username'), max_length=256)
    email = models.EmailField(_('email address'), unique=True, blank=True)

    first_name = models.CharField(_('first name'), max_length=256, blank=True)
    last_name = models.CharField(_('last name'), max_length=256, blank=True)
    phone = models.CharField(_('phone'), max_length=256, blank=True)
    avatar = models.ImageField(upload_to=hash_upload, blank=True)

    is_staff = models.BooleanField(
        _('staff status'), default=False, help_text=_('Designates whether the user can log into this admin site.')
    )

    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_('Designates whether to treat this user as active. Unselect this instead of deleting accounts.'),
    )

    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    activity_at = models.DateTimeField(_('last annotation activity'), auto_now=True)

    active_organization = models.ForeignKey(
        'organizations.Organization', null=True, on_delete=models.SET_NULL, related_name='active_users'
    )

    allow_newsletters = models.BooleanField(
        _('allow newsletters'), null=True, default=None, help_text=_('Allow sending newsletters to user')
    )
    groups = models.ManyToManyField(Group, related_name='users', blank=True)

    is_owner = models.BooleanField(_('is owner'), default= False)

    objects = UserManager()

    EMAIL_FIELD = 'email'
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ()

    class Meta:
        db_table = 'htx_user'
        verbose_name = _('user')
        verbose_name_plural = _('users')
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
            models.Index(fields=['first_name']),
            models.Index(fields=['last_name']),
            models.Index(fields=['date_joined']),
        ]

    @property
    def avatar_url(self):
        if self.avatar:
            if settings.CLOUD_FILE_STORAGE_ENABLED:
                return self.avatar.url
            else:
                return settings.HOSTNAME + self.avatar.url

    def is_organization_admin(self, org_pk):
        return True

    def active_organization_annotations(self):
        return self.annotations.filter(project__organization=self.active_organization)

    def active_organization_contributed_project_number(self):
        annotations = self.active_organization_annotations()
        return annotations.values_list('project').distinct().count()

    @property
    def own_organization(self) -> Optional[Organization]:
        return fast_first(Organization.objects.filter(created_by=self))

    @property
    def has_organization(self):
        return Organization.objects.filter(created_by=self).exists()

    def clean(self):
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email)

    def name_or_email(self):
        name = self.get_full_name()
        if len(name) == 0:
            name = self.email

        return name

    def get_full_name(self):
        """
        Return the first_name and the last_name for a given user with a space in between.
        """
        full_name = '%s %s' % (self.first_name, self.last_name)
        return full_name.strip()

    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name

    def reset_token(self) -> Token:
        Token.objects.filter(user=self).delete()
        return Token.objects.create(user=self)

    def get_initials(self, is_deleted=False):
        initials = '?'

        if flag_set('fflag_feat_all_optic_114_soft_delete_for_churned_employees', user=self) and is_deleted:
            return 'DU'

        if not self.first_name and not self.last_name:
            initials = self.email[0:2]
        elif self.first_name and not self.last_name:
            initials = self.first_name[0:1]
        elif self.last_name and not self.first_name:
            initials = self.last_name[0:1]
        elif self.first_name and self.last_name:
            initials = self.first_name[0:1] + self.last_name[0:1]
        return initials

    def save(self, *args, **kwargs):

        if self.pk:
            old_active_org = User.objects.get(pk=self.pk).active_organization
        else:
            old_active_org = None

        try:
            first_org = Organization.objects.get(pk=1)
        except:
            first_org = None

        super(User, self).save(*args, **kwargs)

        if old_active_org != self.active_organization:
            if self.active_organization:
                if not self.organizations.filter(pk=self.active_organization.pk).exists():

                    org = self.organizations.filter(
                        organizationmember__deleted_at__isnull=True
                    ).first()
                    if org:
                        self.active_organization = org
                    else:
                        self.active_organization = first_org
                    self.save(update_fields=['active_organization'])

            else:
                # self.active_organization = first_org
                no_org = Group.objects.get(name='no_org')
                self.groups.set([no_org])
                self.save()

            try:
                org_member = OrganizationMember.objects.get(user=self.pk, organization=self.active_organization, deleted_at__isnull=True)
            except:
                org_member = None

            if org_member:

                group = Group.objects.get(name=org_member.role)
                self.groups.set([group])
                        
                if org_member.role == 'owner' and self.is_owner:
                    self.is_superuser = True
                else:
                    self.is_superuser = False

                self.save(update_fields=['is_superuser'])

                org_member.status = "active"
                org_member.save(update_fields=['status'])

                try:
                    old_org_member = OrganizationMember.objects.get(user=self.pk, organization=old_active_org)
                except:
                    old_org_member = None
                
                if old_org_member:
                    old_org_member.status = "in_active"
                    old_org_member.save(update_fields=['status'])



@receiver(post_save, sender=User)
def init_user(sender, instance=None, created=False, **kwargs):
    if created:
        # create token for user
        Token.objects.create(user=instance)
