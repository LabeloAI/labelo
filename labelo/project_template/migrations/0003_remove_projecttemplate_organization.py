# Generated by Django 3.2.25 on 2024-06-19 07:15

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('project_template', '0002_projecttemplate_organization'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='projecttemplate',
            name='organization',
        ),
    ]