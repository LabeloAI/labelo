# Generated by Django 3.2.25 on 2024-05-31 06:16

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('organizations', '0008_auto_20240529_0547'),
    ]

    operations = [
        migrations.AlterField(
            model_name='organization',
            name='created_by',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='organization', to=settings.AUTH_USER_MODEL, verbose_name='created_by'),
        ),
    ]