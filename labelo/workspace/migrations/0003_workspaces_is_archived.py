# Generated by Django 3.2.25 on 2024-06-18 06:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0002_workspaces_organization'),
    ]

    operations = [
        migrations.AddField(
            model_name='workspaces',
            name='is_archived',
            field=models.BooleanField(default=False),
        ),
    ]
